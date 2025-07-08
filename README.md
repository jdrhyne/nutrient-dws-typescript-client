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

### Direct API Key

Provide your API key directly:

```typescript
const client = new NutrientClient({
  apiKey: 'nutr_sk_your_secret_key'
});
```

### Token Provider

Use an async token provider to fetch tokens from a secure source:

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
- Stage 1: Add parts (files, HTML, pages, documents)
  - `addFilePart`: Add a file to the workflow
  - `addHtmlPart`: Add HTML content to the workflow
  - `addNewPage`: Add a blank page to the workflow
  - `addDocumentPart`: Add a document by ID to the workflow
- Stage 2: Apply actions (optional)
  - `applyAction`: Apply a single action to the entire document
  - `applyActions`: Apply multiple actions to the entire document
  - Action Types:
    - Document Processing: `ocr`, `rotate`, `flatten`
    - Watermarking: `watermarkText`, `watermarkImage`
    - Annotations: `applyInstantJson`, `applyXfdf`
    - Redactions: `createRedactionsPreset`, `createRedactionsText`, `createRedactionsRegex`, `applyRedactions`
- Stage 3: Set output format
  - `outputPdf`: Output as PDF
  - `outputPdfA`: Output as PDF/A (archival)
  - `outputPdfUA`: Output as PDF/UA (accessible)
  - `outputImage`: Output as image (PNG, JPEG, WebP)
  - `outputOffice`: Output as Office format (DOCX, XLSX, PPTX)
  - `outputHtml`: Output as HTML
  - `outputMarkdown`: Output as Markdown
  - `outputJson`: Output as JSON content extraction
- Stage 4: Execute or dry run
  - `execute`: Execute the workflow
  - `dryRun`: Analyze the workflow without executing it

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

##### getAccountInfo()
Gets account information for the current API key.

```typescript
const accountInfo = await client.getAccountInfo();
console.log(accountInfo.organization);
```

##### createToken(params)
Creates a new authentication token.

```typescript
const token = await client.createToken({
  name: 'My API Token',
  expiresIn: '30d'
});
console.log(token.id);
```

##### deleteToken(id)
Deletes an authentication token.

```typescript
await client.deleteToken('token-id-123');
```

##### signPdf(file, data?, options?)
Signs a PDF document.

```typescript
const result = await client.signPdf('document.pdf', {
  signature: {
    name: 'John Doe',
    location: 'San Francisco',
    reason: 'Approval'
  }
});
```

##### createRedactionsAI(file, criteria, redaction_state?, pages?, options?)
Uses AI to redact sensitive information in a document.

```typescript
// Stage redactions
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all emails'
);

// Apply redactions immediately
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all PII',
  'apply'
);

// Redact only specific pages
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all emails',
  'stage',
  { start: 0, end: 4 }  // Pages 0, 1, 2, 3, 4
);

// Redact only the last 3 pages
const result = await client.createRedactionsAI(
  'document.pdf',
  'Remove all PII',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);
```

##### workflow()
Creates a new WorkflowBuilder for chaining operations.

```typescript
const workflow = client.workflow();
```

##### ocr(file, language)
Performs OCR (Optical Character Recognition) on a document.

```typescript
const result = await client.ocr('scanned-document.pdf', 'english');
```

##### watermarkText(file, text, options?)
Adds a text watermark to a document.

```typescript
const result = await client.watermarkText('document.pdf', 'CONFIDENTIAL', {
  opacity: 0.5,
  fontSize: 24
});
```

##### watermarkImage(file, image, options?)
Adds an image watermark to a document.

```typescript
const result = await client.watermarkImage('document.pdf', 'watermark.jpg', {
  opacity: 0.5,
  scale: 0.5
});
```

##### convert(file, targetFormat)
Converts a document to a different format.

```typescript
const pdfResult = await client.convert('document.docx', 'pdf');
// Supports formats: pdf, pdfa, pdfua, docx, xlsx, pptx, png, jpeg, jpg, webp, html, markdown
```

##### merge(files)
Merges multiple documents into one.

```typescript
const mergedPdf = await client.merge([
  'doc1.pdf',
  'doc2.pdf',
  'doc3.pdf'
]);
```

##### extractText(file, pages?)
Extracts text content from a document.

```typescript
const result = await client.extractText('document.pdf');

// Extract text from specific pages
const result = await client.extractText('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2

// Extract text from the last page
const result = await client.extractText('document.pdf', { end: -1 }); // Last page

// Extract text from the second-to-last page to the end
const result = await client.extractText('document.pdf', { start: -2 }); // Second-to-last and last page
```

##### extractTable(file, pages?)
Extracts table content from a document.

