# Nutrient DWS TypeScript Client

A TypeScript client library for [Nutrient Document Web Services (DWS) API](https://nutrient.io/). This library provides an isomorphic, type-safe, and ergonomic interface for document processing operations including conversion, merging, compression, watermarking, and text extraction.

## Features

- 🌐 **Isomorphic**: Works in both Node.js and browser environments
- 🔒 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🚀 **Workflow API**: Powerful document assembly with the Workflow API for complex document workflows
- 🔗 **Fluent interface**: Chain operations with WorkflowBuilder and BuildApiBuilder
- 🔐 **Flexible authentication**: Support for API keys and async token providers
- 📦 **Multiple module formats**: ESM and CommonJS builds
- 🧪 **Well-tested**: Comprehensive test suite with high coverage
- 🌳 **Tree-shakeable**: Import only what you need

## Installation

```bash
npm install @nutrient/dws-client
```

or

```bash
yarn add @nutrient/dws-client
```

## Quick Start

### Basic Usage

```typescript
import { NutrientClient } from '@nutrient/dws-client';

// Initialize the client
const client = new NutrientClient({
  apiKey: 'your-api-key-here'
});

// Use WorkflowBuilder for document processing
const result = await client
  .workflow()
  .input('path/to/document.docx')
  .convert('pdf')
  .execute();
```

### Workflow Builder

For sequential document processing workflows:

```typescript
const result = await client
  .workflow()
  .input('path/to/document.docx')
  .convert('pdf', { quality: 90 })
  .compress('high')
  .watermark('CONFIDENTIAL', { 
    position: 'center',
    opacity: 0.3,
    fontSize: 48 
  })
  .execute();

// Access the processed document
const processedBlob = result.outputs.get('_final');
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

## API Reference

### NutrientClient

The main client for interacting with the Nutrient DWS API.

#### Constructor

```typescript
new NutrientClient(options: NutrientClientOptions)
```

Options:
- `apiKey` (required): Your API key string or async function returning a token
- `baseUrl` (optional): Custom API base URL (defaults to `https://api.nutrient.io/v1`)
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
} from '@nutrient/dws-client';

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
} from '@nutrient/dws-client';

const env = getEnvironment(); // 'browser' | 'node' | 'webworker' | 'unknown'
const capabilities = getEnvironmentCapabilities();
// {
//   environment: 'node',
//   hasFetch: true,
//   hasFormData: true,
//   hasFileAPI: false,
//   hasNodeFS: true
// }

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/jdrhyne/nutrient-dws-typescript-client/issues).

For questions about the Nutrient DWS API, refer to the [official documentation](https://nutrient.io/docs/).
