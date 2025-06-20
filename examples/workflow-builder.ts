/**
 * WorkflowBuilder example for the Nutrient DWS TypeScript Client
 *
 * This example demonstrates how to use the fluent WorkflowBuilder API
 * to chain multiple document operations together in a single workflow.
 */

import { NutrientClient } from '@nutrient/dws-client';
import * as fs from 'fs/promises';
import * as path from 'path';

// Initialize the client
const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY || 'your-api-key-here',
});

async function main() {
  try {
    // Example 1: Convert, compress, and watermark in one workflow
    console.log('Running document processing workflow...');

    const result = await client
      .buildWorkflow()
      .input('path/to/document.docx')
      .convert('pdf', { quality: 95 })
      .compress('medium')
      .watermark('DRAFT', {
        position: 'top-right',
        opacity: 0.5,
        fontSize: 36,
      })
      .execute({
        onProgress: (current, total) => {
          console.log(`  Processing step ${current} of ${total}...`);
        },
      });

    if (result.success) {
      // Get the final output
      const finalOutput = Array.from(result.outputs.values()).pop();
      if (finalOutput) {
        const buffer = Buffer.from(await finalOutput.arrayBuffer());
        await fs.writeFile('output/workflow-result.pdf', buffer);
        console.log('✓ Workflow completed successfully');
      }
    }

    // Example 2: Complex workflow with named outputs
    console.log('\nRunning complex workflow with multiple outputs...');

    const complexResult = await client
      .buildWorkflow()
      .input('path/to/report.docx')
      // Convert to PDF and save this version
      .convert('pdf', { quality: 100 }, 'high-quality')
      // Create a compressed version for email
      .compress('high', 'email-version')
      // Create a watermarked version for review
      .watermark(
        'CONFIDENTIAL - DO NOT DISTRIBUTE',
        {
          position: 'diagonal',
          opacity: 0.2,
          fontSize: 48,
        },
        'review-version',
      )
      // Extract text for indexing
      .extractText(true, 'text-content')
      .execute();

    if (complexResult.success) {
      // Save different versions
      for (const [name, output] of complexResult.outputs) {
        if (name === 'text-content') {
          // Handle text extraction result
          const textData = await output.text();
          const parsed = JSON.parse(textData);
          await fs.writeFile('output/extracted-text.json', JSON.stringify(parsed, null, 2));
          console.log(`✓ Saved extracted text to output/extracted-text.json`);
        } else {
          // Handle file outputs
          const buffer = Buffer.from(await output.arrayBuffer());
          await fs.writeFile(`output/${name}.pdf`, buffer);
          console.log(`✓ Saved ${name} to output/${name}.pdf`);
        }
      }
    }

    // Example 3: Merge and process workflow
    console.log('\nRunning merge and process workflow...');

    const mergeResult = await client
      .buildWorkflow()
      .input('path/to/chapter1.pdf')
      .merge(['path/to/chapter2.pdf', 'path/to/chapter3.pdf'], 'pdf')
      .watermark('© 2024 My Company', {
        position: 'bottom-center',
        opacity: 0.7,
        fontSize: 12,
      })
      .compress('medium')
      .execute();

    if (mergeResult.success) {
      const output = Array.from(mergeResult.outputs.values()).pop();
      if (output) {
        const buffer = Buffer.from(await output.arrayBuffer());
        await fs.writeFile('output/merged-book.pdf', buffer);
        console.log('✓ Merged and processed book saved');
      }
    }

    // Example 4: Error handling in workflows
    console.log('\nDemonstrating error handling...');

    const errorResult = await client
      .buildWorkflow()
      .input('path/to/document.pdf')
      .convert('invalid-format' as any) // This will fail
      .compress('high')
      .execute({
        continueOnError: true, // Continue even if a step fails
      });

    if (!errorResult.success) {
      console.log('Workflow had errors (as expected):');
      errorResult.errors?.forEach(({ step, error }) => {
        console.log(`  Step ${step}: ${error.message}`);
      });
    }
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
