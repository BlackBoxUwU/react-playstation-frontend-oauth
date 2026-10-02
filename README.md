# Frontend Web UI & NGINX Reverse Proxy

A modern web application featuring:
- **Enterprise LDAP Login Landing Page**: Authenticates users against OpenLDAP via the FastAPI microservice.
- **Security Dashboard**: Live verification of dynamic `x-api-key` hot secret rotation across 3 microservices and AES-256 database operations.
- **NGINX Reverse Proxy**: Injects the active `x-api-key` header server-side for backend (`/api/`) and LDAP (`/ldap/`) requests. Uses a background watcher for zero-downtime NGINX reloading (`nginx -s reload`) when secrets rotate.

## Ports
- **Host Port**: `8080` (Internal port `80`)

## Running Locally with Docker
```bash
docker build -t security-frontend-nginx .
docker run -p 8080:80 -v shared_secrets:/shared-secrets security-frontend-nginx
```
