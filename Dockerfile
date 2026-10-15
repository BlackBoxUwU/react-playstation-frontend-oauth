FROM nginx:stable-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5

# Install fail2ban, iptables, iproute2, bash and utilities
RUN apk add --no-cache fail2ban bash iptables iproute2 gettext coreutils

# Remove default configuration
RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/templates/*

# Copy configuration template
COPY nginx.conf.template /etc/nginx/templates/

# Copy Fail2Ban configuration
COPY jail.local /etc/fail2ban/jail.local
COPY filter-http-flood.conf /etc/fail2ban/filter.d/http-flood.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy frontend UI assets
COPY index.html styles.css app.js /usr/share/nginx/html/

EXPOSE 80 8080

ENTRYPOINT ["/entrypoint.sh"]
