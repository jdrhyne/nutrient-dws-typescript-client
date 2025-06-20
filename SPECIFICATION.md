# Technical Specification: Nutrient DWS TypeScript Client
Version: 1.1
Last Updated: June 20, 2025

## 1. Project Vision and Core Principles

### 1.1. Goal

The primary goal is to create the official, foundational TypeScript client for the Nutrient Document Web Services (DWS) API. This library will serve as the primary interface for all JavaScript/TypeScript-based interactions with the Nutrient API.

### 1.2. Core Principles

- **Developer-Centric**: The library must provide an intuitive, predictable, and ergonomic API. Strong type-safety through TypeScript is paramount.
- **Isomorphic (Universal)**: The library MUST function seamlessly in both server-side Node.js environments and modern web browsers, with clear security guidance for each.
- **Robust and Resilient**: The library will use modern async/await patterns and feature a comprehensive, typed error-handling system.
- **Flexible Interaction Models**: The client will support both direct, single-action API calls and a fluent, chainable WorkflowBuilder.

### 1.3. Coding Standards

- **Case Convention**: All public-facing and internal properties, methods, and variables defined in this library MUST use camelCase. The HTTP layer is responsible for transforming data to snake_case when communicating with the API if the API requires it, providing a seamless experience for the TypeScript developer.

## 2. Implementation Strategy

To ensure long-term maintainability and alignment with the API, this library will be built using a two-stage approach:

1. **Core Generation**: The low-level components, including all API operation interfaces, response types, and a basic axios-based API request function, SHOULD be auto-generated from the official Nutrient DWS OpenAPI specification using a tool like openapi-typescript. This guarantees that the data contracts are always a perfect match for the API.
2. **Ergonomic Wrapper**: The high-level, user-facing classes (NutrientClient, WorkflowBuilder), the isomorphic input handler, custom error classes, and the security-aware authentication logic will be hand-crafted as a user-friendly wrapper around the auto-generated core. This stage provides the library's primary value and intuitive feel.

## 3. Library Architecture

The library is composed of several core components that work together to provide a seamless developer experience.

- **Public-Facing Classes**: NutrientClient and WorkflowBuilder serve as the main entry points.
- **Data Contracts**: A comprehensive set of TypeScript interfaces, generated from the OpenAPI spec.
- **Error Handling**: A hierarchy of custom error classes for predictable error handling.
- **Isomorphic Input Handling**: A utility to process various file input types.
- **HTTP Layer**: A single, robust function that manages all API communication.

## 4. Component Specifications

### 4.1. Component 1: Types & Interfaces (src/types/)

**Goal**: To define all shared TypeScript interfaces, generated from the OpenAPI spec.

**Deliverables**:

**src/types/common.ts**
- **NutrientClientOptions**: Defines the client constructor options with a flexible, secure authentication mechanism.

```typescript
/**
 * Options for initializing the NutrientClient.
 */
export interface NutrientClientOptions {
  /**
   * The API key for authentication.
   *
   * - For server-side (Node.js) use, this can be your long-lived API key string.
   * - For client-side (browser) use, this MUST be an async function that
   * returns a short-lived access token to avoid exposing your secret key.
   *
   * @example
   * // Server-side
   * const apiKey = 'nutr_sk_...';
   *
   * // Client-side (recommended)
   * const apiKey = async () => {
   * const response = await fetch('/api/get-nutrient-token');
   * const { token } = await response.json();
   * return token;
   * };
   */
  apiKey: string | (() => Promise<string>);
  /**
   * The base URL for the Nutrient DWS API.
   * @default 'https://api.nutrient.io/v1'
   */
  baseUrl?: string;
}
```

Other type files (inputs.ts, operations.ts, responses.ts, index.ts) will be structured as defined in the previous specification, with their content derived from the OpenAPI schema. All properties will be camelCase.

### 4.2. Component 2: Error Handling (src/errors.ts)

No changes from the previous specification. The defined error hierarchy remains best practice.

### 4.3. Component 3: Isomorphic Input Handler (src/inputs.ts)

No changes from the previous specification. The design for handling multiple input sources remains best practice.

### 4.4. Component 4: HTTP Request Layer (src/http.ts)

**Goal**: To create a single function responsible for all API communication.

**Deliverables**:

- An async function: sendRequest(...).
- **Behavior**:
  - It will resolve the apiKey by either using the string directly or awaiting the result of the token-provider function.
  - It MUST transform the camelCase properties of the operations payload object to snake_case before JSON.stringifying, to match the API's expected format.
  - All other behaviors (endpoint, FormData creation, file replacement logic, error handling) remain as defined in the previous specification.

### 4.5. Component 5: Workflow Builder (src/workflow.ts)

No changes from the previous specification. The fluent interface design is correct.

### 4.6. Component 6: Main Client (src/client.ts)

**Goal**: To implement the main NutrientClient class, incorporating security best practices.

**Deliverables**:

- An exported class NutrientClient.
- The constructor, buildWorkflow, and direct API methods remain as previously specified.
- **Security and Environment Considerations (for Documentation)**: The documentation for this class must prominently feature the following guidance:
  - **Server-Side Usage (Node.js)**: Developers can safely initialize the client with their long-lived secret API key (nutr_sk_...). This is the standard pattern for trusted, server-to-server communication.
  - **Client-Side Usage (Browser)**: Developers MUST NOT embed their long-lived API key directly in their frontend code, as this would expose it to the public. Instead, they must implement a simple endpoint on their own backend that can issue short-lived tokens. The NutrientClient should then be initialized with an async function that calls this endpoint to retrieve a token on demand. This pattern ensures that the secret key never leaves the developer's server.

### 4.7. Component 7: Public Exports (src/index.ts)

Export all public-facing components for easy importing by library users.