# Integration Testing Guide

This document explains how to run integration tests against the live Nutrient DWS API to verify that all functionality works correctly.

## Overview

The integration tests verify:
- All new convenience methods (`convert`, `ocr`, `watermark`, `merge`, `compress`, `extractText`, `flatten`, `rotate`)
- Complex workflow builder scenarios
- Error handling with live API responses
- Performance characteristics
- Type safety and API contracts

## Prerequisites

1. **Nutrient API Key**: You need a valid Nutrient DWS API key
2. **Node.js**: Ensure you have Node.js installed
3. **Dependencies**: Run `npm install` to install dependencies

## Running Integration Tests

### Method 1: Using the Script (Recommended)

```bash
# Make the script executable (first time only)
chmod +x scripts/run-integration-tests.sh

# Run with API key as argument
./scripts/run-integration-tests.sh your-api-key-here

# Or set environment variable and run
export NUTRIENT_API_KEY=your-api-key-here
./scripts/run-integration-tests.sh
```

### Method 2: Manual Execution

```bash
# Set environment variables
export NUTRIENT_API_KEY=your-api-key-here
export RUN_INTEGRATION_TESTS=true

# Run the tests
npm test -- --testPathPattern="integration.test"
```

### Method 3: Jest Configuration

Create a `.env` file in the project root:
```
NUTRIENT_API_KEY=your-api-key-here
RUN_INTEGRATION_TESTS=true
```

Then run:
```bash
npm run test:integration
```

## Test Categories

### 1. Convenience Methods
Tests all the new convenience methods added to the client:

- **convert()**: Document format conversion (DOCX→PDF, PDF→DOCX, etc.)
- **ocr()**: Optical Character Recognition with single/multiple languages
- **watermark()**: Text watermarking with various options
- **merge()**: Merging multiple documents into one
- **compress()**: PDF compression with different levels
- **extractText()**: Text extraction from documents
- **flatten()**: Flattening PDF annotations
- **rotate()**: Rotating document pages

### 2. Workflow Builder
Tests complex document processing workflows:

- Multi-part workflows (files, HTML, new pages)
- Part-specific and document-wide actions
- Different output formats
- Progress tracking
- Dry run analysis

### 3. Error Handling
Tests error scenarios:

- Invalid API keys (authentication errors)
- Invalid file inputs (validation errors)
- Network timeouts
- Malformed requests

### 4. Performance
Tests performance characteristics:

- Large file processing
- Concurrent operations
- Processing time measurements

## Test Structure

```typescript
describe('Integration Tests with Live API', () => {
  describe('Convenience Methods', () => {
    describe('convert()', () => {
      it('should convert DOCX to PDF', async () => {
        // Test implementation
      });
    });
    // ... other convenience methods
  });

  describe('Workflow Builder', () => {
    it('should execute complex workflow', async () => {
      // Test complex multi-step workflows
    });
  });

  describe('Error Handling', () => {
    // Test error scenarios
  });

  describe('Performance', () => {
    // Test performance characteristics
  });
});
```

## Example Test Files

The tests use example files from the `examples/` directory:
- `example.pdf` - Simple PDF for testing
- `example.docx` - DOCX document for conversion tests
- `example.png` - Image file for OCR tests

If these files don't exist, the script will create basic versions automatically.

## Cost Considerations

⚠️ **Important**: Integration tests consume API credits!

- Each test operation costs credits according to your Nutrient DWS plan
- The tests are designed to use minimal resources where possible
- Consider using a test/staging API key if available
- Monitor your usage to avoid unexpected charges

## Customizing Tests

### Using Different API Endpoints

```bash
export NUTRIENT_BASE_URL=https://staging-api.nutrient.io/v1
```

### Filtering Tests

Run specific test suites:
```bash
npm test -- --testPathPattern="integration.test" --testNamePattern="convert"
```

### Adding Custom Tests

Add new tests to `src/__tests__/integration.test.ts`:

```typescript
it('should handle custom scenario', async () => {
  const result = await client.customMethod();
  expect(result.success).toBe(true);
}, 30000);
```

## Troubleshooting

### Tests Skipped
If you see "skipped" tests, ensure:
- `NUTRIENT_API_KEY` is set
- `RUN_INTEGRATION_TESTS=true` is set

### Authentication Errors
- Verify your API key is correct
- Check if the key has necessary permissions
- Ensure you're using the correct base URL

### Timeout Errors
- Increase test timeouts for large files
- Check your network connection
- Consider API rate limits

### File Not Found Errors
- Ensure example files exist in `examples/` directory
- Use absolute paths if needed
- Check file permissions

## CI/CD Integration

To run integration tests in CI/CD:

```yaml
# GitHub Actions example
- name: Run Integration Tests
  env:
    NUTRIENT_API_KEY: ${{ secrets.NUTRIENT_API_KEY }}
    RUN_INTEGRATION_TESTS: true
  run: npm test -- --testPathPattern="integration.test"
```

## Best Practices

1. **Use Test API Keys**: Use dedicated test keys when available
2. **Monitor Usage**: Keep track of API credit consumption
3. **Real Files**: Use realistic test files for better coverage
4. **Error Testing**: Test both success and failure scenarios
5. **Performance Monitoring**: Track response times and resource usage
6. **Cleanup**: Ensure tests don't leave behind resources

## Reporting Issues

If integration tests reveal issues:

1. Check the error messages and stack traces
2. Verify the API request/response in browser dev tools
3. Test the same operation manually
4. Report bugs with:
   - Test case that fails
   - Expected vs actual behavior
   - API response details
   - Environment information

## Security Notes

- Never commit API keys to version control
- Use environment variables or secure secret management
- Rotate test API keys regularly
- Monitor for unauthorized usage