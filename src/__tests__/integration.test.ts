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
import type { NutrientClientOptions, OutputTypeMap } from '../types';
import 'dotenv/config';
import { sampleDOCX, samplePDF, samplePNG, TestDocumentGenerator } from './helpers';
import { getPdfPageCount } from '../inputs';

// Skip integration tests in CI/automated environments unless explicitly enabled with valid API key
const shouldRunIntegrationTests = Boolean(process.env['NUTRIENT_API_KEY']);

// Use conditional describe based on environment
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip;

describeIntegration('Integration Tests with Live API', () => {
  let client: NutrientClient;

  beforeAll(() => {
    const options: NutrientClientOptions = {
      apiKey: process.env['NUTRIENT_API_KEY'] ?? '',
      baseUrl: process.env['NUTRIENT_BASE_URL'] ?? 'https://api.nutrient.io',
    };

    client = new NutrientClient(options);
  });

  describe('Account and Authentication Methods', () => {
    describe('getAccountInfo()', () => {
      it('should retrieve account information', async () => {
        const accountInfo = await client.getAccountInfo();

        expect(accountInfo).toBeDefined();
        expect(accountInfo.subscriptionType).toBeDefined();
        expect(typeof accountInfo.subscriptionType).toBe('string');
        expect(accountInfo.apiKeys).toBeDefined();
      }, 30000);
    });

    describe('createToken()', () => {
      it('should create a new authentication token', async () => {
        const tokenParams = {
          expirationTime: 0,
        };

        const token = await client.createToken(tokenParams);

        expect(token).toBeDefined();
        expect(token.id).toBeDefined();
        expect(typeof token.id).toBe('string');
        expect(token.accessToken).toBeDefined();
        expect(typeof token.accessToken).toBe('string');

        // Clean up - delete the token we just created
        await client.deleteToken(token.id as string);
      }, 30000);
    });
  });

  describe('Document Processing Methods', () => {
    describe('signPdf()', () => {
      it('should sign a PDF document', async () => {
        const result = await client.signPdf(samplePDF);

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);

      it('should sign a PDF with custom image', async () => {
        const result = await client.signPdf(samplePDF, undefined, {
          image: samplePNG,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('aiRedact()', () => {
      it('should redact sensitive information using AI', async () => {
        const sensitiveDocument = TestDocumentGenerator.generatePdfWithSensitiveData();
        const result = await client.createRedactionsAI(sensitiveDocument, 'Redact Email');

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
        expect(result.filename).toBe('output.pdf');
      }, 60000);

      it('should redact specific pages', async () => {
        // Test with specific pages
        const result = await client.createRedactionsAI(samplePDF, 'React Email', 'apply', {
          start: 1,
          end: 2,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 60000);

      it('should redact with page range', async () => {
        // Test with page range
        const result = await client.createRedactionsAI(samplePDF, 'React Email', 'stage', {
          start: 1,
          end: 3,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 60000);
    });
  });

  describe('Convenience Methods', () => {
    describe('convert()', () => {
      const cases: {
        input: Buffer;
        inputType: Exclude<keyof OutputTypeMap, 'json-content'>;
        outputType: Exclude<keyof OutputTypeMap, 'json-content'>;
        expected: string;
      }[] = [
        { input: samplePDF, inputType: 'pdf', outputType: 'pdfa', expected: 'application/pdf' },
        { input: samplePDF, inputType: 'pdf', outputType: 'pdfua', expected: 'application/pdf' },
        { input: samplePDF, inputType: 'pdf', outputType: 'pdf', expected: 'application/pdf' },
        {
          input: samplePDF,
          inputType: 'pdf',
          outputType: 'docx',
          expected: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
        {
          input: samplePDF,
          inputType: 'pdf',
          outputType: 'xlsx',
          expected: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        {
          input: samplePDF,
          inputType: 'pdf',
          outputType: 'pptx',
          expected: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        },
        { input: sampleDOCX, inputType: 'docx', outputType: 'pdf', expected: 'application/pdf' },
        { input: samplePDF, inputType: 'pdf', outputType: 'png', expected: 'image/png' },
        { input: samplePDF, inputType: 'pdf', outputType: 'jpeg', expected: 'image/jpeg' },
        // {input: samplePDF, inputType: 'pdf', outputType: 'jpg', expected: 'image/jpeg'}, // FIXME: Upstream return image/jpg which is not a real type
        { input: samplePDF, inputType: 'pdf', outputType: 'webp', expected: 'image/webp' },
        // {input: samplePDF, inputType: 'pdf', outputType: 'html', expected: 'text/html'}, // FIXME: 500 error upstream
        { input: samplePDF, inputType: 'pdf', outputType: 'markdown', expected: 'text/markdown' },
      ];
      it.each(cases)(
        'should convert $inputType to $outputType',
        async (testCase) => {
          const result = await client.convert(testCase.input, testCase.outputType);

          expect(result).toBeDefined();
          if (testCase.outputType !== 'markdown' && testCase.outputType !== 'html') {
            const typedResult = result as OutputTypeMap[Exclude<
              keyof OutputTypeMap,
              'json-content' | 'markdown' | 'html'
            >];
            // eslint-disable-next-line jest/no-conditional-expect
            expect(typedResult.buffer).toBeInstanceOf(Uint8Array);
          } else {
            const typedResult = result as OutputTypeMap['markdown' | 'html'];
            // eslint-disable-next-line jest/no-conditional-expect
            expect(typedResult.content).toEqual(expect.any(String));
          }
          expect(result.mimeType).toBe(testCase.expected);
        },
        90000,
      );
    });

    describe('ocr()', () => {
      it('should perform OCR on a scanned document', async () => {
        const result = await client.ocr(samplePNG, 'english');

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);

      it('should support multiple OCR languages', async () => {
        const result = await client.ocr(samplePNG, ['english', 'spanish']);

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('watermarkText()', () => {
      it('should add text watermark to PDF', async () => {
        const result = await client.watermarkText(samplePDF, 'CONFIDENTIAL', {
          opacity: 0.5,
          fontSize: 48,
          rotation: 45,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('watermarkImage()', () => {
      it('should add image watermark to PDF', async () => {
        const result = await client.watermarkImage(samplePDF, samplePNG, {
          opacity: 0.5,
        });

        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('merge()', () => {
      it('should merge multiple PDF files', async () => {
        const result = await client.merge([samplePDF, samplePDF, samplePDF]);
        const pageCount = await getPdfPageCount(samplePDF);
        expect(result).toBeDefined();
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(result.mimeType).toBe('application/pdf');
        await expect(getPdfPageCount(result.buffer)).resolves.toBe(pageCount * 3);
      }, 60000);
    });

    // TODO: Investigate axios connection timeout
    // eslint-disable-next-line jest/no-disabled-tests
    describe.skip('optimize()', () => {
      it('should optimize PDF with different options', async () => {
        // Test different optimization options
        const options = [
          { imageOptimizationQuality: 1 }, // low
          { imageOptimizationQuality: 2 }, // medium
          { imageOptimizationQuality: 3 }, // high
          { imageOptimizationQuality: 4, mrcCompression: true }, // maximum
        ];

        for (const option of options) {
          const result = await client.optimize(samplePDF, option);

          expect(result).toBeDefined();
          expect(result.buffer).toBeInstanceOf(Uint8Array);
          expect(result.mimeType).toBe('application/pdf');
        }
      }, 60000);
    });

    describe('extractText()', () => {
      it('should extract text from PDF', async () => {
        const result = await client.extractText(samplePDF);

        expect(result).toBeDefined();
        // Type guard check for data property
        const hasData = result && 'data' in result && result.data;
        expect(hasData).toBeTruthy();
        // Always check the type when data exists
        expect(typeof (result?.data ?? {})).toBe('object');
      }, 60000);
    });

    describe('flatten()', () => {
      it('should flatten PDF annotations', async () => {
        const result = await client.flatten(samplePDF);

        expect(result).toBeDefined();
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('rotate()', () => {
      it('should rotate PDF pages', async () => {
        const result = await client.rotate(samplePDF, 90);

        expect(result).toBeDefined();
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);

      it('should rotate specific page range', async () => {
        const result = await client.rotate(samplePDF, 180, { start: 1, end: 3 });

        expect(result).toBeDefined();
        expect(result.mimeType).toBe('application/pdf');
      }, 30000);
    });
  });

  describe('Workflow Builder', () => {
    it('should execute complex workflow with multiple parts and actions', async () => {
      const pdf1 = TestDocumentGenerator.generatePdfWithTable();
      const pdf2 = TestDocumentGenerator.generatePdfWithSensitiveData();
      const html = TestDocumentGenerator.generateHtmlContent();

      const result = await client
        .workflow()
        .addFilePart(pdf1, undefined, [BuildActions.rotate(90)])
        .addHtmlPart(html)
        .addFilePart(pdf2)
        .addNewPage({ layout: { size: 'A4' } })
        .applyActions([
          BuildActions.watermarkText('DRAFT', { opacity: 0.3 }),
          BuildActions.flatten(),
        ])
        .outputPdfUA()
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
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyAction(BuildActions.ocr(['english', 'french']))
        .outputPdf()
        .dryRun();

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis?.cost).toBeGreaterThanOrEqual(0);
      expect(result.analysis?.required_features).toBeDefined();
    }, 30000);

    it('should execute workflow with redaction actions', async () => {
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions([
          // Create redactions using text search
          BuildActions.createRedactionsText('confidential', {}, { caseSensitive: false }),
          // Apply the created redactions
          BuildActions.applyRedactions(),
        ])
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 30000);

    it('should execute workflow with regex redaction actions', async () => {
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions([
          // Create redactions using regex pattern
          BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}', {}, { caseSensitive: false }),
          // Apply the created redactions
          BuildActions.applyRedactions(),
        ])
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 30000);

    it('should execute workflow with preset redaction actions', async () => {
      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions([
          // Create redactions using preset pattern
          BuildActions.createRedactionsPreset('email-address'),
          // Apply the created redactions
          BuildActions.applyRedactions(),
        ])
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 30000);

    it('should execute workflow with Instant JSON and XFDF actions', async () => {
      const pdfFile = samplePDF;
      const jsonFile = TestDocumentGenerator.generateInstantJson();
      const xfdfFile = TestDocumentGenerator.generateXfdf();

      // Test applyInstantJson
      const instantJsonResult = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.applyInstantJson(jsonFile))
        .outputPdf()
        .execute();

      expect(instantJsonResult.success).toBe(true);
      expect(instantJsonResult.output?.mimeType).toBe('application/pdf');

      // Test applyXfdf
      const xfdfResult = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.applyXfdf(xfdfFile))
        .outputPdf()
        .execute();

      expect(xfdfResult.success).toBe(true);
      expect(xfdfResult.output?.mimeType).toBe('application/pdf');
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle invalid file input gracefully', async () => {
      await expect(client.convert(null as unknown as Buffer, 'pdf')).rejects.toThrow();
    }, 15000);

    it('should handle API errors with proper error types', async () => {
      const invalidClient = new NutrientClient({
        apiKey: 'invalid-api-key',
      });

      await expect(invalidClient.convert(Buffer.from('test'), 'pdf')).rejects.toThrow(
        'HTTP 401: Unauthorized',
      );
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

    // Core methods
    expect(typeof client.workflow).toBe('function');

    // Document conversion methods
    expect(typeof client.convert).toBe('function');
    expect(typeof client.ocr).toBe('function');
    expect(typeof client.extractText).toBe('function');

    // Document manipulation methods
    expect(typeof client.watermarkText).toBe('function');
    expect(typeof client.watermarkImage).toBe('function');
    expect(typeof client.merge).toBe('function');
    expect(typeof client.optimize).toBe('function');
    expect(typeof client.flatten).toBe('function');
    expect(typeof client.rotate).toBe('function');
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
