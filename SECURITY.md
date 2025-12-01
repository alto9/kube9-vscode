# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### Do NOT:
- Open a public GitHub issue
- Discuss the vulnerability publicly
- Share details on social media or forums

### Do:
1. **Email security@alto9.com** with details
2. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Affected versions

### What to Expect:
- **Acknowledgment** within 48 hours
- **Regular updates** on progress (at least weekly)
- **Credit** in release notes (if desired)
- **Coordination** on disclosure timing

### Disclosure Timeline:
- We aim to address **critical vulnerabilities** within 7 days
- We aim to address **high severity** vulnerabilities within 30 days
- We will coordinate disclosure timing with you
- We follow **responsible disclosure** practices

## Security Best Practices

When using kube9-vscode:

### Free Tier
- **kubeconfig security**: Keep your `~/.kube/config` file secure (600 permissions)
- **Review permissions**: Only load kubeconfigs from trusted sources
- **RBAC**: Use Kubernetes RBAC to limit cluster access
- **Keep updated**: Update the extension regularly

### Pro Tier
- **Operator configuration**: API keys are managed at the operator level in your cluster
- **Operator permissions**: Review RBAC permissions for kube9-operator
- **Network security**: Operator uses HTTPS for all external communication
- **Data sanitization**: Operator sanitizes data before transmission (no secrets/credentials)

## Known Security Considerations

### kubeconfig Handling
- The extension reads your kubeconfig file locally
- **Your kubeconfig never leaves your machine**
- API keys for Pro tier are managed by the operator, not by the extension

### Kubernetes API Access
- The extension uses your kubectl credentials
- All operations respect Kubernetes RBAC
- Review ServiceAccount permissions if using service account authentication

### Webview Security
- Free tier webviews use Content Security Policy (CSP)
- Pro tier webviews load from kube9-server (HTTPS only)
- No arbitrary code execution in webviews

### Operator Security (Pro Tier)
- Operator runs with minimal RBAC permissions
- No cluster ingress required (egress-only communication)
- Data sanitization at source (operator level)
- No secrets or credentials collected

## Security Audit

We welcome security audits and reviews. If you're planning a security audit:

1. Email security@alto9.com to coordinate
2. We can provide:
   - Architecture documentation
   - Security design documents
   - Access to test environments (if needed)

## Bug Bounty

We currently do not have a formal bug bounty program, but we greatly appreciate security research and will:

- Acknowledge security researchers in release notes
- Provide credit in security advisories
- Consider additional recognition for significant findings

## Security Updates

Security updates will be:
- Released as patch versions (e.g., 1.0.1)
- Documented in CHANGELOG.md
- Announced via GitHub releases
- Tagged with security label

## Questions?

For security-related questions (not vulnerabilities), please use:
- GitHub Discussions (public questions)
- GitHub Issues (non-sensitive questions)

For vulnerabilities, always use: **security@alto9.com**

---

**Thank you for helping keep kube9 secure!**

