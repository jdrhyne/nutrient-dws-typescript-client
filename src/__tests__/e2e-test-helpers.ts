/**
 * E2E Test Helper Utilities
 * Provides utilities for creating test fixtures and validating results
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Test document generators for various scenarios
 */
export class TestDocumentGenerator {
  /**
   * Generates a simple PDF with text content
   */
  static generateSimplePdf(content: string = 'Test PDF Document'): Buffer {
    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>/Contents 4 0 R>>endobj
4 0 obj<</Length ${content.length + 30}>>stream
BT /F1 12 Tf 100 700 Td (${content}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000262 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
356
%%EOF`;
    return Buffer.from(pdf);
  }

  /**
   * Generates a PDF with sensitive data for redaction testing
   */
  static generatePdfWithSensitiveData(): Buffer {
    const content = `Personal Information:
Name: John Doe
SSN: 123-45-6789
Email: john.doe@example.com
Phone: (555) 123-4567
Credit Card: 4111-1111-1111-1111
Medical Record: MR-2024-12345
License: DL-ABC-123456`;
    
    return this.generateSimplePdf(content);
  }

  /**
   * Generates a PDF with table data
   */
  static generatePdfWithTable(): Buffer {
    const content = `Sales Report 2024
Product | Q1 | Q2 | Q3 | Q4
Widget A | 100 | 120 | 140 | 160
Widget B | 80 | 90 | 100 | 110
Widget C | 60 | 70 | 80 | 90`;
    
    return this.generateSimplePdf(content);
  }

  /**
   * Generates HTML content with various elements
   */
  static generateHtmlContent(options: {
    title?: string;
    includeStyles?: boolean;
    includeTable?: boolean;
    includeImages?: boolean;
    includeForm?: boolean;
  } = {}): string {
    const {
      title = 'Test Document',
      includeStyles = true,
      includeTable = false,
      includeImages = false,
      includeForm = false
    } = options;

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>`;

    if (includeStyles) {
      html += `
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .highlight {
            background-color: #ffeb3b;
            padding: 2px 4px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>`;
    }

    html += `
</head>
<body>
    <h1>${title}</h1>
    <p>This is a test document with <span class="highlight">highlighted text</span> for PDF conversion testing.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`;

    if (includeTable) {
      html += `
    <h2>Data Table</h2>
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Widget A</td>
                <td>$10.00</td>
                <td>5</td>
                <td>$50.00</td>
            </tr>
            <tr>
                <td>Widget B</td>
                <td>$15.00</td>
                <td>3</td>
                <td>$45.00</td>
            </tr>
            <tr>
                <td>Widget C</td>
                <td>$20.00</td>
                <td>2</td>
                <td>$40.00</td>
            </tr>
        </tbody>
    </table>`;
    }

    if (includeImages) {
      html += `
    <h2>Images</h2>
    <p>Below is a placeholder for image content:</p>
    <div style="width: 200px; height: 200px; background-color: #e0e0e0; display: flex; align-items: center; justify-content: center; margin: 20px 0;">
        <span style="color: #666;">Image Placeholder</span>
    </div>`;
    }

    if (includeForm) {
      html += `
    <h2>Form Example</h2>
    <form>
        <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" placeholder="Enter your name">
        </div>
        <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" placeholder="Enter your email">
        </div>
        <div class="form-group">
            <label for="message">Message:</label>
            <textarea id="message" name="message" rows="4" placeholder="Enter your message"></textarea>
        </div>
    </form>`;
    }

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * Generates XFDF annotation content
   */
  static generateXfdf(annotations: Array<{
    type: 'highlight' | 'text' | 'ink' | 'square' | 'circle';
    page: number;
    rect: number[];
    content?: string;
    color?: string;
  }>): string {
    let xfdf = `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
    <annots>`;

    for (const annot of annotations) {
      const rectStr = annot.rect.join(',');
      const color = annot.color ?? '#FFFF00';

      switch (annot.type) {
        case 'highlight':
          xfdf += `
        <highlight page="${annot.page}" rect="${rectStr}" color="${color}">
            <contents>${annot.content ?? 'Highlighted text'}</contents>
        </highlight>`;
          break;
        case 'text':
          xfdf += `
        <text page="${annot.page}" rect="${rectStr}" color="${color}">
            <contents>${annot.content ?? 'Note'}</contents>
        </text>`;
          break;
        case 'square':
          xfdf += `
        <square page="${annot.page}" rect="${rectStr}" color="${color}" />`;
          break;
        case 'circle':
          xfdf += `
        <circle page="${annot.page}" rect="${rectStr}" color="${color}" />`;
          break;
      }
    }

    xfdf += `
    </annots>
</xfdf>`;

    return xfdf;
  }

  /**
   * Generates Instant JSON annotation content
   */
  static generateInstantJson(annotations: Array<{
    type: string;
    pageIndex: number;
    [key: string]: unknown;
  }>): string {
    return JSON.stringify({
      format: 'https://pspdfkit.com/instant-json/v1',
      annotations: annotations.map(annot => ({
        ...annot,
        id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }, null, 2);
  }

  /**
   * Generates a fake image buffer
   */
  static generateImageBuffer(format: 'png' | 'jpg' = 'png'): Buffer {
    // This is a minimal valid PNG header
    if (format === 'png') {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x64, // width: 100
        0x00, 0x00, 0x00, 0x64, // height: 100
        0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      ]);
      return pngHeader;
    } else {
      // Minimal JPEG header
      const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI and APP0 marker
        0x00, 0x10, // APP0 length
        0x4A, 0x46, 0x49, 0x46, 0x00, // JFIF identifier
      ]);
      return jpegHeader;
    }
  }
}

/**
 * Result validators for E2E tests
 */
export class ResultValidator {
  /**
   * Validates that the result contains a valid PDF
   */
  static validatePdfOutput(result: unknown): void {
    const typedResult = result as { 
      success: boolean; 
      output?: { 
        buffer: Uint8Array; 
        mimeType: string; 
      };
    };
    
    if (!('success' in typedResult)) {
      throw new Error('Result must have success property');
    }
    if (!typedResult.success || !typedResult.output) {
      throw new Error('Result must be successful with output');
    }
    if (!(typedResult.output.buffer instanceof Uint8Array)) {
      throw new Error('Output buffer must be Uint8Array');
    }
    if (typedResult.output.mimeType !== 'application/pdf') {
      throw new Error('Output must be PDF');
    }
    if (typedResult.output.buffer.length === 0) {
      throw new Error('Output buffer cannot be empty');
    }
    
    // Check for PDF header
    const header = Buffer.from(typedResult.output.buffer.slice(0, 5)).toString();
    if (!header.match(/^%PDF-/)) {
      throw new Error('Invalid PDF header');
    }
  }

