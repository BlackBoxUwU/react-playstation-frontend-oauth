#!/bin/sh
set -e

export BACKEND_URL="${BACKEND_URL:-http://backend:3000}"
export LDAP_URL="${LDAP_URL:-http://ldap-api:8000}"
export API_SECRET="${API_SECRET:-initial-lab-secret-key-2026}"
SHARED_SECRET_FILE="/shared-secrets/api_secret.txt"
HEADER_CONF="/etc/nginx/conf.d/api_key_header.conf"

echo "[Nginx-Entrypoint] Configuring Nginx reverse proxy..."
echo "[Nginx-Entrypoint] Target Backend: ${BACKEND_URL}"
echo "[Nginx-Entrypoint] Target LDAP Service: ${LDAP_URL}"

# Ensure shared secret directory and file exist
mkdir -p /shared-secrets
if [ ! -f "$SHARED_SECRET_FILE" ]; then
    echo "$API_SECRET" > "$SHARED_SECRET_FILE"
fi

# Function to update Nginx api key header snippet
update_nginx_key() {
    KEY_VAL=$(cat "$SHARED_SECRET_FILE" | tr -d '\r\n')
    if [ -z "$KEY_VAL" ]; then
        KEY_VAL="$API_SECRET"
    fi
    echo "proxy_set_header x-api-key \"$KEY_VAL\";" > "$HEADER_CONF"
}

# Initial header write
update_nginx_key

# Substitute template variables
envsubst '${BACKEND_URL} ${LDAP_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Background watcher to reload Nginx immediately when shared secret is rotated
(
    LAST_MD5=""
    while true; do
        sleep 2
        if [ -f "$SHARED_SECRET_FILE" ]; then
            CURRENT_MD5=$(md5sum "$SHARED_SECRET_FILE" | awk '{print $1}')
            if [ "$CURRENT_MD5" != "$LAST_MD5" ] && [ -n "$LAST_MD5" ]; then
                echo "[Nginx-Watcher] Detected API_SECRET rotation! Updating Nginx header snippet and reloading..."
                update_nginx_key
                nginx -s reload 2>/dev/null || true
            fi
            LAST_MD5="$CURRENT_MD5"
        fi
    done
) &

echo "[Nginx-Entrypoint] Starting Nginx server on port 80..."
exec "$@"
