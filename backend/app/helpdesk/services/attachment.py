import uuid
from datetime import datetime, timedelta
from urllib.parse import quote, unquote

from django.conf import settings


def _oci_client():
    from config.storage import _make_client

    return _make_client()


def _object_key(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"ticket_attachments/{uuid.uuid4()}.{ext}"


def _public_url(object_key: str) -> str:
    region = getattr(settings, "OCI_REGION", "")
    namespace = getattr(settings, "OCI_NAMESPACE", "")
    bucket = getattr(settings, "OCI_BUCKET_NAME", "")
    custom_domain = getattr(settings, "OCI_CUSTOM_DOMAIN", "")
    encoded = quote(object_key, safe="/")
    if custom_domain:
        return f"https://{custom_domain}/{encoded}"
    return f"https://objectstorage.{region}.oraclecloud.com/n/{namespace}/b/{bucket}/o/{encoded}"


def presign_upload(filename: str, expires_seconds: int = 3600) -> dict:
    """
    Creates an OCI PAR (ObjectWrite) for direct browser-to-OCI upload.
    Returns upload_url (PUT target) and file_url (public read URL after upload).
    """
    import oci

    region = getattr(settings, "OCI_REGION", "")
    namespace = getattr(settings, "OCI_NAMESPACE", "")
    bucket = getattr(settings, "OCI_BUCKET_NAME", "")

    object_key = _object_key(filename)
    expiry = datetime.utcnow() + timedelta(seconds=expires_seconds)

    par_details = oci.object_storage.models.CreatePreauthenticatedRequestDetails(
        name=f"upload-{uuid.uuid4()}",
        object_name=object_key,
        access_type="ObjectWrite",
        time_expires=expiry,
        bucket_listing_action=None,
    )
    response = _oci_client().create_preauthenticated_request(
        namespace_name=namespace,
        bucket_name=bucket,
        create_preauthenticated_request_details=par_details,
    )

    upload_url = f"https://objectstorage.{region}.oraclecloud.com{response.data.access_uri}"
    return {"upload_url": upload_url, "file_url": _public_url(object_key)}


def delete_by_url(file_url: str) -> None:
    """Deletes the OCI object identified by its public URL. Silently ignores errors."""
    region = getattr(settings, "OCI_REGION", "")
    namespace = getattr(settings, "OCI_NAMESPACE", "")
    bucket = getattr(settings, "OCI_BUCKET_NAME", "")
    custom_domain = getattr(settings, "OCI_CUSTOM_DOMAIN", "")

    if custom_domain:
        prefix = f"https://{custom_domain}/"
    else:
        prefix = f"https://objectstorage.{region}.oraclecloud.com/n/{namespace}/b/{bucket}/o/"

    if not file_url.startswith(prefix):
        return

    object_key = unquote(file_url[len(prefix) :])

    try:
        import oci

        _oci_client().delete_object(
            namespace_name=namespace,
            bucket_name=bucket,
            object_name=object_key,
        )
    except Exception:
        pass
