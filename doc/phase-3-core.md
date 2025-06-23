# Phase 3: Core Foundation Components

**Goal**: Build the essential utilities and infrastructure

## Tasks

### 1. Error System (src/errors.ts)
- NutrientError base class
- Specific error types (ValidationError, APIError, etc.)
- Error response parsing

### 2. Input Handler (src/inputs.ts)
- File path handling (Node.js)
- Buffer/Uint8Array support
- Blob/File support (browser)
- URL string support
- Proper type guards

### 3. HTTP Layer (src/http.ts)
- Implement sendRequest function
- Handle authentication (string | async function)
- FormData construction
- Error response handling

### 4. Utilities
- Environment detection (Node/browser)
- Type guards and validators

## Success Criteria
- [ ] Error system handles all expected error scenarios
- [ ] Input handler supports all required input types
- [ ] HTTP layer successfully makes authenticated requests
- [ ] Utilities provide robust helper functionality
- [ ] All components are properly tested
