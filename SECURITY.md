# Security Policy

## Supported Versions

Security fixes target the current release line of SSHBridge Mobile. At the time
of writing, that is `0.2`.

## Reporting a Vulnerability

Please report vulnerabilities through
[GitHub Security Advisories](https://github.com/nghoang1288/SSHBridge-Mobile/security/advisories).

Do not open a public issue for credential leaks, authentication bypasses,
private key exposure, host key verification bypasses, or remote code execution.

When reporting, include:

- App version and platform
- Whether the issue affects online mode, offline mode, or both
- Steps to reproduce
- Expected impact
- Any logs with secrets removed

## Security Notes

- JWTs and offline SSH secrets should be stored with platform secure storage.
- Private keys, server passwords, and API tokens must never be committed.
- Prefer HTTPS for SSHBridge server URLs; use HTTP only on trusted local
  networks.
- Changed SSH host keys should be treated as suspicious until verified.
