import base64
import json
import shutil
import tempfile
import urllib.parse

import gnupg
import requests
from django.conf import settings


class PassboltError(Exception):
    pass


class PassboltClient:
    _RESOURCE_TYPE_ID = "669f8c64-242a-59fb-92fc-81f660975fd3"

    def __init__(self):
        self.base_url = settings.PASSBOLT_BASE_URL.rstrip('/')
        self.fingerprint = settings.PASSBOLT_GPG_FINGERPRINT
        self.passphrase = settings.PASSBOLT_GPG_PASSPHRASE or None
        self.private_key_armored = base64.b64decode(settings.PASSBOLT_GPG_PRIVATE_KEY).decode()
        self.session = requests.Session()
        self.session.verify = getattr(settings, 'PASSBOLT_VERIFY_SSL', True)
        self._gpg_home = tempfile.mkdtemp()
        self._gpg = gnupg.GPG(gnupghome=self._gpg_home)
        self._gpg.import_keys(self.private_key_armored)
        self._server_fingerprint = None

    def _load_server_key(self):
        resp = self.session.get(f"{self.base_url}/auth/verify.json")
        resp.raise_for_status()
        body = resp.json()['body']
        self._server_fingerprint = body['fingerprint']
        self._gpg.import_keys(body['keydata'])

    def authenticate(self):
        self._load_server_key()

        resp = self.session.post(
            f"{self.base_url}/auth/login.json",
            json={"gpg_auth": {"keyid": self.fingerprint}},
        )
        resp.raise_for_status()

        encrypted_token = resp.headers.get('X-GPGAuth-User-Auth-Token', '')
        encrypted_token = urllib.parse.unquote_plus(encrypted_token)

        decrypted = self._gpg.decrypt(encrypted_token, passphrase=self.passphrase)
        if not decrypted.ok:
            raise PassboltError(f"GPG decryption failed: {decrypted.status}")

        resp = self.session.post(
            f"{self.base_url}/auth/login.json",
            json={"gpg_auth": {"keyid": self.fingerprint, "user_token_result": str(decrypted)}},
        )
        resp.raise_for_status()

    def _encrypt_secret(self, plaintext: str) -> str:
        encrypted = self._gpg.encrypt(
            plaintext,
            self.fingerprint,
            always_trust=True,
            sign=self.fingerprint,
            passphrase=self.passphrase,
        )
        if not encrypted.ok:
            raise PassboltError(f"Encryption failed: {encrypted.status}")
        return str(encrypted)

    def create_resource(self, name: str, password: str, username: str = '', uri: str = '', description: str = '') -> dict:
        secret = json.dumps({"password": password, "description": description})
        payload = {
            "name": name,
            "username": username,
            "uri": uri,
            "resource_type_id": self._RESOURCE_TYPE_ID,
            "secrets": [{"data": self._encrypt_secret(secret)}],
        }
        resp = self.session.post(f"{self.base_url}/resources.json", json=payload)
        resp.raise_for_status()
        return resp.json()

    def close(self):
        shutil.rmtree(self._gpg_home, ignore_errors=True)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
