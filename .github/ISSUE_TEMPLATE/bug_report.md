---
name: Bug report
about: Create a report to help reproduce and fix a verified defect
title: "[BUG]: "
labels: ["bug"]
assignees: ""
---

### Module Affected
- [ ] M1 — Data Ingestion
- [ ] M2 — Data Quality & Normalization
- [ ] M3 — Clinical Terminology Mapping
- [ ] M4 — Patient Identity Safety
- [ ] Core / Infrastructure / Documentation

### Describe the Bug
A clear and concise description of what the unexpected behavior is.

### Reproduction Steps
1. Prepare synthetic payload / file (e.g. `data/samples/...`):
2. Send request to endpoint:
3. Command or pytest run:
4. Observe error or unexpected status code.

### Expected Behavior
A clear and concise description of what you expected to happen according to the module specification.

### Actual Output / Traceback
```text
(Paste sanitized console logs or pytest failure traceback here)
```
*Note: Ensure NO real patient data, credentials, or private file paths are pasted.*

### Environment
- OS: [e.g. Windows 11, Ubuntu 22.04, macOS Sonoma]
- Python Version: [e.g. 3.11.9, 3.12.3]
- Application Version: [e.g. 0.2.0]

### Additional Context
Any relevant context regarding edge cases, schema validation, or registry fixtures.
