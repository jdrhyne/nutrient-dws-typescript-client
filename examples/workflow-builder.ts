/**
 * WorkflowBuilder example for the Nutrient DWS TypeScript Client
 *
 * This example demonstrates how to use the new WorkflowBuilder API
 * to chain multiple document operations together in a single workflow.
 */

import 'dotenv/config';
import { NutrientClient, BuildActions } from '../src';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize the client
const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY || 'your-api-key-here',
});

async function main() {
  try {
    // Example 1: Convert, compress, and watermark in one workflow
    console.log('Running document processing workflow...');

    const result = await client
      .workflow()
      .addFilePart(path.join(__dirname, 'assets/example.pdf'))
      .outputPdf()
      .execute({
        onProgress: (current, total) => {
          console.log(`  Processing step ${current} of ${total}...`);
        },
      });

    if (result.success) {
      const finalOutput = result.output
      if (finalOutput) {
        const buffer = Buffer.from(finalOutput.buffer);
        await fs.writeFile('output/workflow-result.pdf', buffer);
        console.log('✓ Workflow completed successfully');
      }
    } else {
      console.error('Workflow failed:', JSON.stringify(result.errors, null, 2));
    }

    // Example 2: Complex workflow with multiple outputs
    console.log('\nRunning complex workflow with multiple outputs...');

    const complexResult = await client
      .workflow()
      .addFilePart(path.join(__dirname, 'assets/example.docx'))
      .applyAction(BuildActions.rotate(90))
      .applyAction(BuildActions.ocr('english'))
      .outputPdf()
      .execute();

    if (complexResult.success) {
      // Get the final output
      const finalOutput = complexResult.output
      if (finalOutput) {
        const buffer = Buffer.from(finalOutput.buffer);
        await fs.writeFile('output/workflow-complex-result.pdf', buffer);
        console.log('✓ Complex workflow completed successfully');
      }
    } else {
      console.error('Workflow failed:', JSON.stringify(complexResult.errors, null, 2));
    }

    // Example 3: Merge and process workflow
    console.log('\nRunning merge and process workflow...');

    const mergeResult = await client
      .workflow()
      .addFilePart(path.join(__dirname, 'assets/example.pdf'))
      .addFilePart(path.join(__dirname, 'assets/example.pdf'))
      .addFilePart(path.join(__dirname, 'assets/example.pdf'))
      .applyAction(BuildActions.flatten())
      .outputPdf({
        optimize: {
          linearize: true
        }
      })
      .execute();

    if (mergeResult.success) {
      const finalOutput = mergeResult.output
      if (finalOutput) {
        const buffer = Buffer.from(finalOutput.buffer);
        await fs.writeFile('output/workflow-merge-result.pdf', buffer);
        console.log('✓ Merge workflow completed successfully');
      }
    } else {
      console.error('Workflow failed:', JSON.stringify(mergeResult.errors, null, 2));
    }

    // Example 4: Error handling in workflows
    console.log('\nDemonstrating error handling...');

    const errorResult = await client
      .workflow()
      .addFilePart('path/to/nonexistent-document.pdf') // This will fail
      .applyAction(BuildActions.flatten())
      .outputPdf()
      .execute();

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
