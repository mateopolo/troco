# Cybersecurity Standards & Skills Integration

This workspace has the full **Anthropic Cybersecurity Skills** repository (818 production-grade skills across 34 security domains) installed at:
`security/cybersecurity-skills/`

## Key Domains for Troco:
1. **Web Application Security (OWASP Top 10)**:
   - Broken Access Control (`testing-for-broken-access-control`)
   - Cross-Site Scripting (`testing-for-xss-vulnerabilities`)
   - Security Headers (`performing-security-headers-audit`)
   - CORS Configuration (`testing-cors-misconfiguration`)
2. **Cloud & Serverless Security**:
   - Serverless Functions Hardening (`securing-serverless-functions`)
   - Cloud Storage Access (`analyzing-cloud-storage-access-patterns`)
3. **API & Authentication Security**:
   - API OWASP Top 10 (`testing-api-security-with-owasp-top-10`)
   - JWT & Token Security (`testing-jwt-token-security`)
4. **DevSecOps & SAST**:
   - Secret Scanning (`implementing-secret-scanning-with-gitleaks`)
   - Custom SAST Rules (`implementing-semgrep-for-custom-sast-rules`)

## Workflow for Security Audits:
When auditing code or addressing vulnerabilities:
1. Search `security/cybersecurity-skills/index.json` for specific threat scenarios or techniques.
2. Follow the structured `SKILL.md` execution steps for verification and hardening.
3. Validate all changes using the security test suites (`npm run test:rules`, `npm run test:functions`).