  /**
   * Validates Office document output
   */
  static validateOfficeOutput(result: unknown, format: 'docx' | 'xlsx' | 'pptx'): void {
    const typedResult = result as { 
      success: boolean; 
      output?: { 
        buffer: Uint8Array; 
        mimeType: string; 
      };
    };
    
    const mimeTypes = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };

    if (!typedResult.success || !typedResult.output) {
      throw new Error('Result must be successful with output');
    }
    if (!(typedResult.output.buffer instanceof Uint8Array)) {
      throw new Error('Output buffer must be Uint8Array');
    }
    if (typedResult.output.buffer.length === 0) {
      throw new Error('Output buffer cannot be empty');
    }
    if (typedResult.output.mimeType !== mimeTypes[format]) {
      throw new Error(`Expected ${format} MIME type`);
    }
  }

  /**
   * Validates image output
   */
  static validateImageOutput(result: unknown, expectedFormat?: string): void {
    const typedResult = result as { 
      success: boolean; 
      output?: { 
        buffer: Uint8Array; 
        mimeType: string; 
      };
    };
    
    if (!typedResult.success || !typedResult.output) {
      throw new Error('Result must be successful with output');
    }
    if (!(typedResult.output.buffer instanceof Uint8Array)) {
      throw new Error('Output buffer must be Uint8Array');
    }
    if (typedResult.output.buffer.length === 0) {
      throw new Error('Output buffer cannot be empty');
    }
    
    if (expectedFormat) {
      const formatMimeTypes: Record<string, string[]> = {
        png: ['image/png'],
        jpg: ['image/jpeg', 'image/jpg'],
        webp: ['image/webp']
      };
      
      const validMimeTypes = formatMimeTypes[expectedFormat] ?? [`image/${expectedFormat}`];
      if (!validMimeTypes.includes(typedResult.output.mimeType)) {
        throw new Error(`Expected format ${expectedFormat}, got ${typedResult.output.mimeType}`);
      }
    } else {
      if (!typedResult.output.mimeType.match(/^image\//)) {
        throw new Error('Expected image MIME type');
      }
    }
  }

  /**
   * Validates JSON extraction output
   */
  static validateJsonOutput(result: unknown): void {
    const typedResult = result as { 
      success: boolean; 
      output?: { 
        data?: unknown; 
      };
    };
    
    if (!typedResult.success || !typedResult.output) {
      throw new Error('Result must be successful with output');
    }
    if (!typedResult.output.data) {
      throw new Error('Output must have data property');
    }
    if (typeof typedResult.output.data !== 'object') {
      throw new Error('Output data must be an object');
    }
  }

  /**
   * Validates error response
   */
  static validateErrorResponse(result: unknown, expectedErrorType?: string): void {
    const typedResult = result as { 
      success: boolean; 
      errors?: Array<{ 
        error: { 
          name: string; 
          code: string; 
        }; 
      }>; 
    };
    
    if (typedResult.success) {
      throw new Error('Result should not be successful');
    }
    if (!typedResult.errors || !Array.isArray(typedResult.errors)) {
      throw new Error('Result must have errors array');
    }
    if (typedResult.errors.length === 0) {
      throw new Error('Errors array cannot be empty');
    }
    
    if (expectedErrorType) {
      const hasExpectedError = typedResult.errors.some(error => 
        error.error.name === expectedErrorType || 
        error.error.code === expectedErrorType
      );
      if (!hasExpectedError) {
        throw new Error(`Expected error type ${expectedErrorType} not found`);
      }
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceMonitor {
  private startTime: number = 0;
  private checkpoints: Map<string, number> = new Map();

  start(): void {
    this.startTime = Date.now();
    this.checkpoints.clear();
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now() - this.startTime);
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  getCheckpoint(name: string): number | undefined {
    return this.checkpoints.get(name);
  }

  getReport(): string {
    const elapsed = this.getElapsedTime();
    let report = `Total time: ${elapsed}ms\n`;
    
    for (const [name, time] of this.checkpoints) {
      report += `  ${name}: ${time}ms\n`;
    }
    
    return report;
  }

  expectUnder(maxMs: number, message?: string): void {
    const elapsed = this.getElapsedTime();
    if (elapsed >= maxMs) {
      throw new Error(`Performance failure: took ${elapsed}ms (limit: ${maxMs}ms)`);
    }
    if (message && elapsed > maxMs * 0.8) {
      // eslint-disable-next-line no-console
      console.warn(`Performance warning: ${message} took ${elapsed}ms (limit: ${maxMs}ms)`);
    }
  }
}

/**
 * Test fixtures manager
 */
export class TestFixtures {
  private static fixturesDir = path.join(__dirname, '../../test-fixtures');

  /**
   * Ensures test fixtures directory exists
   */
  static ensureFixturesDirectory(): void {
    if (!fs.existsSync(this.fixturesDir)) {
      fs.mkdirSync(this.fixturesDir, { recursive: true });
    }
  }

  /**
   * Gets or creates a test fixture file
   */
  static getOrCreateFixture(
    filename: string, 
    generator: () => Buffer | string
  ): Buffer {
    this.ensureFixturesDirectory();
    const fixturePath = path.join(this.fixturesDir, filename);

    if (!fs.existsSync(fixturePath)) {
      const content = generator();
      fs.writeFileSync(fixturePath, content);
    }

    return fs.readFileSync(fixturePath);
  }

  /**
   * Cleans up test fixtures
   */
  static cleanupFixtures(): void {
    if (fs.existsSync(this.fixturesDir)) {
      const files = fs.readdirSync(this.fixturesDir);
      for (const file of files) {
        if (file.startsWith('test-') || file.startsWith('temp-')) {
          fs.unlinkSync(path.join(this.fixturesDir, file));
        }
      }
    }
  }
}

/**
 * Batch testing utilities for running multiple similar tests
 */
export class BatchTestRunner {
  /**
   * Runs a test function with multiple input variations
   */
  static async runBatch<T, R>(
    testName: string,
    inputs: T[],
    testFn: (input: T) => Promise<R>,
    validateFn: (result: R, input: T) => void
  ): Promise<void> {
    const results: Array<{ input: T; result?: R; error?: unknown }> = [];

    for (const input of inputs) {
      try {
        const result = await testFn(input);
        results.push({ input, result });
        validateFn(result, input);
      } catch (error) {
        results.push({ input, error });
        const inputStr = typeof input === 'string' ? input : 'complex input';
        throw new Error(`${testName} failed for input: ${inputStr}. Error: ${String(error)}`);
      }
    }

    // Summary logging
    // eslint-disable-next-line no-console
    console.log(`${testName}: ${results.length} variations tested successfully`);
  }

  /**
   * Runs concurrent tests with rate limiting
   */
  static async runConcurrent<T, R>(
    items: T[],
    testFn: (item: T) => Promise<R>,
    options: { concurrency?: number; delayMs?: number } = {}
  ): Promise<R[]> {
    const { concurrency = 3, delayMs = 0 } = options;
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(testFn));
      results.push(...batchResults);
      
      if (delayMs > 0 && i + concurrency < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  }
}