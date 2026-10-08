# Architectural & Security Constraints

## Hard Constraints (Never Violate)
- **Zero Opaque Lock-in**: Project memory must reside in human-readable Markdown inside `docs/memory/`.
- **Token Budget Discipline**: Injected context payloads must strictly adhere to token allocations.
- **Pure JavaScript / Zero Native C++**: CLI dependencies must run across Node.js without native build toolchains.

## Soft Guidelines (Best Practices)
- Prefer explicit architectural decision records (ADRs) before implementing major refactors.
- Keep source code files linked to corresponding decision records in frontmatter (`linked_files`).
