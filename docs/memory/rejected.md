# Rejected Approaches & Trade-Offs

## Rejected Alternatives
*This file records explicitly evaluated and discarded architectural choices to prevent future AI agents from re-proposing rejected approaches.*

### Example Entry
- **Approach**: Heavy Native Vector Database (e.g. native C++ bindings for local vector store)
- **Reason Rejected**: Introduces platform-specific compilation errors and heavy installation dependencies on client machines. Chosen alternative: pure JS `minisearch` with zero native dependencies.
