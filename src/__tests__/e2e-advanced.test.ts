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
import type { NutrientClientOptions } from '../types/common';
import * as fs from 'fs';
import * as path from 'path';

// Skip integration tests in CI/automated environments unless explicitly enabled with valid API key
const shouldRunIntegrationTests = process.env.NUTRIENT_API_KEY && 
  process.env.NUTRIENT_API_KEY !== 'fake_key' && 
  process.env.NUTRIENT_API_KEY.length > 10 && 
  process.env.RUN_INTEGRATION_TESTS === 'true';

// Use conditional describe based on environment
const describeE2E = shouldRunIntegrationTests ? describe : describe.skip;

describeE2E('Advanced E2E Tests with Live API', () => {
  let client: NutrientClient;
  let testPdfPath: string;
  let testImagePath: string;
  let testHtmlContent: string;
  let testXfdfContent: string;
  let testInstantJsonContent: string;

  beforeAll(() => {
    const options: NutrientClientOptions = {
      apiKey: process.env.NUTRIENT_API_KEY ?? '',
      baseUrl: process.env.NUTRIENT_BASE_URL ?? 'https://api.nutrient.io/v1',
    };

    client = new NutrientClient(options);

    // Setup test paths
    testPdfPath = path.join(__dirname, '../../examples/example.pdf');
    testImagePath = path.join(__dirname, '../../examples/watermark.png');

    // Test HTML content
    testHtmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Document</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            .highlight { background-color: yellow; }
          </style>
        </head>
        <body>
          <h1>Test HTML to PDF Conversion</h1>
          <p>This is a test paragraph with <span class="highlight">highlighted text</span>.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
          <table border="1">
            <tr><th>Header 1</th><th>Header 2</th></tr>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
          </table>
        </body>
      </html>
    `;

    // Test XFDF content for annotations
    testXfdfContent = `<?xml version="1.0" encoding="UTF-8"?>
      <xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
        <annots>
          <highlight page="0" rect="100,100,200,150" color="#FFFF00">
            <contents>Important text</contents>
          </highlight>
          <text page="0" rect="250,250,270,270" color="#FF0000">
            <contents>Note: Review this section</contents>
          </text>
        </annots>
      </xfdf>`;

    // Test Instant JSON content
    testInstantJsonContent = JSON.stringify({
      annotations: [
        {
          type: "pspdfkit/ink",
          pageIndex: 0,
          lines: [
            [
              { x: 100, y: 100 },
              { x: 200, y: 200 },
              { x: 300, y: 100 }
            ]
          ],
          strokeColor: "#0000FF",
          lineWidth: 3
        }
      ]
    });
  });

  describe('Redaction Operations', () => {
    describe('Text-based Redactions', () => {
      it('should create and apply text redactions', async () => {
        const pdfFile = fs.existsSync(testPdfPath) 
          ? fs.readFileSync(testPdfPath) 
          : Buffer.from('%PDF-1.4 Test document with sensitive SSN: 123-45-6789 and email: test@example.com');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyActions([
            BuildActions.createRedactionsText(['123-45-6789', 'test@example.com']),
            BuildActions.applyRedactions()
          ])
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);
    });

    describe('Regex-based Redactions', () => {
      it('should create and apply regex redactions for SSN pattern', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 SSN examples: 123-45-6789, 987-65-4321, invalid: 123456789');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyActions([
            BuildActions.createRedactionsRegex('\\d{3}-\\d{2}-\\d{4}'), // SSN pattern
            BuildActions.applyRedactions()
          ])
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      }, 30000);

      it('should apply multiple regex patterns', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 Email: john@example.com, Phone: (555) 123-4567, CC: 4111-1111-1111-1111');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyActions([
            BuildActions.createRedactionsRegex('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'), // Email
            BuildActions.createRedactionsRegex('\\(\\d{3}\\) \\d{3}-\\d{4}'), // Phone
            BuildActions.createRedactionsRegex('\\d{4}-\\d{4}-\\d{4}-\\d{4}'), // Credit card
            BuildActions.applyRedactions()
          ])
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
      }, 30000);
    });

    describe('Preset Redactions', () => {
      it('should apply preset redactions for common patterns', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 Various sensitive data types present');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyActions([
            BuildActions.createRedactionsPreset('email'),
            BuildActions.createRedactionsPreset('phone'),
            BuildActions.createRedactionsPreset('ssn'),
            BuildActions.applyRedactions()
          ])
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      }, 30000);
    });
  });

  describe('Image Watermarking', () => {
    it('should add image watermark to PDF', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 test document');
      const watermarkImage = fs.existsSync(testImagePath)
        ? fs.readFileSync(testImagePath)
        : Buffer.from('PNG-fake-image-data');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.watermarkImage(watermarkImage, {
          opacity: 0.3,
          width: 200,
          height: 100,
          horizontalPosition: 'center',
          verticalPosition: 'middle'
        }))
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
    }, 30000);

    it('should add image watermark with custom positioning', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 test document');
      const watermarkImage = Buffer.from('PNG-fake-image-data');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.watermarkImage(watermarkImage, {
          opacity: 0.5,
          width: 150,
          height: 150,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          horizontalOffset: -20,
          verticalOffset: 20
        }))
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
    }, 30000);

    it('should tile image watermark across pages', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 multipage document');
      const watermarkImage = Buffer.from('PNG-fake-image-data');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .applyAction(BuildActions.watermarkImage(watermarkImage, {
          opacity: 0.2,
          width: 100,
          height: 100,
          tileWatermark: true
        }))
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('HTML to PDF Conversion', () => {
    it('should convert HTML to PDF with default settings', async () => {
      const result = await client
        .workflow()
        .addHtmlPart(testHtmlContent)
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      expect(result.output?.mimeType).toBe('application/pdf');
    }, 30000);

    it('should convert HTML with custom page size and margins', async () => {
      const result = await client
        .workflow()
        .addHtmlPart(testHtmlContent, {
          width: 595, // A4 width in points
          height: 842, // A4 height in points
          margin: {
            top: 72, // 1 inch
            right: 72,
            bottom: 72,
            left: 72
          }
        })
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
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

      expect(result.success).toBe(true);
    }, 30000);

    it('should combine HTML with existing PDF', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 existing document');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .addHtmlPart('<h1>Appended HTML Page</h1><p>This page was added from HTML.</p>')
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('Annotation Operations', () => {
    describe('XFDF Application', () => {
      it('should apply XFDF annotations to PDF', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test document');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyAction(BuildActions.applyXfdf(testXfdfContent))
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      }, 30000);

      it('should apply XFDF and flatten annotations', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test document');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyActions([
            BuildActions.applyXfdf(testXfdfContent),
            BuildActions.flatten()
          ])
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
      }, 30000);
    });

    describe('Instant JSON Application', () => {
      it('should apply Instant JSON annotations', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test document');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyAction(BuildActions.applyInstantJson(testInstantJsonContent))
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      }, 30000);

      it('should apply complex Instant JSON with multiple annotation types', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 test document');
        const complexInstantJson = JSON.stringify({
          annotations: [
            {
              type: "pspdfkit/text",
              pageIndex: 0,
              rect: [100, 100, 32, 32],
              contents: "Important note"
            },
            {
              type: "pspdfkit/highlight",
              pageIndex: 0,
              rects: [[50, 50, 200, 20]],
              color: "#FFFF00"
            },
            {
              type: "pspdfkit/ink",
              pageIndex: 0,
              lines: [
                [
                  { x: 10, y: 10 },
                  { x: 100, y: 100 },
                  { x: 200, y: 50 }
                ]
              ],
              strokeColor: "#FF0000",
              lineWidth: 2
            }
          ]
        });

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .applyAction(BuildActions.applyInstantJson(complexInstantJson))
          .outputPdf()
          .execute();

        expect(result.success).toBe(true);
      }, 30000);
    });
  });

  describe('Advanced PDF Options', () => {
    describe('PDF Security', () => {
      it('should create password-protected PDF', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 confidential document');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .outputPdf({
            userPassword: 'user123',
            ownerPassword: 'owner456'
          })
          .execute();

        expect(result.success).toBe(true);
        expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
      }, 30000);

      it('should set PDF permissions', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 restricted document');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .outputPdf({
            ownerPassword: 'owner123',
            permissions: {
              printing: false,
              modifying: false,
              copying: false,
              annotating: true
            }
          })
          .execute();

        expect(result.success).toBe(true);
      }, 30000);
    });

    describe('PDF Metadata', () => {
      it('should set PDF metadata', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 document');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .outputPdf({
            metadata: {
              title: 'Test Document',
              author: 'Test Author',
              subject: 'E2E Testing',
              keywords: 'test, pdf, metadata',
              creator: 'Nutrient TypeScript Client',
              producer: 'Nutrient API'
            }
          })
          .execute();

        expect(result.success).toBe(true);
      }, 30000);
    });

    describe('PDF Optimization', () => {
      it('should optimize PDF with advanced settings', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 large document with images');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .outputPdf({
            optimize: {
              mrcCompression: true,
              imageOptimizationQuality: 3,
              linearize: true,
              removeEmbeddedFiles: true,
              removeAlternateImages: true,
              removeMetadata: true,
              removeThumbnails: true
            }
          })
          .execute();

        expect(result.success).toBe(true);
      }, 30000);
    });

    describe('PDF/A Advanced Options', () => {
      it('should create PDF/A with specific conformance level', async () => {
        const pdfFile = Buffer.from('%PDF-1.4 document');

        const result = await client
          .workflow()
          .addFilePart(pdfFile)
          .outputPdfA({
            conformance: '2a',
            vectorizeText: true,
            rasterizationDpi: 300
          })
          .execute();

        expect(result.success).toBe(true);
        expect(result.output?.mimeType).toBe('application/pdf');
      }, 30000);
    });
  });

  describe('Office Format Outputs', () => {
    it('should convert PDF to Excel (XLSX)', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 document with tables');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputOffice('xlsx')
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }, 30000);

    it('should convert PDF to PowerPoint (PPTX)', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 presentation document');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputOffice('pptx')
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    }, 30000);
  });

  describe('Image Output Options', () => {
    it('should convert PDF to JPEG with custom DPI', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 document');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputImage({
          format: 'jpg',
          dpi: 300,
          quality: 90
        })
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toMatch(/image\/jpe?g/);
    }, 30000);

    it('should convert PDF to PNG with custom dimensions', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 document');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputImage({
          format: 'png',
          width: 1920,
          height: 1080,
          renderAllPages: false
        })
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('image/png');
    }, 30000);

    it('should convert PDF to WebP format', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 document');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputImage({
          format: 'webp',
          quality: 85
        })
        .execute();

      expect(result.success).toBe(true);
      expect(result.output?.mimeType).toBe('image/webp');
    }, 30000);
  });

  describe('JSON Content Extraction', () => {
    it('should extract tables from PDF', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 document with tables');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputJson({
          includePages: true,
          includeTables: true
        })
        .execute();

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      const outputWithData = result.output as { data?: unknown };
      expect(outputWithData.data).toBeDefined();
      expect(typeof outputWithData.data).toBe('object');
    }, 30000);

    it('should extract key-value pairs', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 form document');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputJson({
          includeKeyValuePairs: true
        })
        .execute();

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    }, 30000);

    it('should extract specific page range content', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 multipage document');

      const result = await client
        .workflow()
        .addFilePart(pdfFile)
        .outputJson({
          includePages: true,
          pageRange: '1-3,5,7-9'
        })
        .execute();

      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('Complex Multi-Format Workflows', () => {
    it('should combine HTML, PDF, and images with various actions', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 base document');
      const imageFile = Buffer.from('PNG-fake-image-data');

      const result = await client
        .workflow()
        // Add existing PDF
        .addFilePart(pdfFile, undefined, [BuildActions.rotate(90)])
        // Add HTML content
        .addHtmlPart('<h1>HTML Section</h1><p>Added from HTML</p>', {
          width: 595,
          height: 842
        })
        // Add image as new page
        .addFilePart(imageFile)
        // Add blank page
        .addNewPage({ pageSize: 'A4', backgroundColor: '#f0f0f0' })
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

      expect(result.success).toBe(true);
      expect(result.output?.buffer).toBeInstanceOf(Uint8Array);
    }, 60000);

    it('should perform document assembly with redactions', async () => {
      const pdf1 = Buffer.from('%PDF-1.4 document with SSN: 123-45-6789');
      const pdf2 = Buffer.from('%PDF-1.4 document with email: secret@example.com');

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
          color: '#FF0000'
        }))
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
    }, 45000);
  });

  describe('Error Scenarios', () => {
    it('should handle invalid HTML content gracefully', async () => {
      const invalidHtml = '<html><body><unclosed-tag>Invalid HTML';

      const result = await client
        .workflow()
        .addHtmlPart(invalidHtml)
        .outputPdf()
        .execute();

      // API should still process invalid HTML
      expect(result.success).toBeDefined();
    }, 30000);

    it('should handle invalid XFDF content', async () => {
      const invalidXfdf = '<?xml version="1.0"?><invalid-xfdf>';

      const result = await client
        .workflow()
        .addFilePart(Buffer.from('%PDF-1.4'))
        .applyAction(BuildActions.applyXfdf(invalidXfdf))
        .outputPdf()
        .execute();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    }, 30000);

    it('should handle invalid Instant JSON', async () => {
      const invalidJson = '{ invalid json }';

      const result = await client
        .workflow()
        .addFilePart(Buffer.from('%PDF-1.4'))
        .applyAction(BuildActions.applyInstantJson(invalidJson))
        .outputPdf()
        .execute();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    }, 30000);
  });

  describe('Performance and Limits', () => {
    it('should handle workflows with many actions', async () => {
      const pdfFile = Buffer.from('%PDF-1.4 test document');
      
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
        .addFilePart(pdfFile)
        .applyActions(actions)
        .outputPdf()
        .execute();

      expect(result.success).toBe(true);
    }, 60000);

    it('should handle workflows with many parts', async () => {
      const parts: Buffer[] = [];
      for (let i = 0; i < 10; i++) {
        parts.push(Buffer.from(`%PDF-1.4 Part ${i + 1}`));
      }

      let workflow = client.workflow();
      for (const part of parts) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        workflow = workflow.addFilePart(part);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const result = await (workflow as any).outputPdf().execute();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(result.success).toBe(true);
    }, 90000);
  });
});