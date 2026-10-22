# Rejected Approaches & Trade-Offs

## Rejected Alternatives
*This file records explicitly evaluated and discarded architectural choices to prevent future AI agents from re-proposing rejected approaches.*

### Example Entry
- **Approach**: Heavy Native Vector Database (e.g. native C++ bindings for local vector store)
- **Reason Rejected**: Introduces platform-specific compilation errors and heavy installation dependencies on client machines. Chosen alternative: pure JS `minisearch` with zero native dependencies.

### Multiverse Theater Graphics & Animation
- **Approach**: Phaser / PixiJS and sprite-sheet PNG pipelines
- **Reason Rejected**: Rejected for excessive bundle size, asset licensing risk, and violation of the project's zero-asset procedural principle. Chosen alternative: pure HTML5 Canvas 2D procedural rendering (`src/lib/theater/renderer.ts`) with mathematical vector drawing.

