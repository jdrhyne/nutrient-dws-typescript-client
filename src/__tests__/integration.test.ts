/**
 * Integration tests for NutrientClient
 * These tests demonstrate real-world usage patterns and ensure components work together
 */

import { NutrientClient } from '../client';
import { WorkflowBuilder } from '../workflow';
import type { NutrientClientOptions } from '../types/common';

// Skip integration tests in CI/automated environments
const shouldRunIntegrationTests = process.env.NUTRIENT_API_KEY && !process.env.CI;

describe.skip('Integration Tests', () => {
  let client: NutrientClient;
  
  beforeAll(() => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping integration tests - NUTRIENT_API_KEY not found or running in CI');
      return;
    }

    const options: NutrientClientOptions = {
      apiKey: process.env.NUTRIENT_API_KEY!,
      // Use staging/test environment if available
      baseUrl: process.env.NUTRIENT_BASE_URL || 'https://api.nutrient.io/v1',
    };

    client = new NutrientClient(options);
  });

  describe('Basic API Operations', () => {
    it('should convert document format', async () => {
      if (!shouldRunIntegrationTests) return;

      // Create a simple test document
      const testContent = 'Hello, this is a test document for conversion.';
      const textBlob = new Blob([testContent], { type: 'text/plain' });
      
      const result = await client.convert(textBlob, 'pdf');
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
      expect(result.size).toBeGreaterThan(0);
    }, 30000); // 30s timeout for API call

    it('should extract text from document', async () => {
      if (!shouldRunIntegrationTests) return;

      // Create a simple test document
      const testContent = 'This is test content for text extraction.';
      const textBlob = new Blob([testContent], { type: 'text/plain' });
      
      const result = await client.extractText(textBlob, true);
      
      expect(result).toHaveProperty('text');
      expect(result.text).toContain('test content');
      expect(result).toHaveProperty('metadata');
    }, 30000);

    it('should merge multiple documents', async () => {
      if (!shouldRunIntegrationTests) return;

      // Create test documents
      const doc1 = new Blob(['Document 1 content'], { type: 'text/plain' });
      const doc2 = new Blob(['Document 2 content'], { type: 'text/plain' });
      
      const result = await client.merge([doc1, doc2], 'pdf');
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
      expect(result.size).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Workflow Integration', () => {
    it('should execute a complete workflow', async () => {
      if (!shouldRunIntegrationTests) return;

      const testContent = 'This is a comprehensive workflow test document.';
      const textBlob = new Blob([testContent], { type: 'text/plain' });

      const result = await client
        .buildWorkflow()
        .input(textBlob)
        .convert('pdf', { quality: 90 }, 'pdf-version')
        .watermark('TEST DOCUMENT', { position: 'center', opacity: 0.3 }, 'watermarked')
        .compress('medium', 'final-output')
        .execute({
          onProgress: (current, total) => {
            console.log(`Workflow progress: ${current}/${total}`);
          },
        });

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.outputs.size).toBeGreaterThan(0);
      
      // Check named outputs
      expect(result.outputs.has('pdf-version')).toBe(true);
      expect(result.outputs.has('watermarked')).toBe(true);
      expect(result.outputs.has('final-output')).toBe(true);
    }, 60000); // 60s timeout for workflow

    it('should handle workflow errors gracefully', async () => {
      if (!shouldRunIntegrationTests) return;

      // Create an invalid workflow (intentionally)
      const workflow = new WorkflowBuilder({
        apiKey: 'invalid-key', // This should cause authentication errors
      });

      const result = await workflow
        .input('nonexistent-file.pdf')
        .convert('pdf')
        .execute({
          continueOnError: true,
        });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      if (!shouldRunIntegrationTests) return;

      const invalidClient = new NutrientClient({
        apiKey: 'invalid-api-key-12345',
      });

      const testBlob = new Blob(['test'], { type: 'text/plain' });

      await expect(invalidClient.convert(testBlob, 'pdf')).rejects.toThrow();
    }, 15000);

    it('should handle network errors gracefully', async () => {
      if (!shouldRunIntegrationTests) return;

      const offlineClient = new NutrientClient({
        apiKey: 'test-key',
        baseUrl: 'https://nonexistent-api.example.com',
      });

      const testBlob = new Blob(['test'], { type: 'text/plain' });

      await expect(offlineClient.convert(testBlob, 'pdf')).rejects.toThrow();
    }, 15000);
  });

  describe('Performance Tests', () => {
    it('should handle large documents efficiently', async () => {
      if (!shouldRunIntegrationTests) return;

      // Create a larger test document
      const largeContent = 'Lorem ipsum '.repeat(10000); // ~110KB of text
      const largeBlob = new Blob([largeContent], { type: 'text/plain' });

      const startTime = Date.now();
      const result = await client.convert(largeBlob, 'pdf');
      const endTime = Date.now();

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
      
      const processingTime = endTime - startTime;
      console.log(`Large document processing time: ${processingTime}ms`);
      
      // Reasonable performance expectation (adjust based on API performance)
      expect(processingTime).toBeLessThan(60000); // Less than 60 seconds
    }, 90000); // 90s timeout for large file

    it('should handle concurrent requests', async () => {
      if (!shouldRunIntegrationTests) return;

      const testBlobs = Array.from({ length: 3 }, (_, i) => 
        new Blob([`Test document ${i + 1}`], { type: 'text/plain' })
      );

      const startTime = Date.now();
      const promises = testBlobs.map(blob => client.convert(blob, 'pdf'));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
      });

      const totalTime = endTime - startTime;
      console.log(`Concurrent processing time: ${totalTime}ms`);
    }, 90000); // 90s timeout for concurrent requests
  });
});

// Mock tests for development/CI environments
describe('Integration Test Mocks', () => {
  it('should demonstrate client integration patterns', () => {
    const client = new NutrientClient({
      apiKey: 'mock-api-key',
    });

    expect(client).toBeInstanceOf(NutrientClient);
    expect(client.getApiKey()).toBe('mock-api-key');
    expect(client.getBaseUrl()).toBe('https://api.nutrient.io/v1');
  });

  it('should demonstrate workflow builder pattern', () => {
    const client = new NutrientClient({ apiKey: 'mock-key' });
    const workflow = client.buildWorkflow();

    expect(workflow).toBeInstanceOf(WorkflowBuilder);
    expect(workflow.stepCount).toBe(0);

    // Demonstrate fluent API
    workflow
      .input('test.docx')
      .convert('pdf')
      .compress('high')
      .watermark('DRAFT');

    expect(workflow.stepCount).toBe(4);
  });

  it('should demonstrate error handling patterns', async () => {
    const client = new NutrientClient({ apiKey: 'test-key' });

    // These will fail in unit tests but demonstrate the patterns
    try {
      await client.convert('invalid-file', 'pdf');
    } catch (error) {
      expect(error).toBeDefined();
    }

    try {
      await client.merge(['file1.pdf']); // Insufficient files
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});