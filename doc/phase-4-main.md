# Phase 4: Main Components Implementation

**Goal**: Build the user-facing API components

## Tasks

### 1. NutrientClient (src/client.ts)
- Constructor with options validation
- Authentication handling
- Direct API method implementations
- workflow() method to expose complicated document workflows

### 2. WorkflowBuilder (src/workflow.ts)
- Fluent API design
- Step management
- Input/output handling
- execute() implementation (using the `/build` API from DWS API)
  - Use multipart build instructions to build up parts and actions
  - Define output format and options
- Proper method chaining

### 3. Integration
- Connect all components
- Ensure proper typing flow
- Add JSDoc documentation

## Success Criteria
- [ ] NutrientClient provides intuitive API surface
- [ ] WorkflowBuilder enables fluent workflow construction
- [ ] All components integrate seamlessly
- [ ] TypeScript types flow correctly throughout
- [ ] JSDoc documentation is comprehensive
