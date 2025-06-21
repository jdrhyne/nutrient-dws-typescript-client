/**
 * Integration tests for Build API methods
 * These tests use the actual API when NUTRIENT_API_KEY is provided
 */

import { NutrientClient, BuildActions, BuildOutputs } from '../index';
import type { components } from '../types/nutrient-api';
import * as fs from 'fs/promises';
import * as path from 'path';

// Skip integration tests if no API key is provided
const API_KEY = process.env.NUTRIENT_API_KEY;
const shouldRunIntegrationTests = API_KEY && !process.env.CI;

// Test files setup
const TEST_FILES_DIR = path.join(__dirname, 'test-files');
const TEST_PDF = path.join(TEST_FILES_DIR, 'test.pdf');
const TEST_DOCX = path.join(TEST_FILES_DIR, 'test.docx');
const TEST_HTML = '<h1>Test Document</h1><p>This is a test document for integration testing.</p>';

// Helper to create test files
async function setupTestFiles(): Promise<void> {
  if (!shouldRunIntegrationTests) return;

  try {
    await fs.mkdir(TEST_FILES_DIR, { recursive: true });

    // Create a simple PDF (just a text file for testing)
    await fs.writeFile(TEST_PDF, 'Test PDF content');

    // Create a simple DOCX (just a text file for testing)
    await fs.writeFile(TEST_DOCX, 'Test DOCX content');
  } catch (error) {
    console.error('Failed to setup test files:', error);
  }
}

