FROM nginx:1.25-alpine

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
