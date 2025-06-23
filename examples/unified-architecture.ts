/**
 * Examples demonstrating the unified architectural approach
 * 
 * Key principles:
 * 1. Fluent Builder Pattern - All APIs use method chaining
 * 2. Staged Interfaces - Methods are available only at appropriate stages
 * 3. Type Safety - Strong typing with TypeScript generics
 * 4. Consistent Patterns - All builders follow the same structure
 * 5. Direct API Mapping - Builders map directly to REST endpoints
 */

import { NutrientClient, BuildActions } from '../src';

// Initialize the client
const client = new NutrientClient({
  apiKey: process.env.NUTRIENT_API_KEY || 'your-api-key',
});

async function demonstrateUnifiedArchitecture() {
  // 1. Workflow Builder - The main composable API
  // Follows staged interface pattern: parts -> actions -> output -> execute
  const workflowResult = await client
    .workflow()
    .addFilePart('document.pdf')
    .addFilePart('appendix.pdf')
    .applyAction(BuildActions.ocr('english'))
    .outputPdf()
    .execute();

  // 2. Convenience Methods - Simple operations using the builder internally
  // These methods provide a simpler API for common operations
  const ocrResult = await client.ocr('scan.pdf', 'english');
  const mergeResult = await client.merge(['doc1.pdf', 'doc2.pdf', 'doc3.pdf']);
  const compressResult = await client.compress('large.pdf', 'high');

  // 3. Complex Workflows - Demonstrating composability
  const complexWorkflow = await client
    .workflow()
    // Add multiple parts with part-specific actions
    .addFilePart('cover.pdf', undefined, [BuildActions.rotate(90)])
    .addHtmlPart('<h1>Chapter 1</h1><p>Content...</p>')
    .addFilePart('content.pdf', { pages: { start: 1, end: 10 } })
    .addNewPage({ pageSize: 'A4', backgroundColor: '#ffffff' })
    // Apply document-wide actions
    .applyActions([
      BuildActions.watermarkText('DRAFT', { opacity: 0.5 }),
      BuildActions.flatten(),
    ])
    // Set output format
    .outputPdf({
      optimize: {
        mrcCompression: true,
        imageOptimizationQuality: 2,
      },
    })
    .execute();

  // 4. Type-Safe Output Handling
  // The output type is inferred based on the output method used
  const textExtractionResult = await client
    .workflow()
    .addFilePart('document.pdf')
    .outputJson({ plainText: true, structuredText: true })
    .execute();

  // TypeScript knows this has { data: ... } structure
  if (textExtractionResult.success && textExtractionResult.output) {
    console.log(textExtractionResult.output.data);
  }

  // 5. Error Handling - Consistent across all builders
  const result = await client
    .workflow()
    .addFilePart('invalid-file.pdf')
    .outputPdf()
    .execute();

  if (!result.success) {
    // Errors are wrapped in NutrientError with consistent structure
    result.errors?.forEach((error) => {
      console.error(`Step ${error.step}: ${error.error.message}`);
    });
  }

  // 6. Dry Run - Analyze workflows before execution
  const dryRunResult = await client
    .workflow()
    .addFilePart('document.pdf')
    .applyAction(BuildActions.ocr('english'))
    .outputPdf()
    .dryRun();

  if (dryRunResult.success && dryRunResult.analysis) {
    console.log(`This operation will cost ${dryRunResult.analysis.cost} credits`);
  }

  // 7. Progress Tracking
  const progressResult = await client
    .workflow()
    .addFilePart('large-document.pdf')
    .applyAction(BuildActions.ocr(['english', 'spanish']))
    .outputPdf()
    .execute({
      onProgress: (step, total) => {
        console.log(`Processing step ${step} of ${total}`);
      },
    });

  // 8. All Builders Follow the Same Pattern
  // Future builders will follow the same pattern:
  // - Constructor takes client options
  // - Methods return 'this' for chaining
  // - Staged interfaces for type safety
  // - execute() performs the operation
  // - Consistent error handling

  /* Example of potential future builders following the same pattern:
  
  // Template Builder (hypothetical)
  const templateResult = await client
    .template()
    .load('invoice-template.pdf')
    .fillField('customer_name', 'John Doe')
    .fillField('amount', '$1,234.56')
    .execute();

  // Form Builder (hypothetical)
  const formResult = await client
    .form()
    .create('application.pdf')
    .addTextField('name', { x: 100, y: 100, width: 200, height: 30 })
    .addCheckbox('agree', { x: 100, y: 200 })
    .execute();
  */
}

// Run the demonstration
demonstrateUnifiedArchitecture().catch(console.error);