// Helper to cleanup test files
async function cleanupTestFiles(): Promise<void> {
  if (!shouldRunIntegrationTests) return;

  try {
    await fs.rm(TEST_FILES_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to cleanup test files:', error);
  }
}

describe('Build API Integration Tests', () => {
  let client: NutrientClient;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      // Integration tests skipped - NUTRIENT_API_KEY not provided or running in CI
      return;
    }

    await setupTestFiles();

    client = new NutrientClient({
      apiKey: API_KEY,
      baseUrl: process.env.NUTRIENT_BASE_URL,
    });
  });

  afterAll(async () => {
    await cleanupTestFiles();
  });

  describe('build().addFile()', () => {
    it('should process a single PDF file', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addFile(TEST_PDF)
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
      expect(result.size).toBeGreaterThan(0);
    }, 30000);

    it('should process a file with page range', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addFile(TEST_PDF, {
          pages: { start: 0, end: 0 }, // First page only
        })
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    }, 30000);

    it('should handle file from URL', async () => {
      if (!shouldRunIntegrationTests) return;

      // Using a public PDF for testing
      const result = await client
        .build()
        .addFile('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);
  });

  describe('build().addHtml()', () => {
    it('should convert HTML to PDF', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml(TEST_HTML)
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
      expect(result.size).toBeGreaterThan(0);
    }, 30000);

    it('should handle HTML with custom layout', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml(TEST_HTML, {
          layout: {
            size: 'A4',
            orientation: 'landscape',
            margin: { left: 20, right: 20, top: 20, bottom: 20 },
          },
        })
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    }, 30000);
  });

  describe('build().addNewPages()', () => {
    it('should add blank pages to document', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addNewPages(3, {
          layout: { size: 'Letter' },
        })
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);
  });

  describe('Build Actions', () => {
    describe('OCR Action', () => {
      it('should perform OCR on a document', async () => {
        if (!shouldRunIntegrationTests) return;

        const result = await client
          .build()
          .addFile(TEST_PDF)
          .withActions([BuildActions.ocr('english')])
          .setOutput(BuildOutputs.pdf())
          .execute<Blob>();

        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
      }, 45000); // OCR can take longer

      it('should extract text with OCR', async () => {
        if (!shouldRunIntegrationTests) return;

        const result = await client
          .build()
          .addFile(TEST_PDF)
          .setOutput(
            BuildOutputs.jsonContent({
              plainText: true,
              language: 'english',
            }),
          )
          .execute<components['schemas']['JSONContentOutput']>();

        expect(result).toHaveProperty('plainText');
        expect(typeof result.plainText).toBe('string');
      }, 45000);
    });

    describe('Watermark Actions', () => {
      it('should add text watermark', async () => {
        if (!shouldRunIntegrationTests) return;

        const result = await client
          .build()
          .addFile(TEST_PDF)
          .withActions([
            BuildActions.watermarkText('CONFIDENTIAL', {
              width: { value: 50, unit: '%' },
              height: { value: 50, unit: '%' },
              opacity: 0.3,
              fontSize: 48,
              fontColor: '#FF0000',
              rotation: 45,
            }),
          ])
          .setOutput(BuildOutputs.pdf())
          .execute<Blob>();

        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
      }, 30000);
    });

    describe('Rotation Action', () => {
      it('should rotate pages', async () => {
        if (!shouldRunIntegrationTests) return;

        const result = await client
          .build()
          .addFile(TEST_PDF)
          .withActions([BuildActions.rotate(90)])
          .setOutput(BuildOutputs.pdf())
          .execute<Blob>();

        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
      }, 30000);
    });

    describe('Flatten Action', () => {
      it('should flatten annotations', async () => {
        if (!shouldRunIntegrationTests) return;

        const result = await client
          .build()
          .addFile(TEST_PDF)
          .withActions([BuildActions.flatten()])
          .setOutput(BuildOutputs.pdf())
          .execute<Blob>();

        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
      }, 30000);
    });

    describe('Redaction Actions', () => {
      it('should create and apply text redactions', async () => {
        if (!shouldRunIntegrationTests) return;

        const result = await client
          .build()
          .addHtml('<p>My email is test@example.com and phone is 555-1234</p>')
          .withActions([
            BuildActions.createRedactionsPreset('email-address'),
            BuildActions.applyRedactions(),
          ])
          .setOutput(BuildOutputs.pdf())
          .execute<Blob>();

        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
      }, 30000);
    });
  });

  describe('Output Formats', () => {
    it('should output as PDF', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml(TEST_HTML)
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);

    it('should output as PDF/A', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml(TEST_HTML)
        .setOutput(
          BuildOutputs.pdfa({
            conformance: 'pdfa-2b',
          }),
        )
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);

    it('should output as images', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml(TEST_HTML)
        .setOutput(
          BuildOutputs.image({
            format: 'png',
            dpi: 150,
          }),
        )
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      // Result should be a ZIP containing images
      expect(result.type).toContain('zip');
    }, 30000);

    it('should extract content as JSON', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml('<table><tr><td>Name</td><td>Value</td></tr></table>')
        .setOutput(
          BuildOutputs.jsonContent({
            plainText: true,
            tables: true,
          }),
        )
        .execute<components['schemas']['JSONContentOutput']>();

      expect(result).toHaveProperty('plainText');
      expect(result).toHaveProperty('tables');
    }, 30000);

    it('should output as Office format', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml(TEST_HTML)
        .setOutput(BuildOutputs.office('docx'))
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('officedocument');
    }, 30000);
  });

  describe('Complex Workflows', () => {
    it('should merge multiple files', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml('<h1>Page 1</h1>')
        .addNewPages(1)
        .addHtml('<h1>Page 3</h1>')
        .setOutput(BuildOutputs.pdf())
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    }, 30000);

    it('should apply multiple actions', async () => {
      if (!shouldRunIntegrationTests) return;

      const result = await client
        .build()
        .addHtml(TEST_HTML)
        .withActions([
          BuildActions.watermarkText('DRAFT', {
            width: { value: 100, unit: 'pt' },
            height: { value: 100, unit: 'pt' },
            opacity: 0.2,
          }),
          BuildActions.rotate(180),
        ])
        .setOutput(
          BuildOutputs.pdf({
            optimize: { linearize: true },
          }),
        )
        .execute<Blob>();

      expect(result).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Facade Methods', () => {
    it('should convert using facade method', async () => {
      if (!shouldRunIntegrationTests) return;

      const testBlob = new Blob([TEST_HTML], { type: 'text/html' });
      const result = await client.convert(testBlob, 'pdf');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);

    it('should merge using facade method', async () => {
      if (!shouldRunIntegrationTests) return;

      const blob1 = new Blob(['<h1>Doc 1</h1>'], { type: 'text/html' });
      const blob2 = new Blob(['<h1>Doc 2</h1>'], { type: 'text/html' });

      const result = await client.merge([blob1, blob2]);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);

    it('should compress using facade method', async () => {
      if (!shouldRunIntegrationTests) return;

      const testBlob = new Blob([TEST_HTML], { type: 'text/html' });
      const result = await client.compress(testBlob, 'high');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);

    it('should watermark using facade method', async () => {
      if (!shouldRunIntegrationTests) return;

      const testBlob = new Blob([TEST_HTML], { type: 'text/html' });
      const result = await client.watermark(testBlob, 'WATERMARK', {
        opacity: 0.5,
        fontSize: 36,
      });

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toContain('pdf');
    }, 30000);

    it('should extract text using facade method', async () => {
      if (!shouldRunIntegrationTests) return;

      const testBlob = new Blob(['<p>Extract this text</p>'], { type: 'text/html' });
      const result = await client.extractText(testBlob, {
        structuredText: true,
      });

      expect(result).toHaveProperty('plainText');
      expect(result.plainText).toContain('Extract this text');
    }, 30000);
  });

  describe('Cost Analysis', () => {
    it('should analyze build cost', async () => {
      if (!shouldRunIntegrationTests) return;

      const builder = client
        .build()
        .addFile(TEST_PDF)
        .withActions([
          BuildActions.ocr('english'),
          BuildActions.watermarkText('TEST', {
            width: { value: 100, unit: 'pt' },
            height: { value: 100, unit: 'pt' },
          }),
        ]);

      const analysis = await client.analyzeBuild(builder.getInstructions());

      expect(analysis).toHaveProperty('cost');
      expect(typeof analysis.cost).toBe('number');
      expect(analysis.cost).toBeGreaterThanOrEqual(0);

      // Check if required_features exists
      expect(
        analysis.required_features === undefined || typeof analysis.required_features === 'object',
      ).toBe(true);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid file input', async () => {
      if (!shouldRunIntegrationTests) return;

      await expect(
        client.build().addFile('nonexistent-file.pdf').setOutput(BuildOutputs.pdf()).execute(),
      ).rejects.toThrow();
    }, 15000);

    it('should handle invalid API key', async () => {
      if (!shouldRunIntegrationTests) return;

      const invalidClient = new NutrientClient({
        apiKey: 'invalid-key-12345',
      });

      await expect(
        invalidClient.build().addHtml(TEST_HTML).setOutput(BuildOutputs.pdf()).execute(),
      ).rejects.toThrow();
    }, 15000);

    it('should handle malformed build instructions', async () => {
      if (!shouldRunIntegrationTests) return;

      await expect(
        client
          .build()
          // No parts added
          .setOutput(BuildOutputs.pdf())
          .execute(),
      ).rejects.toThrow('At least one part must be added');
    }, 15000);
  });
});

// Unit test stubs for CI environments
describe('Build API Unit Test Stubs', () => {
  it('should create build instructions', () => {
    const client = new NutrientClient({ apiKey: 'test-key' });
    const builder = client.build();

    builder.addFile('test.pdf').addHtml('<h1>Test</h1>').addNewPages(2);

    const instructions = builder.getInstructions();
    expect(instructions.parts).toHaveLength(3);
  });

  it('should create various actions', () => {
    const ocrAction = BuildActions.ocr('english');
    expect(ocrAction.type).toBe('ocr');

    const watermarkAction = BuildActions.watermarkText('TEST', {
      width: { value: 100, unit: 'pt' },
      height: { value: 50, unit: 'pt' },
    });
    expect(watermarkAction.type).toBe('watermark');
    expect(watermarkAction.text).toBe('TEST');
  });

  it('should create output configurations', () => {
    const pdfOutput = BuildOutputs.pdf({ optimize: { linearize: true } });
    expect(pdfOutput.type).toBe('pdf');
    expect(pdfOutput.optimize?.linearize).toBe(true);

    const imageOutput = BuildOutputs.image({ format: 'png', dpi: 300 });
    expect(imageOutput.type).toBe('image');
    expect(imageOutput.format).toBe('png');
  });
});
