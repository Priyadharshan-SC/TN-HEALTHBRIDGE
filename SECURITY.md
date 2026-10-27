# Security Policy

## Scope and Research Prototype Notice

**TN HealthBridge** is an academic and research prototype exploring uncertainty-aware healthcare data exchange aligned with Ayushman Bharat Digital Mission (ABDM) standards.

- **Synthetic Data Only**: This prototype is strictly designed and tested with synthetic data. It must never be connected to real clinical databases, live hospital information systems, or production ABDM networks without comprehensive enterprise security engineering.
- **No Production Secrets**: Do not commit secrets, private keys, or credentials to this repository. All environment configuration relies on `.env.example`.

## Supported Versions

Only the current main branch receives security evaluations and bug fixes:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive data handling flaw in this repository:

1. **Do not create a public GitHub issue** describing the exploit or vulnerability.
2. Please utilize GitHub's **Private Vulnerability Reporting** feature via the **Security** tab of the GitHub repository (if enabled by the repository owner).
3. If private reporting is not available, open a confidential issue requesting a private security communication channel with maintainers, without disclosing technical reproduction steps in the public issue text.

### What to Include in a Report

- Description of the vulnerability and its potential impact.
- Affected module(s) (e.g., M1 Ingestion, M2 Normalization, M3 Terminology, M4 Identity Safety).
- Reproduction steps or minimal synthetic payload demonstrating the issue.
- Any suggested remediations or mitigations.

### Response Process

Maintainers will acknowledge receipt of reports within a reasonable academic review window, investigate the finding using synthetic test cases, and coordinate a fix or disclosure timeline.
