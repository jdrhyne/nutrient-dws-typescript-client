# Nutrient DWS Client Examples

This directory contains example scripts demonstrating how to use the Nutrient DWS TypeScript Client in various scenarios.

## Examples

### 1. Basic Usage (`basic-usage.ts`)
Demonstrates fundamental operations:
- Converting documents between formats
- Extracting text from PDFs
- Compressing files
- Adding watermarks
- Merging multiple PDFs

### 2. Workflow Builder (`workflow-builder.ts`)
Shows advanced workflow capabilities:
- Chaining multiple operations
- Creating named outputs
- Progress tracking
- Error handling with `continueOnError`

### 3. Browser Usage (`browser-usage.html`)
Interactive web interface demonstrating:
- File upload handling (click or drag-and-drop)
- Client-side token authentication
- All document operations in the browser
- Download processed files

## Running the Examples

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your API key:
   ```bash
   export NUTRIENT_API_KEY="your-api-key-here"
   ```

### Node.js Examples

Run the basic usage example:
```bash
npx ts-node examples/basic-usage.ts
```

Run the workflow builder example:
```bash
npx ts-node examples/workflow-builder.ts
```

### Browser Example

1. Open `browser-usage.html` in a web browser
2. The example includes a mock client for demonstration
3. In production, replace the mock with the actual client import

## Input Files

The examples expect certain input files to exist. You'll need to update the file paths or create test files:

- `path/to/document.docx` - A Word document
- `path/to/document.pdf` - A PDF file
- `path/to/large-document.pdf` - A large PDF for compression testing
- `path/to/document1.pdf`, `document2.pdf`, `document3.pdf` - PDFs for merging
- `path/to/chapter1.pdf`, `chapter2.pdf`, `chapter3.pdf` - PDFs for workflow example

## Output

All examples save their output files to an `output/` directory, which is created automatically.

## Authentication

### Server-side (Node.js)
The Node.js examples use an API key from the environment variable:
```typescript
const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY || 'your-api-key-here'
});
```

### Client-side (Browser)
The browser example demonstrates using a token provider:
```typescript
const client = new NutrientClient({
  apiKey: async () => {
    const response = await fetch('/api/get-nutrient-token');
    const { token } = await response.json();
    return token;
  }
});
```

## Error Handling

All examples include error handling to demonstrate how to catch and handle different types of errors:

```typescript
try {
  const result = await client.convert('file.docx', 'pdf');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof APIError) {
    console.error('API error:', error.statusCode, error.message);
  }
  // ... handle other error types
}
```

## Customization

Feel free to modify these examples to suit your needs:
- Change file paths to your actual documents
- Adjust conversion options and parameters
- Add additional operations or workflows
- Integrate with your application's authentication system