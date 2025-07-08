# Workflow Builder Redesign

## Overview

This document outlines the redesign of the WorkflowBuilder class to provide a more composable API that allows for parts and actions, similar to the current `/build` API. The new design will enable a fluent interface pattern for building document workflows.

## Current Implementation

The current WorkflowBuilder implementation uses a step-based approach where each step represents an operation (convert, merge, compress, extract, watermark). These steps are executed sequentially, and the output of one step becomes the input of the next step.

## New Design Goals

1. Create a more composable API that directly maps to the `/build` API structure and thus being more efficient. 
2. Allow for parts (files/URLs/HTML/new pages) to be added individually
3. Enable actions to be applied to specific parts or to the entire document
4. Maintain a fluent interface pattern for method chaining
5. Provide type safety and good developer experience

> **Important**: The redesigned API allows actions to be applied at two levels:
> 1. **Part-level actions**: Applied to individual parts before they are combined (using the `actions` parameter in part-adding methods)
> 2. **Document-level actions**: Applied to the entire document after all parts are combined (using the `applyAction(s)` methods)

## API Structure

The new WorkflowBuilder will expose the following core methods:

### Part Management

- `addFilePart(file: FileInput, options?: FilePartOptions, actions?: BuildAction[])`: Adds a file part to the workflow with optional actions to apply to this specific part
- `addHtmlPart(html: string | Blob, options?: HTMLPartOptions, actions?: BuildAction[])`: Adds an HTML part to the workflow with optional actions to apply to this specific part
- `addNewPage(options?: NewPageOptions, actions?: BuildAction[])`: Adds a new blank page to the workflow with optional actions to apply to this specific part
- `addDocumentPart(documentId: string, options?: DocumentPartOptions, actions?: BuildAction[])`: Adds a document part to the workflow with optional actions to apply to this specific part

### Action Management

- `applyActions(actions: BuildAction[])`: Applies actions to the entire document
- `applyAction(action: BuildAction)`: Applies a single action to the entire document

### Output Configuration

- `output(options: BuildOutput)`: Sets the output format and options
- `outputPdf(options?: PDFOutputOptions)`: Sets the output format to PDF with options
- `outputPdfA(options?: PDFAOutputOptions)`: Sets the output format to PDF/A with options
- `outputImage(options?: ImageOutputOptions)`: Sets the output format to image with options
- `outputOffice(format: 'docx' | 'xlsx' | 'pptx', options?: OfficeOutputOptions)`: Sets the output format to Office with options
- `outputJson(options?: JSONContentOutputOptions)`: Sets the output format to JSON with options

### Execution

- `execute(options?: WorkflowExecuteOptions)`: Executes the workflow and returns the results
- `dryRun(options?: { timeout?: number })`: Validates the workflow without executing it, returning analysis information such as credit cost

## Usage Examples

```typescript
// Example 1: Simple PDF merge
const workflow = new WorkflowBuilder(clientOptions)
  .addFilePart(file1)
  .addFilePart(file2)
  .outputPdf()
  .execute();

// Example 2: Add watermark to a document
const workflow = new WorkflowBuilder(clientOptions)
  .addFilePart(pdfFile)
  .applyAction(BuildActions.watermarkText('CONFIDENTIAL', {
    opacity: 0.5,
    fontSize: 36,
    position: 'center'
  }))
  .outputPdf()
  .execute();

// Example 3: Complex workflow with multiple parts and actions
const workflow = new WorkflowBuilder(clientOptions)
  .addFilePart(coverPage)
  .addHtmlPart(htmlContent, {
    assets: htmlAssets
  })
  .addFilePart(mainDocument, {
    pages: '1-5',
    actions: [
      BuildActions.rotate(90)
    ]
  })
  .addNewPage()
  .applyActions([
    BuildActions.ocr({ language: 'english' }),
    BuildActions.flatten()
  ])
  .outputPdfA({
    conformance: 'pdfa-2b'
  })
  .execute();

// Example 4: Using dryRun to validate and analyze a workflow
const builder = new WorkflowBuilder(clientOptions)
  .addFilePart(largeDocument)
  .applyActions([
    BuildActions.ocr({ language: 'english' }),
    BuildActions.watermarkText('DRAFT')
  ])
  .outputPdf();

// Check if the workflow is valid and get credit cost before executing
const analysisResult = await builder.dryRun();
if (analysisResult.success) {
  console.log(`Workflow will cost ${analysisResult.analysis?.cost} credits`);
  console.log('Required features:', analysisResult.analysis?.required_features);

  // If the cost is acceptable, execute the workflow
  const result = await builder.execute();
  // Process the result...
}
```

## Type Definitions

The new WorkflowBuilder will leverage the existing types from the generated API types:

```typescript
import type { components } from '../generated/api-types';

// Use existing types directly
type Part = components['schemas']['Part'];
type BuildAction = components['schemas']['BuildAction'];
type BuildOutput = components['schemas']['BuildOutput'];

// Create more specific types for better developer experience
type FilePartOptions = Omit<components['schemas']['FilePart'], 'file' | 'actions'>;
type HTMLPartOptions = Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>;
type NewPageOptions = Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>;
type DocumentPartOptions = Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
  layer?: string;
};
```

## Implementation Considerations

1. The new WorkflowBuilder will directly map to the `/build` API structure, making it easier to understand and maintain.
2. It will maintain backward compatibility with the existing API where possible, but some breaking changes may be necessary.
3. The implementation will focus on providing a good developer experience with comprehensive type safety and documentation.
4. Error handling will be improved to provide more helpful error messages.
5. The new design will make it easier to add new features in the future as the `/build` API evolves.

## Migration Guide

A migration guide will be provided to help users transition from the current WorkflowBuilder to the new one. This will include examples of how to convert existing code to use the new API.