```typescript
const result = await client.extractTable('document.pdf');

// Extract tables from specific pages
const result = await client.extractTable('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2

// Extract tables from the last page
const result = await client.extractTable('document.pdf', { end: -1 }); // Last page

// Extract tables from the second-to-last page to the end
const result = await client.extractTable('document.pdf', { start: -2 }); // Second-to-last and last page
```

##### extractKeyValuePairs(file, pages?)
Extracts key value pair content from a document.

```typescript
const result = await client.extractKeyValuePairs('document.pdf');

// Extract KVPs from specific pages
const result = await client.extractKeyValuePairs('document.pdf', { start: 0, end: 2 }); // Pages 0, 1, 2

// Extract KVPs from the last page
const result = await client.extractKeyValuePairs('document.pdf', { end: -1 }); // Last page

// Extract KVPs from the second-to-last page to the end
const result = await client.extractKeyValuePairs('document.pdf', { start: -2 }); // Second-to-last and last page
```

##### flatten(file, annotationIds?)
Flattens annotations in a PDF document.

```typescript
const result = await client.flatten('annotated-document.pdf');
```

##### rotate(file, angle, pages?)
Rotates pages in a document.

```typescript
const result = await client.rotate('document.pdf', 90);

// Rotate specific pages:
const result = await client.rotate('document.pdf', 90, { start: 1, end: 3 }); // Pages 1, 2, 3

// Rotate the last page:
const result = await client.rotate('document.pdf', 90, { end: -1 }); // Last page

// Rotate from page 2 to the second-to-last page:
const result = await client.rotate('document.pdf', 90, { start: 2, end: -2 });
```

##### passwordProtect(file, userPassword, ownerPassword, permissions?)
Password protects a PDF document.

```typescript
const result = await client.passwordProtect('document.pdf', 'user123', 'owner456');
```

##### setMetadata(file, metadata)
Sets metadata for a PDF document.

```typescript
const result = await client.setMetadata('document.pdf', {
  title: 'My Document',
  author: 'John Doe'
});
```

##### setPageLabels(file, labels)
Sets page labels for a PDF document.

```typescript
const result = await client.setPageLabels('document.pdf', [
  { pages: [0, 1, 2], label: 'Cover' },
  { pages: [3, 4, 5], label: 'Chapter 1' }
]);
```

##### applyInstantJson(file, instantJsonFile)
Applies Instant JSON to a document.

```typescript
const result = await client.applyInstantJson('document.pdf', 'annotations.json');
```

##### applyXfdf(file, xfdfFile, options?)
Applies XFDF to a document.

```typescript
const result = await client.applyXfdf('document.pdf', 'annotations.xfdf');
```

##### createRedactionsPreset(file, preset, redaction_state?, pages?, presetOptions?, options?)
Creates redaction annotations based on a preset pattern.

```typescript
const result = await client.createRedactionsPreset('document.pdf', 'email-address');

// With specific pages
const result = await client.createRedactionsPreset(
  'document.pdf',
  'email-address',
  'stage',
  { start: 0, end: 4 }  // Pages 0, 1, 2, 3, 4
);

// With the last 3 pages
const result = await client.createRedactionsPreset(
  'document.pdf',
  'email-address',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);
```

##### createRedactionsRegex(file, regex, redaction_state?, pages?, regexOptions?, options?)
Creates redaction annotations based on a regular expression.

```typescript
const result = await client.createRedactionsRegex('document.pdf', 'Account:\\s*\\d{8,12}');

// With specific pages
const result = await client.createRedactionsRegex(
  'document.pdf',
  'Account:\\s*\\d{8,12}',
  'stage',
  { start: 0, end: 4 }  // Pages 0, 1, 2, 3, 4
);

// With the last 3 pages
const result = await client.createRedactionsRegex(
  'document.pdf',
  'Account:\\s*\\d{8,12}',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);
```

##### createRedactionsText(file, text, redaction_state?, pages?, textOptions?, options?)
Creates redaction annotations based on text.

```typescript
const result = await client.createRedactionsText('document.pdf', 'email@example.com');

// With specific pages and options
const result = await client.createRedactionsText(
  'document.pdf',
  'email@example.com',
  'stage',
  { start: 0, end: 4 },  // Pages 0, 1, 2, 3, 4
  { caseSensitive: false, includeAnnotations: true }
);

// Create redactions on the last 3 pages
const result = await client.createRedactionsText(
  'document.pdf',
  'email@example.com',
  'stage',
  { start: -3, end: -1 }  // Last three pages
);
```

##### applyRedactions(file)
Applies redaction annotations in a document.

```typescript
const result = await client.applyRedactions('document-with-redactions.pdf');
```

