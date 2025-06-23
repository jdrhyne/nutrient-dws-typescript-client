/**
 * Basic usage example for the Nutrient DWS TypeScript Client
 *
 * This example demonstrates simple document operations:
 * - Converting documents between formats
 * - Extracting text from PDFs
 * - Compressing files
 * - Adding watermarks
 */

import 'dotenv/config';
import { NutrientClient } from '@nutrient/dws-client';
import * as fs from 'fs/promises';
import * as path from 'path';

// Initialize the client with your API key
const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY || 'your-api-key-here',
});

async function main() {
  try {
    // Example 1: Convert a Word document to PDF
    console.log('Converting DOCX to PDF...');
    const pdfBlob = await client.convert('path/to/document.docx', 'pdf', { quality: 90 });

    // Save the converted PDF
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
    await fs.writeFile('output/converted.pdf', pdfBuffer);
    console.log('✓ PDF saved to output/converted.pdf');

    // Example 2: Extract text from a PDF
    console.log('\nExtracting text from PDF...');
    const textResult = await client.extractText('path/to/document.pdf', true);

    console.log('Extracted text:');
    console.log(textResult.text.substring(0, 200) + '...');

    if (textResult.metadata) {
      console.log('\nDocument metadata:');
      console.log(JSON.stringify(textResult.metadata, null, 2));
    }

    // Example 3: Compress a large PDF
    console.log('\nCompressing PDF...');
    const compressedBlob = await client.compress('path/to/large-document.pdf', 'high');

    const compressedBuffer = Buffer.from(await compressedBlob.arrayBuffer());
    await fs.writeFile('output/compressed.pdf', compressedBuffer);

    // Compare file sizes
    const originalStats = await fs.stat('path/to/large-document.pdf');
    const compressedStats = await fs.stat('output/compressed.pdf');
    const reduction = ((1 - compressedStats.size / originalStats.size) * 100).toFixed(1);

    console.log(`✓ PDF compressed by ${reduction}%`);
    console.log(`  Original: ${(originalStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Compressed: ${(compressedStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Example 4: Add a watermark to a PDF
    console.log('\nAdding watermark to PDF...');
    const watermarkedBlob = await client.watermark('path/to/document.pdf', 'CONFIDENTIAL', {
      position: 'center',
      opacity: 0.3,
      fontSize: 72,
    });

    const watermarkedBuffer = Buffer.from(await watermarkedBlob.arrayBuffer());
    await fs.writeFile('output/watermarked.pdf', watermarkedBuffer);
    console.log('✓ Watermarked PDF saved to output/watermarked.pdf');

    // Example 5: Merge multiple PDFs
    console.log('\nMerging PDFs...');
    const mergedBlob = await client.merge(
      ['path/to/document1.pdf', 'path/to/document2.pdf', 'path/to/document3.pdf'],
      'pdf',
    );

    const mergedBuffer = Buffer.from(await mergedBlob.arrayBuffer());
    await fs.writeFile('output/merged.pdf', mergedBuffer);
    console.log('✓ Merged PDF saved to output/merged.pdf');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Ensure output directory exists
async function setup() {
  const outputDir = path.join(process.cwd(), 'output');
  await fs.mkdir(outputDir, { recursive: true });
}

// Run the examples
setup().then(() => main());
