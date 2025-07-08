/**
 * Advanced E2E tests for NutrientClient
 * These tests cover all API methods not included in integration.test.ts
 * 
 * To run these tests with a live API:
 * 1. Set NUTRIENT_API_KEY environment variable
 * 2. Run: NUTRIENT_API_KEY=your_key RUN_INTEGRATION_TESTS=true npm test -- e2e-advanced.test
 */

import { NutrientClient } from '../client';
import { BuildActions } from '../build';
import type { NutrientClientOptions } from '../types';
import { ResultValidator, samplePDF, samplePNG, TestDocumentGenerator } from './helpers';
import 'dotenv/config';

// Skip integration tests in CI/automated environments unless explicitly enabled with valid API key
const shouldRunIntegrationTests = Boolean(process.env["NUTRIENT_API_KEY"]);

// Use conditional describe based on environment
const describeE2E = shouldRunIntegrationTests ? describe : describe.skip;

describe('Advanced E2E Tests with Live API', () => {
  let client: NutrientClient;
  let testSensitivePDF: Buffer;
  let testTablePDF: Buffer;
  let testHtmlContent: Buffer;
  let testXfdfContent: Buffer;
  let testInstantJsonContent: Buffer;

  beforeAll(() => {
    const options: NutrientClientOptions = {
      apiKey: process.env["NUTRIENT_API_KEY"] ?? '',
      baseUrl: process.env["NUTRIENT_BASE_URL"] ?? 'https://api.nutrient.io',
    };

    client = new NutrientClient(options);

    // Test PDF with sensitive data
    testSensitivePDF = TestDocumentGenerator.generatePdfWithSensitiveData();

    // Test PDF with table
    testTablePDF = TestDocumentGenerator.generatePdfWithTable();

    // Test HTML content
    testHtmlContent = TestDocumentGenerator.generateHtmlContent();

    // Test XFDF content for annotations
    testXfdfContent = TestDocumentGenerator.generateXfdf();

    // Test Instant JSON content
    testInstantJsonContent = TestDocumentGenerator.generateInstantJson();
  });

  describe('Redaction Operations', () => {
    describe('Text-based Redactions', () => {
      it('should create and apply text redactions', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsText('123-45-6789'),
            BuildActions.createRedactionsText('john.doe@example.com'),
            BuildActions.applyRedactions(),
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });

    describe('Regex-based Redactions', () => {
      it('should create and apply regex redactions for SSN pattern', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}'), // SSN pattern
            BuildActions.applyRedactions()
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);

      it('should apply multiple regex patterns', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'), // Email
            BuildActions.createRedactionsRegex('\\(\\d{3}\\) \\d{3}-\\d{4}'), // Phone
            BuildActions.createRedactionsRegex('\\d{4}-\\d{4}-\\d{4}-\\d{4}'), // Credit card
            BuildActions.applyRedactions()
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });

    describe('Preset Redactions', () => {
      it('should apply preset redactions for common patterns', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .applyActions([
            BuildActions.createRedactionsPreset('email-address'),
            BuildActions.createRedactionsPreset('international-phone-number'),
            BuildActions.createRedactionsPreset('social-security-number'),
            BuildActions.applyRedactions()
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });
  });

  describe('Image Watermarking', () => {
    it('should add image watermark to PDF', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .applyAction(BuildActions.watermarkImage(samplePNG, {
          opacity: 0.3,
          width: { value: 200, unit: "pt" },
          height: { value: 100, unit: "pt" },
        }))
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 30000);

    it('should add image watermark with custom positioning', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .applyAction(BuildActions.watermarkImage(samplePNG, {
          opacity: 0.5,
          width: { value: 150, unit: "pt" },
          height: { value: 150, unit: "pt" },
          top: { value: 100, unit: "pt" },
          left: { value: 100, unit: "pt" },
        }))
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 30000);
  });

  describe('HTML to PDF Conversion', () => {
    it('should convert HTML to PDF with default settings', async () => {
      const result = await client
        .workflow()
        .addHtmlPart(testHtmlContent)
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 30000);

    it('should convert HTML with custom page size and margins', async () => {
      const result = await client
        .workflow()
        .addHtmlPart(testHtmlContent)
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 30000);

    it('should convert HTML and apply actions', async () => {
      const result = await client
        .workflow()
        .addHtmlPart(testHtmlContent)
        .applyActions([
          BuildActions.watermarkText('DRAFT', { opacity: 0.3 }),
          BuildActions.flatten()
        ])
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 30000);

    it('should combine HTML with existing PDF', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .addHtmlPart(testHtmlContent)
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 30000);
  });

  describe('Annotation Operations', () => {
    describe('XFDF Application', () => {
      it('should apply XFDF annotations to PDF', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .applyAction(BuildActions.applyXfdf(testXfdfContent))
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);

      it('should apply XFDF and flatten annotations', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .applyActions([
            BuildActions.applyXfdf(testXfdfContent),
            BuildActions.flatten()
          ])
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });

    describe('Instant JSON Application', () => {
      it('should apply Instant JSON annotations', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .applyAction(BuildActions.applyInstantJson(testInstantJsonContent))
          .outputPdf()
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });
  });

  describe('Advanced PDF Options', () => {
    describe('PDF Security', () => {
      it('should create password-protected PDF', async () => {
        const result = await client
          .workflow()
          .addFilePart(testSensitivePDF)
          .outputPdf({
            user_password: 'user123',
            owner_password: 'owner456'
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);

      it('should set PDF permissions', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdf({
            owner_password: 'owner123',
            user_permissions: ['printing', 'extract', 'fill_forms']
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });

    describe('PDF Metadata', () => {
      it('should set PDF metadata', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdf({
            metadata: {
              title: 'Test Document',
              author: 'Test Author',
            }
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });

    // FIXME: API network issue with optimizing PDFs
    // eslint-disable-next-line jest/no-disabled-tests
    describe.skip('PDF Optimization', () => {
      it('should optimize PDF with advanced settings', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdf({
            optimize: {
              mrcCompression: true,
              imageOptimizationQuality: 3,
              linearize: true,
            }
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });

    describe('PDF/A Advanced Options', () => {
      it('should create PDF/A with specific conformance level', async () => {
        const result = await client
          .workflow()
          .addFilePart(testTablePDF)
          .outputPdfA({
            conformance: 'pdfa-2a',
            vectorization: true,
            rasterization: true
          })
          .execute();

        expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
      }, 30000);
    });
  });

  describe('Office Format Outputs', () => {
    it('should convert PDF to Excel (XLSX)', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputOffice('xlsx')
        .execute();

      expect(() => ResultValidator.validateOfficeOutput(result, 'xlsx')).not.toThrow()
    }, 30000);

    it('should convert PDF to PowerPoint (PPTX)', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputOffice('pptx')
        .execute();

      expect(() => ResultValidator.validateOfficeOutput(result, 'pptx')).not.toThrow()
    }, 30000);
  });

  describe('Image Output Options', () => {
    it('should convert PDF to JPEG with custom DPI', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputImage('jpeg', {
          dpi: 300,
        })
        .execute();

      expect(() => ResultValidator.validateImageOutput(result, 'jpeg')).not.toThrow()
    }, 30000);

    // TODO: Issue with DWS upstream which doesn't allow rescaling but not talked about in docs
    it.skip('should convert PDF to PNG with custom dimensions', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputImage('png', {
          width: 1920,
          height: 1080,
        })
        .execute();

      expect(() => ResultValidator.validateImageOutput(result, 'png')).not.toThrow()
    }, 30000);

    it('should convert PDF to WebP format', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputImage('webp', {
          height: 300,
        })
        .execute();

      expect(() => ResultValidator.validateImageOutput(result, 'webp')).not.toThrow()
    }, 30000);
  });

  describe('JSON Content Extraction', () => {
    it('should extract tables from PDF', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputJson({
          tables: true
        })
        .execute();

      expect(() => ResultValidator.validateJsonOutput(result)).not.toThrow()
    }, 30000);

    it('should extract key-value pairs', async () => {
      const result = await client
        .workflow()
        .addFilePart(testTablePDF)
        .outputJson({
          keyValuePairs: true
        })
        .execute();

      expect(() => ResultValidator.validateJsonOutput(result)).not.toThrow()
    }, 30000);

    it('should extract specific page range content', async () => {
      const result = await client
        .workflow()
        .addFilePart(testSensitivePDF, {
          pages: { start: 0, end: 0 }
        })
        .outputJson()
        .execute();

      expect(() => ResultValidator.validateJsonOutput(result)).not.toThrow()
    }, 30000);
  });

  // TODO: Network issue when running optimization
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('Complex Multi-Format Workflows', () => {
    it('should combine HTML, PDF, and images with various actions', async () => {
      const result = await client
        .workflow()
        // Add existing PDF
        .addFilePart(testSensitivePDF, undefined, [BuildActions.rotate(90)])
        // Add HTML content
        .addHtmlPart(testHtmlContent)
        // Add image as new page
        .addFilePart(samplePNG)
        // Add blank page
        .addNewPage({ layout: { size: 'A4' } })
        // Apply global actions
        .applyActions([
          BuildActions.watermarkText('CONFIDENTIAL', {
            opacity: 0.2,
            fontSize: 60,
            rotation: 45
          }),
          BuildActions.flatten()
        ])
        .outputPdf({
          optimize: { imageOptimizationQuality: 2 }
        })
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 60000);

    it('should perform document assembly with redactions', async () => {
      const pdf1 = TestDocumentGenerator.generateSimplePdf("SSN: 123-45-6789");
      const pdf2 = TestDocumentGenerator.generateSimplePdf("email: secret@example.com");

      const result = await client
        .workflow()
        // First document with redactions
        .addFilePart(pdf1, undefined, [
          BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}'),
          BuildActions.applyRedactions()
        ])
        // Second document with different redactions
        .addFilePart(pdf2, undefined, [
          BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
          BuildActions.applyRedactions()
        ])
        // Apply watermark to entire document
        .applyAction(BuildActions.watermarkText('REDACTED COPY', {
          opacity: 0.3,
          fontSize: 48,
          fontColor: '#FF0000'
        }))
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 45000);
  });

  describe('Error Scenarios', () => {
    it('should handle invalid HTML content gracefully', async () => {
      const invalidHtml = Buffer.from('<html><body><unclosed-tag>Invalid HTML');

      const result = await client
        .workflow()
        .addHtmlPart(invalidHtml)
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validateErrorResponse(result)).toThrow()
    }, 30000);

    it('should handle invalid XFDF content', async () => {
      const invalidXfdf = Buffer.from('<?xml version="1.0"?><invalid-xfdf>');

      const result = await client
        .workflow()
        .addFilePart(Buffer.from('%PDF-1.4'))
        .applyAction(BuildActions.applyXfdf(invalidXfdf))
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validateErrorResponse(result)).not.toThrow()
    }, 30000);

    it('should handle invalid Instant JSON', async () => {
      const invalidJson = '{ invalid json }';

      const result = await client
        .workflow()
        .addFilePart(Buffer.from('%PDF-1.4'))
        .applyAction(BuildActions.applyInstantJson(invalidJson))
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validateErrorResponse(result)).not.toThrow()
    }, 30000);
  });

  describe('Performance and Limits', () => {
    it('should handle workflows with many actions', async () => {
      const actions = [];
      // Add multiple watermarks
      for (let i = 0; i < 5; i++) {
        actions.push(BuildActions.watermarkText(`Layer ${i + 1}`, {
          opacity: 0.1,
          fontSize: 20 + i * 10,
          rotation: i * 15
        }));
      }
      // Add multiple redaction patterns
      actions.push(
        BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}'),
        BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'),
        BuildActions.applyRedactions(),
        BuildActions.flatten()
      );

      const result = await client
        .workflow()
        .addFilePart(samplePDF)
        .applyActions(actions)
        .outputPdf()
        .execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 60000);

    it('should handle workflows with many parts', async () => {
      const parts: Buffer[] = [];
      for (let i = 0; i < 10; i++) {
        parts.push(TestDocumentGenerator.generateSimplePdf(`Page ${i + 1}`));
      }

      let workflow = client.workflow();
      for (const part of parts) {
        workflow = workflow.addFilePart(part);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const result = await (workflow as any).outputPdf().execute();

      expect(() => ResultValidator.validatePdfOutput(result)).not.toThrow()
    }, 90000);
  });
})