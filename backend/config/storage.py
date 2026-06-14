import mimetypes
import os
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import quote

import oci
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


def _build_oci_signer_and_config():
    if getattr(settings, "OCI_USE_INSTANCE_PRINCIPAL", False):
        signer = oci.auth.signers.InstancePrincipalsSecurityProvider()
        return {}, signer

    config_file = getattr(settings, "OCI_CONFIG_FILE", "")
    if config_file:
        profile = getattr(settings, "OCI_CONFIG_PROFILE", "DEFAULT")
        return oci.config.from_file(config_file, profile), None

    cfg = {
        "user": getattr(settings, "OCI_USER_OCID", ""),
        "fingerprint": getattr(settings, "OCI_FINGERPRINT", ""),
        "tenancy": getattr(settings, "OCI_TENANCY_OCID", ""),
        "region": getattr(settings, "OCI_REGION", ""),
    }

    key_file = getattr(settings, "OCI_KEY_FILE", "")
    key_content = getattr(settings, "OCI_KEY_CONTENT", "")
    if key_file:
        cfg["key_file"] = key_file
    elif key_content:
        cfg["key_content"] = key_content

    passphrase = getattr(settings, "OCI_KEY_PASSPHRASE", None)
    if passphrase:
        cfg["pass_phrase"] = passphrase

    return cfg, None


def _make_client():
    cfg, signer = _build_oci_signer_and_config()
    if signer is not None:
        return oci.object_storage.ObjectStorageClient({}, signer=signer)
    return oci.object_storage.ObjectStorageClient(cfg)


@deconstructible
class OCIObjectStorage(Storage):

    def __init__(self, location="", querystring_auth=False, par_expire_seconds=3600, **kwargs):
        self.location = location
        self.querystring_auth = querystring_auth
        self.par_expire_seconds = par_expire_seconds
        self.namespace = getattr(settings, "OCI_NAMESPACE", "")
        self.bucket_name = getattr(settings, "OCI_BUCKET_NAME", "")
        self.region = getattr(settings, "OCI_REGION", "")
        self.custom_domain = getattr(settings, "OCI_CUSTOM_DOMAIN", "")
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = _make_client()
        return self._client

    def _get_key(self, name):
        if self.location:
            return f"{self.location}/{name}".replace("//", "/")
        return name

    def _save(self, name, content):
        key = self._get_key(name)

        if hasattr(content, "seek"):
            try:
                content.seek(0, os.SEEK_SET)
            except (OSError, IOError):
                pass

        body = content.read()
        if isinstance(body, memoryview):
            body = bytes(body)

        content_type = mimetypes.guess_type(name)[0] or "application/octet-stream"

        kwargs = {
            "namespace_name": self.namespace,
            "bucket_name": self.bucket_name,
            "object_name": key,
            "put_object_body": body,
            "content_type": content_type,
        }

        cache_control = getattr(settings, "OCI_OBJECT_PARAMETERS", {}).get("CacheControl")
        if cache_control:
            kwargs["cache_control"] = cache_control

        self.client.put_object(**kwargs)
        return name

    def _open(self, name, mode="rb"):
        key = self._get_key(name)
        response = self.client.get_object(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            object_name=key,
        )
        f = ContentFile(response.data.content)
        f.name = name
        return f

    def delete(self, name):
        key = self._get_key(name)
        try:
            self.client.delete_object(
                namespace_name=self.namespace,
                bucket_name=self.bucket_name,
                object_name=key,
            )
        except oci.exceptions.ServiceError:
            pass

    def exists(self, name):
        key = self._get_key(name)
        try:
            self.client.head_object(
                namespace_name=self.namespace,
                bucket_name=self.bucket_name,
                object_name=key,
            )
            return True
        except oci.exceptions.ServiceError:
            return False

    def size(self, name):
        key = self._get_key(name)
        response = self.client.head_object(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            object_name=key,
        )
        return int(response.headers.get("content-length", 0))

    def url(self, name):
        key = self._get_key(name)
        encoded_key = quote(key, safe="/")

        if self.custom_domain:
            return f"https://{self.custom_domain}/{encoded_key}"

        if self.querystring_auth:
            return self._get_par_url(key)

        return f"https://objectstorage.{self.region}.oraclecloud.com" f"/n/{self.namespace}/b/{self.bucket_name}/o/{encoded_key}"

    def listdir(self, path=""):
        prefix = self._get_key(path)
        if prefix and not prefix.endswith("/"):
            prefix += "/"

        response = self.client.list_objects(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            prefix=prefix,
            delimiter="/",
        )

        dirs, files = [], []

        if response.data.prefixes:
            for p in response.data.prefixes:
                dirs.append(p.rstrip("/").split("/")[-1])

        if response.data.objects:
            for obj in response.data.objects:
                if obj.name != prefix:
                    files.append(obj.name.split("/")[-1])

        return dirs, files

    def get_modified_time(self, name):
        key = self._get_key(name)
        response = self.client.head_object(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            object_name=key,
        )
        last_modified = response.headers.get("last-modified", "")
        if last_modified:
            return parsedate_to_datetime(last_modified)
        return datetime.now()

    def _get_par_url(self, key):
        expiry = datetime.utcnow() + timedelta(seconds=self.par_expire_seconds)

        par_details = oci.object_storage.models.CreatePreauthenticatedRequestDetails(
            name=f"par-{key}-{datetime.utcnow().isoformat()}",
            object_name=key,
            access_type="ObjectRead",
            time_expires=expiry,
            bucket_listing_action=None,
        )

        response = self.client.create_preauthenticated_request(
            namespace_name=self.namespace,
            bucket_name=self.bucket_name,
            create_preauthenticated_request_details=par_details,
        )

        return f"https://objectstorage.{self.region}.oraclecloud.com" f"{response.data.access_uri}"


class StaticOCIStorage(OCIObjectStorage):

    def __init__(self, **kwargs):
        super().__init__(location="static", querystring_auth=False, **kwargs)


class MediaOCIStorage(OCIObjectStorage):

    def __init__(self, **kwargs):
        super().__init__(location="media", querystring_auth=False, **kwargs)


class PrivateMediaOCIStorage(OCIObjectStorage):

    def __init__(self, **kwargs):
        super().__init__(location="media", querystring_auth=True, **kwargs)


class PublicMediaOCIStorage(OCIObjectStorage):

    def __init__(self, **kwargs):
        super().__init__(location="media", querystring_auth=False, **kwargs)
