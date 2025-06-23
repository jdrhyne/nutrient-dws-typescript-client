/**
 * Example: Using the Build API
 *
 * This example demonstrates how to use the Build API to assemble
 * and process documents with various operations.
 */

import 'dotenv/config';
import { NutrientClient, BuildActions, BuildOutputs } from '../src';

// Initialize the client
const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY || 'your-api-key',
});

async function basicMergeExample(): Promise<void> {
  console.log('Example 1: Basic document merge');

  // Merge multiple PDF files into one
  const mergedPdf = await client
    .build()
    .addFile('page1.pdf')
    .addFile('page2.pdf')
    .addFile('page3.pdf')
    .setOutput(BuildOutputs.pdf())
    .execute();

  // Save the result
  // await fs.writeFile('merged.pdf', Buffer.from(await mergedPdf.arrayBuffer()));
  console.log('Merged PDF created successfully');
}

async function advancedBuildExample(): Promise<void> {
  console.log('\nExample 2: Advanced document assembly');

  // Build a complex document with multiple parts and operations
  const result = await client
    .build()
    // Add a cover page from HTML
    .addHtml('<h1>Annual Report 2024</h1><p>Company XYZ</p>', {
      layout: { size: 'A4', orientation: 'portrait' },
    })
    // Add blank page
    .addNewPages(1)
    // Add main content from existing PDF
    .addFile('annual-report.pdf', {
      pages: { start: 1, end: -1 }, // Skip first page
    })
    // Add appendix
    .addFile('appendix.docx')
    // Apply OCR to entire document
    .withActions([BuildActions.ocr('english')])
    // Set PDF/A output for archival
    .setOutput(
      BuildOutputs.pdfa({
        conformance: 'pdfa-2b',
        metadata: {
          title: 'Annual Report 2024',
          author: 'Company XYZ',
        },
      }),
    )
    .execute();

  console.log('Complex document assembled successfully');
}

async function watermarkAndProtectExample(): Promise<void> {
  console.log('\nExample 3: Watermark and protect document');

  const protectedPdf = await client
    .build()
    .addFile('confidential.pdf')
    .withActions([
      // Add watermark
      BuildActions.watermarkText('CONFIDENTIAL', {
        width: { value: 50, unit: '%' },
        height: { value: 50, unit: '%' },
        opacity: 0.3,
        rotation: 45,
        fontSize: 72,
        fontColor: '#FF0000',
      }),
      // Flatten annotations to prevent editing
      BuildActions.flatten(),
    ])
    .setOutput(
      BuildOutputs.pdf({
        // Add password protection
        userPassword: 'user123',
        ownerPassword: 'owner123',
        userPermissions: ['printing', 'extract_accessibility'],
      }),
    )
    .execute();

  console.log('Protected PDF with watermark created');
}

async function extractContentExample(): Promise<void> {
  console.log('\nExample 4: Extract structured content');

  // Extract text, tables, and metadata from a document
  const content = await client
    .build()
    .addFile('invoice.pdf')
    .setOutput(
      BuildOutputs.jsonContent({
        plainText: true,
        structuredText: true,
        tables: true,
        keyValuePairs: true,
        language: 'english',
      }),
    )
    .execute();

  // The result is JSON with extracted content
  console.log('Extracted content:', JSON.stringify(content, null, 2));
}

async function convertToImagesExample(): Promise<void> {
  console.log('\nExample 5: Convert PDF to images');

  // Convert each page to a PNG image
  const images = await client
    .build()
    .addFile('presentation.pdf')
    .setOutput(
      BuildOutputs.image({
        format: 'png',
        dpi: 300,
        pages: { start: 0, end: 4 }, // First 5 pages
      }),
    )
    .execute();

  // Result is a ZIP file containing the images
  console.log('PDF converted to images');
}

async function redactSensitiveDataExample(): Promise<void> {
  console.log('\nExample 6: Redact sensitive information');

  const redactedPdf = await client
    .build()
    .addFile('personal-data.pdf')
    .withActions([
      // Find and mark SSNs for redaction
      BuildActions.createRedactionsPreset('social-security-number'),
      // Find and mark email addresses
      BuildActions.createRedactionsPreset('email-address'),
      // Find and mark custom pattern
      BuildActions.createRedactionsRegex('Account:\\s*\\d{8,12}', {
        caseSensitive: false,
      }),
      // Apply all redactions
      BuildActions.applyRedactions(),
    ])
    .setOutput(BuildOutputs.pdf())
    .execute();

  console.log('Sensitive data redacted successfully');
}

async function optimizeForWebExample(): Promise<void> {
  console.log('\nExample 7: Optimize PDF for web delivery');

  const optimizedPdf = await client
    .build()
    .addFile('large-document.pdf')
    .setOutput(
      BuildOutputs.pdf({
        optimize: {
          linearize: true, // Fast web view
          imageOptimizationQuality: 2,
          mrcCompression: true,
          grayscaleImages: true,
        },
      }),
    )
    .execute();

  console.log('PDF optimized for web delivery');
}

async function combineFormatsExample(): Promise<void> {
  console.log('\nExample 8: Combine different file formats');

  // Combine Word, Excel, and PDF files into a single PDF
  const combinedPdf = await client
    .build()
    .addFile('report.docx')
    .addFile('financials.xlsx')
    .addFile('charts.pdf')
    .addHtml('<div style="page-break-after: always"><h2>End of Report</h2></div>')
    .setOutput(BuildOutputs.pdf())
    .execute();

  console.log('Multiple formats combined into single PDF');
}

// Cost analysis example
async function analyzeOperationCost(): Promise<void> {
  console.log('\nExample 9: Analyze operation cost before execution');

  // Build the instructions
  const builder = client
    .build()
    .addFile('document.pdf')
    .withActions([
      BuildActions.ocr(['english', 'spanish']),
      BuildActions.watermarkText('DRAFT', {
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
      }),
    ]);

  // Analyze the cost without executing
  const analysis = await client.analyzeBuild(builder.getInstructions());

  console.log(`This operation would cost ${analysis.cost} credits`);
  console.log('Required features:', analysis.required_features);

  // Execute only if cost is acceptable
  if (analysis.cost && analysis.cost <= 10) {
    const result = await builder.execute();
    console.log('Operation executed successfully');
  } else {
    console.log('Operation too expensive, skipping');
  }
}

// Facade methods examples
async function facadeMethodsExample(): Promise<void> {
  console.log('\nExample 10: Using simplified facade methods');

  // Simple conversion
  const pdfFromWord = await client.convert('document.docx', 'pdf');

  // Simple merge
  const merged = await client.merge(['file1.pdf', 'file2.pdf', 'file3.pdf']);

  // Simple compression
  const compressed = await client.compress('large.pdf', 'high');

  // Simple watermark
  const watermarked = await client.watermark('document.pdf', 'DRAFT', {
    opacity: 0.5,
    fontSize: 48,
  });

  // Simple text extraction
  const extracted = await client.extractText('document.pdf', {
    tables: true,
    structuredText: true,
  });

  console.log('Facade methods completed successfully');
}

// Run examples
async function runExamples(): Promise<void> {
  try {
    await basicMergeExample();
    await advancedBuildExample();
    await watermarkAndProtectExample();
    await extractContentExample();
    await convertToImagesExample();
    await redactSensitiveDataExample();
    await optimizeForWebExample();
    await combineFormatsExample();
    await analyzeOperationCost();
    await facadeMethodsExample();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run
// runExamples();
