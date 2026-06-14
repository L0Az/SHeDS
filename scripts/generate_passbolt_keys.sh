#!/usr/bin/env bash
# One-time setup helper — run this locally before first deployment.
# It generates a GPG key pair for the Passbolt service account and
# prints the env-var lines to paste into your .env file.
#
# Usage:
#   chmod +x scripts/generate_passbolt_keys.sh
#   ./scripts/generate_passbolt_keys.sh admin@your-domain.com "SHeDS Admin"

set -euo pipefail

EMAIL="${1:?Usage: $0 <email> [display-name]}"
NAME="${2:-SHeDS Passbolt Service}"

GNUPGHOME=$(mktemp -d)
export GNUPGHOME
trap 'rm -rf "${GNUPGHOME}"' EXIT

echo "Generating 4096-bit RSA key pair for <${EMAIL}>..."
gpg --batch --gen-key <<EOF
%no-protection
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: ${NAME}
Name-Email: ${EMAIL}
Expire-Date: 0
EOF

FP=$(gpg --list-secret-keys --with-colons "${EMAIL}" | awk -F: '/^fpr/{print $10; exit}')
PUB=$(gpg --armor --export "${FP}" | base64 -w0)
PRIV=$(gpg --armor --export-secret-keys "${FP}" | base64 -w0)

echo ""
echo "# ── Paste into your .env ──────────────────────────────────────────────────"
echo "PASSBOLT_ADMIN_EMAIL=${EMAIL}"
echo "PASSBOLT_ADMIN_FIRST_NAME=Admin"
echo "PASSBOLT_ADMIN_LAST_NAME=User"
echo "PASSBOLT_GPG_FINGERPRINT=${FP}"
echo "PASSBOLT_GPG_PUBLIC_KEY=${PUB}"
echo "PASSBOLT_GPG_PRIVATE_KEY=${PRIV}"
echo "PASSBOLT_GPG_PASSPHRASE="
echo "# ──────────────────────────────────────────────────────────────────────────"
echo ""
echo "Keys are base64-encoded (no line breaks). Keep PASSBOLT_GPG_PRIVATE_KEY secret."
