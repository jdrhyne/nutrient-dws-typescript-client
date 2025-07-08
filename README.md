# Nutrient DWS TypeScript Client

[![npm version](https://badge.fury.io/js/nutrient-dws-typescript-client.svg)](https://badge.fury.io/js/nutrient-dws-typescript-client)
[![CI](https://github.com/jdrhyne/nutrient-dws-typescript-client/actions/workflows/ci.yml/badge.svg)](https://github.com/jdrhyne/nutrient-dws-typescript-client/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/jdrhyne/nutrient-dws-typescript-client/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/jdrhyne/nutrient-dws-typescript-client/actions/workflows/e2e-tests.yml)
[![Security](https://github.com/jdrhyne/nutrient-dws-typescript-client/actions/workflows/security.yml/badge.svg)](https://github.com/jdrhyne/nutrient-dws-typescript-client/actions/workflows/security.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Node.js TypeScript client library for [Nutrient Document Web Services (DWS) API](https://nutrient.io/). This library provides a type-safe and ergonomic interface for document processing operations including conversion, merging, compression, watermarking, and text extraction.

> **Note**: This package is published as `nutrient-dws-typescript-client` on NPM. The package provides full TypeScript support and is designed specifically for Node.js environments.

## Features

- 🔧 **Node.js optimized**: Built specifically for Node.js with native file system support
- 🔒 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🚀 **Unified Architecture**: Consistent builder pattern across all APIs
- 🔗 **Fluent interface**: Intuitive method chaining with staged interfaces
- 🎯 **Direct API mapping**: Builders map directly to REST endpoints
- 🔐 **Flexible authentication**: Support for API keys and async token providers
- 📦 **Multiple module formats**: ESM and CommonJS builds
- 🧪 **Well-tested**: Comprehensive test suite with high coverage
- 🌳 **Tree-shakeable**: Import only what you need

## Installation

```bash
npm install nutrient-dws-typescript-client
```

or

```bash
yarn add nutrient-dws-typescript-client
```

## Quick Start

### Basic Usage

```typescript
import { NutrientClient } from 'nutrient-dws-typescript-client';

// Initialize the client
const client = new NutrientClient({
  apiKey: 'your-api-key-here'
});

// Simple conversion using convenience method
const result = await client.convert('document.docx', 'pdf');

// Or use the workflow builder for more control
const workflowResult = await client
  .workflow()
  .addFilePart('document.docx')
  .outputPdf()
  .execute();
```

### Workflow Builder

The workflow builder provides a composable API for complex document processing:

```typescript
const result = await client
  .workflow()
  .addFilePart('document.pdf')
  .addFilePart('appendix.pdf')
  .applyAction(BuildActions.watermarkText('CONFIDENTIAL', {
    opacity: 0.5,
    fontSize: 48
  }))
  .outputPdf({ 
    optimize: { 
      mrcCompression: true,
      imageOptimizationQuality: 2 
    } 
  })
  .execute();

// Check the result
if (result.success && result.output) {
  // Access the processed document
  const buffer = result.output.buffer;
  const mimeType = result.output.mimeType;
}
```

## Authentication

### API Key (Server-side)

For server-side usage, provide your API key directly:

```typescript
const client = new NutrientClient({
  apiKey: 'nutr_sk_your_secret_key'
});
```

### Token Provider (Client-side)

For client-side usage, use an async token provider to fetch tokens from your backend:

```typescript
const client = new NutrientClient({
  apiKey: async () => {
    const response = await fetch('/api/get-nutrient-token');
    const { token } = await response.json();
    return token;
  }
});
```

## Architectural Principles

This library follows a unified architectural approach based on these principles:

### 1. Fluent Builder Pattern
All APIs use method chaining for an intuitive, readable interface:
```typescript
const result = await client.workflow()
  .addFilePart(file)
  .applyAction(action)
  .outputPdf()
  .execute();
```

### 2. Staged Interfaces
Methods are available only at appropriate stages, providing compile-time safety:
- Stage 1: Add parts (files, HTML, pages)
- Stage 2: Apply actions (optional)
- Stage 3: Set output format
- Stage 4: Execute or dry run

### 3. Direct API Mapping
Builders map directly to REST endpoints, making the API predictable and easy to understand.

### 4. Consistent Error Handling
All operations return a result object with success status and errors:
```typescript
if (!result.success) {
  result.errors?.forEach(error => {
    console.error(`Step ${error.step}: ${error.error.message}`);
  });
}
```

### 5. Type Safety
Full TypeScript support with generics ensures type-safe outputs:
```typescript
// TypeScript knows this returns JSON content
const result = await client.workflow()
  .addFilePart('doc.pdf')
  .outputJson()
  .execute();
// result.output.data is properly typed
```

## API Reference

### NutrientClient

The main client for interacting with the Nutrient DWS API.

#### Constructor

```typescript
new NutrientClient(options: NutrientClientOptions)
```

Options:
- `apiKey` (required): Your API key string or async function returning a token
- `baseUrl` (optional): Custom API base URL (defaults to `https://api.nutrient.io`)
- `timeout` (optional): Request timeout in milliseconds

#### Methods

##### convert(file, targetFormat, options?)
Converts a document to a different format.

```typescript
const pdfBlob = await client.convert(
  'document.docx',  // or File, Blob, Buffer, Uint8Array, URL
  'pdf',            // Target format
  {                 // Optional conversion options
    quality: 90,
    optimize: true
  }
);
```

##### merge(files, outputFormat?)
Merges multiple documents into one.

```typescript
const mergedPdf = await client.merge([
  'doc1.pdf',
  'doc2.pdf',
  'doc3.pdf'
], 'pdf');
```

##### compress(file, compressionLevel?)
Compresses a document to reduce file size.

```typescript
const compressedPdf = await client.compress(
  largePdfFile,
  'high'  // 'low' | 'medium' | 'high'
);
```

##### extractText(file, includeMetadata?)
Extracts text content from a document.

```typescript
const result = await client.extractText('document.pdf', true);
console.log(result.text);
console.log(result.metadata);
```

##### watermark(file, watermarkText, options?)
Adds a watermark to a document.

```typescript
const watermarkedPdf = await client.watermark(
  'document.pdf',
  'CONFIDENTIAL',
  {
    position: 'center',  // Position on page
    opacity: 0.3,        // 0-1
    fontSize: 48         // Font size in points
  }
);
```

##### workflow()
Creates a new WorkflowBuilder for chaining operations.

```typescript
const workflow = client.workflow();
```

### WorkflowBuilder

Fluent interface for building document processing workflows.

#### Methods

All methods return `this` for chaining, except `execute()`.

##### input(file)
Sets the initial input file.

##### convert(targetFormat, options?, outputName?)
Adds a conversion step.

##### merge(additionalFiles, outputFormat?, outputName?)
Adds a merge step with additional files.

##### compress(compressionLevel?, outputName?)
Adds a compression step.

##### extractText(includeMetadata?, outputName?)
Adds a text extraction step.

##### watermark(text, options?, outputName?)
Adds a watermarking step.

##### execute(options?)
Executes the workflow and returns results.

Options:
- `onProgress`: Callback for progress updates

```typescript
const result = await workflow.execute({
  onProgress: (current, total) => {
    console.log(`Step ${current} of ${total}`);
  }
});
```

## File Input Types

The library accepts various file input types depending on the environment:

### Universal
- `string`: File path (Node.js) or URL (both environments)
- `Uint8Array`: Raw binary data

### Browser-only
- `File`: Browser File object
- `Blob`: Browser Blob object

### Node.js-only
- `Buffer`: Node.js Buffer
- File path strings

### Structured Inputs
For explicit control, use structured input objects:

```typescript
// Browser file
{ type: 'browser-file', file: File }

// Blob with custom filename
{ type: 'blob', blob: Blob, filename: 'custom.pdf' }

// File path
{ type: 'file-path', path: '/path/to/file' }

// Buffer with filename
{ type: 'buffer', buffer: Buffer, filename: 'document.pdf' }

// Uint8Array with filename
{ type: 'uint8array', data: Uint8Array, filename: 'data.bin' }

// URL
{ type: 'url', url: 'https://example.com/file.pdf' }
```

## Error Handling

The library provides a comprehensive error hierarchy:

```typescript
import { 
  NutrientError,
  ValidationError,
  APIError,
  AuthenticationError,
  NetworkError
} from 'nutrient-dws-typescript-client';

try {
  const result = await client.convert('file.docx', 'pdf');
} catch (error) {
  if (error instanceof ValidationError) {
    // Invalid input parameters
    console.error('Invalid input:', error.message, error.details);
  } else if (error instanceof AuthenticationError) {
    // Authentication failed
    console.error('Auth error:', error.message, error.statusCode);
  } else if (error instanceof APIError) {
    // API returned an error
    console.error('API error:', error.message, error.statusCode, error.details);
  } else if (error instanceof NetworkError) {
    // Network request failed
    console.error('Network error:', error.message, error.details);
  }
}
```

## Environment Detection

The library automatically detects the runtime environment and adapts accordingly:

```typescript
import { 
  getEnvironment,
  getEnvironmentCapabilities,
  isBrowser,
  isNode,
  isWebWorker
} from 'nutrient-dws-typescript-client';

const env = getEnvironment(); // 'browser' | 'node' | 'webworker' | 'unknown'
const capabilities = getEnvironmentCapabilities();
// {
//   environment: 'node',
//   hasFetch: true,
//   hasFormData: true,
//   hasFileAPI: false,
//   hasNodeFS: true
// }
```

## Testing

### Running Tests

The library includes comprehensive unit, integration, and E2E tests:

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run only unit tests
npm test -- --testPathPattern="^((?!integration|e2e).)*$"

# Run integration tests (requires API key)
NUTRIENT_API_KEY=your_key npm test -- integration

# Run E2E tests (requires API key)
NUTRIENT_API_KEY=your_key npm test -- e2e

# Run specific test file
npm test -- client.test.ts
```

### Test Coverage

The library maintains high test coverage across all API methods:

- **Unit Tests**: Cover all public methods with mocked dependencies
- **Integration Tests**: Test real API interactions for common workflows
- **E2E Tests**: Comprehensive testing of all API features including:
  - Document conversion (PDF, DOCX, XLSX, PPTX, images)
  - OCR with multiple languages
  - Watermarking (text and image)
  - Document merging and compression
  - Text extraction with metadata
  - Annotation operations (flatten, XFDF, Instant JSON)
  - Redaction operations (text, regex, presets)
  - HTML to PDF conversion
  - Advanced PDF options (security, metadata, optimization)
  - Complex multi-step workflows

### Writing Tests

When contributing new features, please include appropriate tests:

```typescript
// Unit test example
describe('MyFeature', () => {
  it('should handle basic case', () => {
    const result = myFeature(input);
    expect(result).toBe(expected);
  });
});

// E2E test example
describeE2E('MyFeature E2E', () => {
  it('should work with real API', async () => {
    const result = await client.myFeature(realInput);
    ResultValidator.validatePdfOutput(result);
  }, 30000); // 30s timeout for API calls
});
```

Use the provided test helpers for consistency:

```typescript
import { 
  TestDocumentGenerator,
  ResultValidator,
  PerformanceMonitor,
  BatchTestRunner
} from './__tests__/e2e-test-helpers';

// Generate test documents
const pdf = TestDocumentGenerator.generateSimplePdf();
const html = TestDocumentGenerator.generateHtmlContent({ includeTable: true });

// Validate results
ResultValidator.validatePdfOutput(result);
ResultValidator.validateOfficeOutput(result, 'docx');

// Monitor performance
const monitor = new PerformanceMonitor();
monitor.start();
// ... perform operations ...
monitor.expectUnder(5000, 'Operation should complete within 5s');
```

## Development

### Contributing

We follow strict development standards to ensure code quality and maintainability. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

#### Quick Start for Contributors

1. **Clone and setup**:
   ```bash
   git clone https://github.com/jdrhyne/nutrient-dws-typescript-client.git
   cd nutrient-dws-typescript-client
   npm install
   ```

2. **Make changes following atomic commit practices**:
   ```bash
   # Create feature branch
   git checkout -b feat/your-feature-name

   # Make small, focused changes
   # Each commit should represent one logical change
   ```

3. **Use conventional commits**:
   ```bash
   # Option 2: Manual commit with conventional format
   git commit -m "feat(client): add document conversion method"
   ```

#### Commit Message Examples

```bash
# Features
feat(client): add convert document method
feat(workflow): implement step chaining
feat(types): add file input validation

# Bug fixes
fix(http): handle authentication errors properly
fix(inputs): resolve file path resolution issue

# Documentation
docs(api): update client options interface
docs: add usage examples for workflows

# Build/tooling
build: configure commitlint validation
chore: update dependencies to latest versions
```

### Development Scripts

```bash
npm run build          # Build all outputs (ESM, CJS, types)
npm run test           # Run test suite
npm run lint           # Check code quality
npm run format         # Format code with Prettier
npm run typecheck      # Validate TypeScript
npm run commit         # Create conventional commit (recommended)
```

### Project Structure

```
src/
├── types/           # TypeScript interfaces and types
├── utils/           # Utility functions
├── client.ts        # Main NutrientClient class
├── workflow.ts      # WorkflowBuilder class
├── errors.ts        # Error classes
├── inputs.ts        # Input handling
├── http.ts          # HTTP layer
└── index.ts         # Public exports
```

For detailed contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

### Workflows

1. **CI** (`ci.yml`): Runs on every push and PR
   - Linting and type checking
   - Unit tests across multiple Node versions and OS
   - E2E tests (for trusted sources only)
   - Automated releases to NPM

2. **E2E Tests** (`e2e-tests.yml`): Dedicated E2E test runner
   - Tests against real Nutrient API
   - Runs on PRs and pushes to main
   - Multiple Node.js versions

3. **Scheduled E2E** (`scheduled-e2e.yml`): Daily API compatibility check
   - Runs every day at 2 AM UTC
   - Creates issues if tests fail
   - Helps detect API changes early

4. **Security** (`security.yml`): Security scanning
   - Secret scanning with Gitleaks
   - Dependency vulnerability checks
   - CodeQL analysis

### Setting Up CI/CD

1. **Fork/Clone the repository**

2. **Set up GitHub Secrets** (see [.github/SETUP_SECRETS.md](.github/SETUP_SECRETS.md)):
   - `NUTRIENT_API_KEY`: Your Nutrient API key for E2E tests
   - `NPM_TOKEN`: (Optional) For automated NPM releases
   - `SNYK_TOKEN`: (Optional) For security scanning

3. **Enable GitHub Actions**:
   - Go to Settings → Actions → General
   - Ensure actions are enabled

### Security

- **Never commit API keys** to the repository
- API keys are stored as GitHub Secrets
- E2E tests only run on trusted sources (not on forks)
- Automated security scanning on every PR

For detailed contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/jdrhyne/nutrient-dws-typescript-client/issues).

For questions about the Nutrient DWS API, refer to the [official documentation](https://nutrient.io/docs/).
