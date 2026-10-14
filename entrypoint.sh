#!/bin/bash
set -e
mkdir -p /var/log/nginx /var/run/fail2ban /etc/nginx/conf.d /shared-secrets
rm -f /var/log/nginx/access.log /var/log/nginx/error.log
touch /var/log/nginx/access.log /var/log/nginx/error.log /var/log/fail2ban.log
rm -f /var/run/fail2ban/fail2ban.sock /var/run/fail2ban/fail2ban.pid

# Generate api_key_header.conf and default.conf
export BACKEND_URL="${BACKEND_URL:-http://backend:3000}"
export LDAP_URL="${LDAP_URL:-http://ldap-api:8000}"
export API_SECRET="${API_SECRET:-initial-lab-secret-key-2026}"
SHARED_SECRET_FILE="/shared-secrets/api_secret.txt"
HEADER_CONF="/etc/nginx/conf.d/api_key_header.conf"

if [ ! -f "$SHARED_SECRET_FILE" ]; then
    echo "$API_SECRET" > "$SHARED_SECRET_FILE"
fi

KEY_VAL=$(cat "$SHARED_SECRET_FILE" 2>/dev/null | tr -d '\r\n')
if [ -z "$KEY_VAL" ]; then
    KEY_VAL="$API_SECRET"
fi
echo "proxy_set_header x-api-key \"$KEY_VAL\";" > "$HEADER_CONF"

if [ -f /etc/nginx/templates/nginx.conf.template ]; then
    envsubst '${BACKEND_URL} ${LDAP_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
fi

nginx -g 'daemon off;' &

sleep 2
fail2ban-client -x start || true

echo "[frontend-protected] NGINX + Fail2Ban running. Log follow active."
exec tail -F /var/log/fail2ban.log
