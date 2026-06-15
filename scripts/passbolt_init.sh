#!/usr/bin/env bash
# Runs inside passbolt_init container (passbolt/passbolt:latest-ce image).
# Registers the service-account admin user and completes GPG setup fully
# automatically. Idempotent: exits 0 immediately if the user already exists.
#
# Required env vars (same .env the rest of the stack uses):
#   APP_FULL_BASE_URL              — public URL of the Passbolt web service
#   DATASOURCES_DEFAULT_HOST/USERNAME/PASSWORD/DATABASE — MariaDB connection
#   PASSBOLT_ADMIN_EMAIL           — service-account email
#   PASSBOLT_ADMIN_FIRST_NAME      — (default: Admin)
#   PASSBOLT_ADMIN_LAST_NAME       — (default: User)
#   PASSBOLT_GPG_PUBLIC_KEY        — base64-encoded armored public key

set -euo pipefail

CAKE="/usr/share/php/passbolt/bin/cake"
CONF="/usr/share/php/passbolt/config/passbolt.php"
BASE_URL="${APP_FULL_BASE_URL}"
ADMIN_EMAIL="${PASSBOLT_ADMIN_EMAIL}"
ADMIN_FIRST="${PASSBOLT_ADMIN_FIRST_NAME:-Admin}"
ADMIN_LAST="${PASSBOLT_ADMIN_LAST_NAME:-User}"

log() { echo "[passbolt-init] $*"; }

log "Writing cake config..."
mkdir -p /etc/passbolt
if [ ! -e /usr/share/php/passbolt/config ] && [ ! -L /usr/share/php/passbolt/config ]; then
    ln -s /etc/passbolt /usr/share/php/passbolt/config
fi

php << 'PHP'
<?php
$cfg = [
    'App' => ['fullBaseUrl' => getenv('APP_FULL_BASE_URL')],
    'Datasources' => [
        'default' => [
            'className'  => 'Cake\Database\Connection',
            'driver'     => 'Cake\Database\Driver\Mysql',
            'persistent' => false,
            'host'       => getenv('DATASOURCES_DEFAULT_HOST'),
            'port'       => '3306',
            'username'   => getenv('DATASOURCES_DEFAULT_USERNAME'),
            'password'   => getenv('DATASOURCES_DEFAULT_PASSWORD'),
            'database'   => getenv('DATASOURCES_DEFAULT_DATABASE'),
            'encoding'   => 'utf8mb4',
            'timezone'   => 'UTC',
        ],
    ],
];
file_put_contents(
    '/usr/share/php/passbolt/config/passbolt.php',
    '<?php' . PHP_EOL . 'return ' . var_export($cfg, true) . ';' . PHP_EOL
);
PHP
chown root:www-data "${CONF}"
chmod 640 "${CONF}"

log "Waiting for Passbolt at ${BASE_URL}..."
until curl -sf "${BASE_URL}/auth/verify.json" > /dev/null 2>&1; do
  sleep 3
done
log "Passbolt is responding."

EXISTING=$(php -r "
  \$pdo = new PDO(
    'mysql:host='.getenv('DATASOURCES_DEFAULT_HOST').';dbname='.getenv('DATASOURCES_DEFAULT_DATABASE'),
    getenv('DATASOURCES_DEFAULT_USERNAME'),
    getenv('DATASOURCES_DEFAULT_PASSWORD')
  );
  \$s = \$pdo->prepare('SELECT COUNT(*) FROM users WHERE username = ?');
  \$s->execute([getenv('PASSBOLT_ADMIN_EMAIL')]);
  echo \$s->fetchColumn();
")

if [ "${EXISTING:-0}" -gt "0" ]; then
  log "Admin user already exists — nothing to do."
  exit 0
fi

log "Registering admin user ${ADMIN_EMAIL}..."
REGISTER_OUT=$(su -m -c "${CAKE} passbolt register_user \
  -u '${ADMIN_EMAIL}' \
  -f '${ADMIN_FIRST}' \
  -l '${ADMIN_LAST}' \
  -r admin" -s /bin/bash www-data 2>&1) || true

log "${REGISTER_OUT}"

SETUP_URL=$(echo "${REGISTER_OUT}" | grep -oE 'https?://[^ ]+setup[^ ]+' | head -1)
if [ -z "${SETUP_URL}" ]; then
  log "ERROR: could not extract setup URL from cake output."
  exit 1
fi

USER_ID=$(echo "${SETUP_URL}" | sed -E 's|.*/setup/start/([^/]+)/.*|\1|')
TOKEN=$(echo "${SETUP_URL}"   | sed -E 's|.*/setup/start/[^/]+/([^/?]+).*|\1|')
log "Setup URL captured. User: ${USER_ID}"

log "Completing GPG setup..."
export USER_ID TOKEN
php << 'PHP'
<?php
$base64Key = getenv('PASSBOLT_GPG_PUBLIC_KEY');
if (!$base64Key) {
    fwrite(STDERR, "[passbolt-init] ERROR: PASSBOLT_GPG_PUBLIC_KEY is empty.\n");
    exit(1);
}

$url  = getenv('APP_FULL_BASE_URL') . '/setup/complete/' . getenv('USER_ID') . '.json';
$body = json_encode([
    'authenticationtoken' => ['token' => getenv('TOKEN')],
    'gpgkey'              => ['armored_key' => base64_decode($base64Key)],
    'user'                => ['locale' => 'en-UK'],
]);

$resp = file_get_contents($url, false, stream_context_create([
    'http' => [
        'method'        => 'POST',
        'header'        => "Content-Type: application/json\r\n",
        'content'       => $body,
        'ignore_errors' => true,
    ],
    'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
]));

$data = json_decode($resp, true);
$code = $data['header']['code'] ?? 200;

if ($code >= 400) {
    $msg = $data['header']['message'] ?? $resp;
    fwrite(STDERR, "[passbolt-init] Setup API error ({$code}): {$msg}\n");
    exit(1);
}

echo "[passbolt-init] GPG setup complete!\n";
PHP

log "Passbolt service account is ready."
