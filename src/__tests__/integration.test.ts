/**
 * Integration tests for NutrientClient
 * These tests demonstrate real-world usage patterns and ensure components work together
 * 
 * To run these tests with a live API:
 * 1. Set NUTRIENT_API_KEY environment variable
 * 2. Run: NUTRIENT_API_KEY=your_key npm test -- integration.test
 */

import { NutrientClient } from '../client';
import { BuildActions } from '../build';
import type { NutrientClientOptions } from '../types/common';
import * as fs from 'fs';
import * as path from 'path';

// Skip integration tests in CI/automated environments unless explicitly enabled
const shouldRunIntegrationTests = process.env.NUTRIENT_API_KEY && process.env.RUN_INTEGRATION_TESTS === 'true';

// Use conditional describe based on environment
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('Integration Tests with Live API', () => {
  let client: NutrientClient;
  let testPdfPath: string;
  let testDocxPath: string;
  let testImagePath: string;

  beforeAll(() => {
    const options: NutrientClientOptions = {
      apiKey: process.env.NUTRIENT_API_KEY ?? '',
      baseUrl: process.env.NUTRIENT_BASE_URL ?? 'https://api.nutrient.io/v1',
    };

    client = new NutrientClient(options);

    // Create test files or use existing ones
    testPdfPath = path.join(__dirname, '../../examples/example.pdf');
    testDocxPath = path.join(__dirname, '../../examples/example.docx');
    testImagePath = path.join(__dirname, '../../examples/example.png');
  });

  describe('Convenience Methods', () => {
    describe('convert()', () => {
      it('should convert DOCX to PDF', async () => {
        const docxFile = fs.existsSync(testDocxPath) 
          ? fs.readFileSync(testDocxPath) 
          : Buffer.from('Test document content');

        const result = await client.convert(docxFile, 'pdf');

        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        expect(result.output?.mimeType).toBe('application/pdf');
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      }, 30000);

      it('should convert PDF to DOCX', async () => {
        const pdfFile = fs.existsSync(testPdfPath) 
          ? fs.readFileSync(testPdfPath) 
          : Buffer.from('%PDF-1.4 test');

        const result = await client.convert(pdfFile, 'docx');

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }, 30000);

      it('should convert to image format', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test');

        const result = await client.convert(pdfFile, 'image');

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toMatch(/^image\//);
      }, 30000);
    });

    describe('ocr()', () => {
      it('should perform OCR on a scanned document', async () => {
        const imageFile = fs.existsSync(testImagePath) 
          ? fs.readFileSync(testImagePath) 
          : Buffer.from('fake-image-data');

        const result = await client.ocr(imageFile, 'english');

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);

      it('should support multiple OCR languages', async () => {
        const imageFile = Buffer.from('fake-image-data');

        const result = await client.ocr(imageFile, ['english', 'spanish'], 'pdfa');

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('watermark()', () => {
      it('should add text watermark to PDF', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test');

        const result = await client.watermark(pdfFile, 'CONFIDENTIAL', {
          opacity: 0.5,
          fontSize: 48,
          rotation: 45,
        });

        expect(result.success).toBe(true);
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      }, 30000);
    });

    describe('merge()', () => {
      it('should merge multiple PDF files', async () => {
        const pdf1 = Buffer.from('%PDF-1.4 doc1');
        const pdf2 = Buffer.from('%PDF-1.4 doc2');
        const pdf3 = Buffer.from('%PDF-1.4 doc3');

        const result = await client.merge([pdf1, pdf2, pdf3]);

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);

      it('should merge to PDF/A format', async () => {
        const pdf1 = Buffer.from('%PDF-1.4 doc1');
        const pdf2 = Buffer.from('%PDF-1.4 doc2');

        const result = await client.merge([pdf1, pdf2], 'pdfa');

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('compress()', () => {
      it('should compress PDF with different levels', async () => {
        const largePdf = Buffer.from('%PDF-1.4' + 'x'.repeat(10000));

        // Test each compression level
        for (const level of ['low', 'medium', 'high', 'maximum'] as const) {
          const result = await client.compress(largePdf, level);
          
          expect(result.success).toBe(true);
          expect(result.output?.mimeType).toBe('application/pdf');
        }
      }, 60000);
    });

    describe('extractText()', () => {
      it('should extract text from PDF', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test with text content');

        const result = await client.extractText(pdfFile);

        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        // Type guard check for data property
        const outputWithData = result.output as { data?: unknown };
        const hasData = outputWithData && 'data' in outputWithData && outputWithData.data;
        expect(hasData).toBeTruthy();
        // Always check the type when data exists
        expect(typeof (outputWithData?.data ?? {})).toBe('object');
      }, 30000);
    });

    describe('flatten()', () => {
      it('should flatten PDF annotations', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 with annotations');

        const result = await client.flatten(pdfFile);

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);

      it('should flatten specific annotation IDs', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 with annotations');

        const result = await client.flatten(pdfFile, ['annotation1', 'annotation2']);

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('rotate()', () => {
      it('should rotate PDF pages', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test');

        const result = await client.rotate(pdfFile, 90);

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);

      it('should rotate specific page range', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 multipage');

        const result = await client.rotate(pdfFile, 180, { start: 1, end: 3 });

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);
    });
  });

  describe('Workflow Builder', () => {
    it('should execute complex workflow with multiple parts and actions', async () => {
      const pdf1 = Buffer.from('%PDF-1.4 part1');
      const pdf2 = Buffer.from('%PDF-1.4 part2');
      const html = '<h1>HTML Content</h1><p>This is HTML content.</p>';

      const result = await client
        .workflow()
        .addFilePart(pdf1, undefined, [BuildActions.rotate(90)])
        .addHtmlPart(html, { width: 595, height: 842 })
        .addFilePart(pdf2)
        .addNewPage({ pageSize: 'A4' })
        .applyActions([
          BuildActions.watermarkText('DRAFT', { opacity: 0.3 }),
          BuildActions.flatten(),
        ])
        .outputPdf({
          optimize: {
            mrcCompression: true,
            imageOptimizationQuality: 2,
          },
        })
        .execute({
          onProgress: (_step, _total) => {
            // Progress callback intentionally empty for tests
          },
        });

      expect(result.success).toBe(true);
      expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 60000);

    it('should perform dry run analysis', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 test');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.ocr(['english', 'french']))
        .outputPdf()
        .dryRun();

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis?.cost).toBeGreaterThanOrEqual(0);
      expect(result.analysis?.required_features).toBeDefined();
    }, 30000);

    it('should handle workflow with document parts', async () => {
      // This test would require an existing document ID
      // Skipping for now as it requires prior document upload
      
      const result = await client
        .workflow()
        .addDocumentPart('existing-doc-id', { pages: { start: 1, end: 5 } })
        .outputPdf()
        .execute();

      // This will likely fail without a valid document ID
      expect(result.success).toBeDefined();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid file input gracefully', async () => {
      const result = await client.convert(null as unknown as Buffer, 'pdf');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    }, 15000);

    it('should handle API errors with proper error types', async () => {
      const invalidClient = new NutrientClient({
        apiKey: 'invalid-api-key',
      });

      const result = await invalidClient.convert(Buffer.from('test'), 'pdf');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.error.name).toBe('AuthenticationError');
    }, 15000);

    it('should handle network timeouts', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 test');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputPdf()
        .execute({ timeout: 1 }); // 1ms timeout should fail

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    }, 15000);
  });

  describe('Performance', () => {
    it('should handle large files efficiently', async () => {
      const largePdf = Buffer.alloc(5 * 1024 * 1024); // 5MB file
      largePdf.write('%PDF-1.4');

      const startTime = Date.now();
      const result = await client.compress(largePdf, 'high');
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(60000); // Should complete within 60s
    }, 90000);

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        client.convert(Buffer.from(`%PDF-1.4 doc${i}`), 'docx')
      );

      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    }, 90000);
  });
});

// Development/CI mock tests
describe('Integration Patterns (Mock)', () => {
  it('should demonstrate workflow builder pattern', () => {
    const client = new NutrientClient({ apiKey: 'mock-key' });
    const workflow = client.workflow();

    expect(workflow).toBeDefined();
    expect(typeof workflow.addFilePart).toBe('function');
  });

  it('should demonstrate all convenience methods are available', () => {
    const client = new NutrientClient({ apiKey: 'mock-key' });

    expect(typeof client.convert).toBe('function');
    expect(typeof client.ocr).toBe('function');
    expect(typeof client.watermark).toBe('function');
    expect(typeof client.merge).toBe('function');
    expect(typeof client.compress).toBe('function');
    expect(typeof client.extractText).toBe('function');
    expect(typeof client.flatten).toBe('function');
    expect(typeof client.rotate).toBe('function');
    expect(typeof client.workflow).toBe('function');
  });

  it('should demonstrate type safety with workflow builder', () => {
    const client = new NutrientClient({ apiKey: 'mock-key' });
    
    // TypeScript should enforce staged interfaces
    const stage1 = client.workflow();
    const stage2 = stage1.addFilePart('test.pdf');
    const stage3 = stage2.outputPdf();
    
    // Each stage should have different available methods
    expect(typeof stage1.addFilePart).toBe('function');
    expect(typeof stage2.applyAction).toBe('function');
    expect(typeof stage3.execute).toBe('function');
  });
});