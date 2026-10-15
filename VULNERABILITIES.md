# Security Vulnerability Assessment Report - Frontend UI & NGINX Reverse Proxy

- **Target Component:** Frontend Web UI & NGINX Reverse Proxy (`http://frontend:80`)
- **Scan Tool:** ProjectDiscovery Nuclei v3.11.1 (Templates v10.5.0)
- **Scan Date:** 2026-10-15
- **Assessment Scope:** Dynamic Application Security Testing (DAST); 11,102 templates loaded.

---

## Summary of Identified Findings

Nuclei reported 12 findings, all with **Info** severity. These are informational detections and hardening gaps, not evidence of 12 exploitable vulnerabilities.

| Severity | Count | Status |
|:---|:---:|:---|
| **Critical** | 0 | None detected |
| **High** | 0 | None detected |
| **Medium** | 0 | None detected |
| **Low / Info** | 12 | 5 Block-1 headers no longer detected; 5 other missing headers and 7 informational findings remain |

---

## Detailed Findings

### 1. Missing HTTP Security Headers

The scan still reports these five headers as missing:

- **`http-missing-security-headers:strict-transport-security` (HSTS)**
  - **Status:** Pending HTTPS deployment. The frontend is served over HTTP, so HSTS is not enabled.
- **`http-missing-security-headers:cross-origin-resource-policy` (CORP)**
- **`http-missing-security-headers:cross-origin-embedder-policy` (COEP)**
- **`http-missing-security-headers:cross-origin-opener-policy` (COOP)**
- **`http-missing-security-headers:x-permitted-cross-domain-policies`**

The following headers added in Block 1 are no longer reported by this scan:
`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

### 2. Version Disclosure and Technology Detection

- **`nginx-version` / `nginx-eol:version`**
  - **Finding:** The response identifies NGINX as version `1.25.5`.
  - **Risk:** Version disclosure can help identify potentially relevant vulnerabilities. Review and update the base image; hiding the banner alone does not patch an outdated server.
- **`tech-detect:nginx`**, **`tech-detect:google-font-api`**, **`waf-detect:nginxgeneric`**, **`form-detection`**
  - **Finding:** Informational technology and application fingerprinting.

### 3. External Stylesheet Without SRI

- **`missing-sri`**
  - **Finding:** The Google Fonts stylesheet is loaded without an `integrity` attribute.
  - **Remediation:** Consider hosting the fonts locally. SRI is generally not practical for a stylesheet whose CDN content may change.

---

## Scan Notes

Nuclei also probed ports `5814` and `4040`, which refused connections. These are closed ports, not findings against the frontend's configured HTTP port `80`.

## Remediation Plan

1. **Block 1 (LDAP API):** Disable public API docs, add LDAP response security headers, and hide the Uvicorn banner. This addresses 13 of the 35 findings in the 2026-10-15 baseline; LDAP HSTS remains pending HTTPS.
2. **Block 2 (backend API):** Add the missing API headers and reduce Express fingerprinting.
3. **Block 3 (frontend and transport):** Review remaining cross-origin headers, update the NGINX image, remove the external font/SRI finding, and configure HTTPS before enabling HSTS.