##### addPage(file, count?, index?)
Adds blank pages to a document.

```typescript
// Add 2 blank pages at the end
const result = await client.addPage('document.pdf', 2);

// Add 1 blank page after the first page (at index 1)
const result = await client.addPage('document.pdf', 1, 1);
```

##### optimize(file, options?)
Optimizes a PDF document for size reduction.

```typescript
const result = await client.optimize('large-document.pdf', {
  grayscaleImages: true,
  mrcCompression: true,
  imageOptimizationQuality: 2
});
```

##### splitPdf(file, pageRanges)
Splits a PDF document into multiple parts based on page ranges.

```typescript
const results = await client.splitPdf('document.pdf', [
  { start: 0, end: 2 },  // Pages 1-3
  { start: 3, end: 5 }   // Pages 4-6
]);
```

##### duplicatePages(file, pageIndices)
Creates a new PDF containing only the specified pages in the order provided.

```typescript
// Create a new PDF with only the first and third pages
const result = await client.duplicatePages('document.pdf', [0, 2]);
```

##### deletePages(file, pageIndices)
Deletes pages from a PDF document.

```typescript
const result = await client.deletePages('document.pdf', [1, 3]); // Delete second and fourth pages
```

### WorkflowBuilder

Fluent interface for building document processing workflows.

#### Methods

All methods return `this` for chaining, except `execute()` and `dryRun()`.

##### Part Methods

###### addFilePart(file, options?, actions?)
Adds a file part to the workflow.

```typescript
workflow.addFilePart('document.pdf', { pages: { start: 0, end: 4 } });
```

###### addHtmlPart(html, options?, actions?)
Adds an HTML part to the workflow.

```typescript
workflow.addHtmlPart('index.html', { layout: { size: 'A4' } });
```

###### addNewPage(options?, actions?)
Adds a blank page to the workflow.

```typescript
workflow.addNewPage({ layout: { size: 'Letter' } });
```

###### addDocumentPart(documentId, options?, actions?)
Adds a document by ID to the workflow.

```typescript
workflow.addDocumentPart('doc_123456', { pages: { start: 0, end: 2 } });
```

##### Action Methods

###### applyAction(action)
Applies a single action to the entire document.

```typescript
workflow.applyAction(BuildActions.watermarkText('CONFIDENTIAL'));
```

###### applyActions(actions)
Applies multiple actions to the entire document.

```typescript
workflow.applyActions([
  BuildActions.watermarkText('DRAFT'),
  BuildActions.rotate(90)
]);
```

##### Output Methods

###### outputPdf(options?)
Sets PDF output format.

###### outputPdfA(options?)
Sets PDF/A (archival) output format.

###### outputPdfUA(options?)
Sets PDF/UA (accessible) output format.

###### outputImage(format, options?)
Sets image output format (PNG, JPEG, WebP).

###### outputOffice(format)
Sets Office format output (DOCX, XLSX, PPTX).

###### outputHtml(options?)
Sets HTML output format.

###### outputMarkdown(options?)
Sets Markdown output format.

###### outputJson(options?)
Sets JSON content extraction output format.

##### Execution Methods

###### execute(options?)
Executes the workflow and returns results.

Options:
- `onProgress`: Callback for progress updates
- `timeout`: Request timeout in milliseconds

```typescript
const result = await workflow.execute({
  onProgress: (current, total) => {
    console.log(`Step ${current} of ${total}`);
  }
});
```

###### dryRun(options?)
Analyzes the workflow without executing it.

```typescript
const analysis = await workflow.dryRun();
console.log(analysis.analysis.estimatedPages);
```

## File Input Types

The library accepts various file input types:

### Supported Types
- `string`: File path or URL
- `Uint8Array`: Raw binary data
- `Buffer`: Node.js Buffer
- File path strings

### Structured Inputs
For explicit control, use structured input objects:

```typescript
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
} from './__tests__/e2e-test-helpers';

// Generate test documents
const pdf = TestDocumentGenerator.generateSimplePdf();
const html = TestDocumentGenerator.generateHtmlContent({ includeTable: true });

// Validate results
ResultValidator.validatePdfOutput(result);
ResultValidator.validateOfficeOutput(result, 'docx');
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
├── __tests__/   # Test files
├── builders/    # Builder classes
├── generated/   # Generated code
├── types/       # TypeScript interfaces and types
├── build.ts     # Build utilities
├── client.ts    # Main NutrientClient class
├── errors.ts    # Error classes
├── http.ts      # HTTP layer
├── inputs.ts    # Input handling
├── workflow.ts  # WorkflowBuilder class
└── index.ts     # Public exports
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
