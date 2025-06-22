/**
 * WorkflowBuilder example for the Nutrient DWS TypeScript Client
 *
 * This example demonstrates how to use the new WorkflowBuilder API
 * to chain multiple document operations together in a single workflow.
 */

import { NutrientClient, BuildActions } from '../src/index';
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
      .workflow()
      .addFilePart('path/to/document.docx')
      .applyAction(BuildActions.watermarkText('DRAFT', {
        width: { value: 50, unit: '%' },
        height: { value: 50, unit: '%' },
        top: { value: 10, unit: '%' },
        right: { value: 10, unit: '%' },
        opacity: 0.5,
        fontSize: 36,
      }))
      .applyAction(BuildActions.flatten())
      .outputPdf({
        optimize: {
          linearize: true,
          imageOptimizationQuality: 2,
        }
      })
      .execute({
        onProgress: (current, total) => {
          console.log(`  Processing step ${current} of ${total}...`);
        },
      });

    if (result.success) {
      // Get the final output
      const finalOutput = result.output
      if (finalOutput) {
        const buffer = Buffer.from(await finalOutput.blob.arrayBuffer());
        await fs.writeFile('output/workflow-result.pdf', buffer);
        console.log('✓ Workflow completed successfully');
      }
    }

    // Example 2: Complex workflow with multiple outputs
    console.log('\nRunning complex workflow with multiple outputs...');

    const complexResult = await client
      .workflow()
      .addFilePart('path/to/report.docx')
      .applyAction(BuildActions.watermarkText('CONFIDENTIAL - DO NOT DISTRIBUTE', {
        width: { value: 100, unit: '%' },
        height: { value: 100, unit: '%' },
        opacity: 0.2,
        fontSize: 48,
        rotation: 45,
      }))
      .applyAction(BuildActions.ocr('english'))
      .outputPdf({
        optimize: {
          linearize: true,
          imageOptimizationQuality: 1,
        }
      })
      .execute();

    if (complexResult.success) {
      // Get the final output
      const finalOutput = result.output
      if (finalOutput) {
        const buffer = Buffer.from(await finalOutput.blob.arrayBuffer());
        await fs.writeFile('output/workflow-result.pdf', buffer);
        console.log('✓ Workflow completed successfully');
      }
    }

    // Example 3: Merge and process workflow
    console.log('\nRunning merge and process workflow...');

    const mergeResult = await client
      .workflow()
      .addFilePart('path/to/chapter1.pdf')
      .addFilePart('path/to/chapter2.pdf')
      .addFilePart('path/to/chapter3.pdf')
      .applyAction(BuildActions.watermarkText('© 2024 My Company', {
        width: { value: 30, unit: '%' },
        height: { value: 10, unit: '%' },
        bottom: { value: 5, unit: '%' },
        left: { value: 50, unit: '%' },
        opacity: 0.7,
        fontSize: 12,
      }))
      .applyAction(BuildActions.flatten())
      .outputPdf({
        optimize: {
          linearize: true,
          imageOptimizationQuality: 2,
        }
      })
      .execute();

    if (mergeResult.success) {
      const finalOutput = result.output
      if (finalOutput) {
        const buffer = Buffer.from(await finalOutput.blob.arrayBuffer());
        await fs.writeFile('output/workflow-result.pdf', buffer);
        console.log('✓ Workflow completed successfully');
      }
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
