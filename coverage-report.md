# API Method Test Coverage Report

Generated on: 2025-07-08T13:26:23.182Z

## Summary

- Total API Methods: 58
- Methods with Unit Tests: 51 (87.9%)
- Methods with Integration Tests: 41 (70.7%)
- Methods with E2E Tests: 32 (55.2%)
- Fully Covered Methods: 39 (67.2%)

## Convenience Methods

| Method | Unit Test | Integration Test | E2E Test | Coverage |
|--------|-----------|------------------|----------|----------|
| client.addPage | ✅ | ❌ | ❌ | 🟡 Partial |
| client.applyInstantJson | ✅ | ✅ | ✅ | 🟢 Full |
| client.applyRedactions | ✅ | ✅ | ✅ | 🟢 Full |
| client.applyXfdf | ✅ | ✅ | ✅ | 🟢 Full |
| client.compress | ❌ | ❌ | ❌ | 🔴 None |
| client.convert | ✅ | ✅ | ❌ | 🟢 Full |
| client.createRedactionsAI | ❌ | ✅ | ❌ | 🟡 Partial |
| client.createRedactionsPreset | ✅ | ✅ | ✅ | 🟢 Full |
| client.createRedactionsRegex | ✅ | ✅ | ✅ | 🟢 Full |
| client.createRedactionsText | ✅ | ✅ | ✅ | 🟢 Full |
| client.createToken | ❌ | ✅ | ❌ | 🟡 Partial |
| client.deletePages | ✅ | ❌ | ❌ | 🟡 Partial |
| client.deleteToken | ❌ | ✅ | ❌ | 🟡 Partial |
| client.duplicatePages | ✅ | ❌ | ❌ | 🟡 Partial |
| client.extractKeyValuePairs | ✅ | ❌ | ❌ | 🟡 Partial |
| client.extractTable | ✅ | ❌ | ❌ | 🟡 Partial |
| client.extractText | ✅ | ✅ | ❌ | 🟢 Full |
| client.flatten | ✅ | ✅ | ✅ | 🟢 Full |
| client.getAccountInfo | ❌ | ✅ | ❌ | 🟡 Partial |
| client.merge | ✅ | ✅ | ❌ | 🟢 Full |
| client.ocr | ✅ | ✅ | ❌ | 🟢 Full |
| client.optimize | ✅ | ✅ | ❌ | 🟢 Full |
| client.passwordProtect | ✅ | ❌ | ❌ | 🟡 Partial |
| client.rotate | ✅ | ✅ | ✅ | 🟢 Full |
| client.setMetadata | ✅ | ❌ | ❌ | 🟡 Partial |
| client.setPageLabels | ✅ | ❌ | ❌ | 🟡 Partial |
| client.signPdf | ❌ | ✅ | ❌ | 🟡 Partial |
| client.splitPdf | ✅ | ❌ | ❌ | 🟡 Partial |
| client.watermarkImage | ✅ | ✅ | ✅ | 🟢 Full |
| client.watermarkText | ✅ | ✅ | ✅ | 🟢 Full |
| client.workflow | ✅ | ✅ | ✅ | 🟢 Full |

## Workflow Builder

| Method | Unit Test | Integration Test | E2E Test | Coverage |
|--------|-----------|------------------|----------|----------|
| workflow.addDocumentPart | ✅ | ❌ | ❌ | 🟡 Partial |
| workflow.addFilePart | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.addHtmlPart | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.addNewPage | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.applyAction | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.applyActions | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.dryRun | ✅ | ✅ | ❌ | 🟢 Full |
| workflow.execute | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.outputHtml | ✅ | ❌ | ❌ | 🟡 Partial |
| workflow.outputImage | ✅ | ❌ | ✅ | 🟢 Full |
| workflow.outputJson | ✅ | ❌ | ✅ | 🟢 Full |
| workflow.outputMarkdown | ✅ | ❌ | ❌ | 🟡 Partial |
| workflow.outputOffice | ✅ | ❌ | ✅ | 🟢 Full |
| workflow.outputPdf | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.outputPdfA | ✅ | ❌ | ✅ | 🟢 Full |
| workflow.outputPdfUA | ❌ | ✅ | ❌ | 🟡 Partial |

## Build Actions

| Method | Unit Test | Integration Test | E2E Test | Coverage |
|--------|-----------|------------------|----------|----------|
| BuildActions.applyInstantJson | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.applyRedactions | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.applyXfdf | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.createRedactionsPreset | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.createRedactionsRegex | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.createRedactionsText | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.flatten | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.ocr | ✅ | ✅ | ❌ | 🟢 Full |
| BuildActions.rotate | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.watermarkImage | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.watermarkText | ✅ | ✅ | ✅ | 🟢 Full |

## Missing E2E Coverage

The following methods lack E2E/Integration tests:

- **client.addPage** (Convenience Methods)
- **client.compress** (Convenience Methods)
- **client.deletePages** (Convenience Methods)
- **client.duplicatePages** (Convenience Methods)
- **client.extractKeyValuePairs** (Convenience Methods)
- **client.extractTable** (Convenience Methods)
- **client.passwordProtect** (Convenience Methods)
- **client.setMetadata** (Convenience Methods)
- **client.setPageLabels** (Convenience Methods)
- **client.splitPdf** (Convenience Methods)
- **workflow.addDocumentPart** (Workflow Builder)
- **workflow.outputHtml** (Workflow Builder)
- **workflow.outputMarkdown** (Workflow Builder)

## Test File Mapping

### integration.test.ts
- client.ocr
- client.watermarkText
- client.watermarkImage
- client.convert
- client.merge
- client.extractText
- client.flatten
- client.rotate
- client.workflow
- client.getAccountInfo
- client.createToken
- client.deleteToken
- client.signPdf
- client.createRedactionsAI
- client.applyInstantJson
- client.applyXfdf
- client.createRedactionsPreset
- client.createRedactionsRegex
- client.createRedactionsText
- client.applyRedactions
- client.optimize
- workflow.addFilePart
- workflow.addHtmlPart
- workflow.addNewPage
- workflow.applyActions
- workflow.applyAction
- workflow.outputPdf
- workflow.outputPdfUA
- workflow.execute
- workflow.dryRun
- BuildActions.ocr
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.watermarkImage
- BuildActions.flatten
- BuildActions.applyInstantJson
- BuildActions.applyXfdf
- BuildActions.createRedactionsText
- BuildActions.createRedactionsRegex
- BuildActions.createRedactionsPreset
- BuildActions.applyRedactions

### unit/build.test.ts
- client.ocr
- client.watermarkText
- client.watermarkImage
- client.flatten
- client.rotate
- client.applyInstantJson
- client.applyXfdf
- client.createRedactionsPreset
- client.createRedactionsRegex
- client.createRedactionsText
- client.applyRedactions
- BuildActions.ocr
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.watermarkImage
- BuildActions.flatten
- BuildActions.applyInstantJson
- BuildActions.applyXfdf
- BuildActions.createRedactionsText
- BuildActions.createRedactionsRegex
- BuildActions.createRedactionsPreset
- BuildActions.applyRedactions

### unit/client.test.ts
- client.ocr
- client.watermarkText
- client.watermarkImage
- client.convert
- client.merge
- client.extractText
- client.extractTable
- client.extractKeyValuePairs
- client.flatten
- client.rotate
- client.workflow
- client.passwordProtect
- client.setMetadata
- client.setPageLabels
- client.applyInstantJson
- client.applyXfdf
- client.createRedactionsPreset
- client.createRedactionsRegex
- client.createRedactionsText
- client.applyRedactions
- client.addPage
- client.optimize
- client.splitPdf
- client.duplicatePages
- client.deletePages
- BuildActions.ocr
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.watermarkImage
- BuildActions.flatten
- BuildActions.applyInstantJson
- BuildActions.applyXfdf
- BuildActions.createRedactionsText
- BuildActions.createRedactionsRegex
- BuildActions.createRedactionsPreset
- BuildActions.applyRedactions

### unit/workflow.test.ts
- client.ocr
- client.watermarkText
- client.flatten
- client.rotate
- client.applyXfdf
- workflow.addFilePart
- workflow.addHtmlPart
- workflow.addNewPage
- workflow.addDocumentPart
- workflow.applyActions
- workflow.applyAction
- workflow.outputPdf
- workflow.outputPdfA
- workflow.outputImage
- workflow.outputOffice
- workflow.outputJson
- workflow.outputHtml
- workflow.outputMarkdown
- workflow.execute
- workflow.dryRun
- BuildActions.ocr
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.flatten
- BuildActions.applyXfdf

### e2e-advanced.test.ts
- client.watermarkText
- client.watermarkImage
- client.flatten
- client.rotate
- client.workflow
- client.applyInstantJson
- client.applyXfdf
- client.createRedactionsPreset
- client.createRedactionsRegex
- client.createRedactionsText
- client.applyRedactions
- workflow.addFilePart
- workflow.addHtmlPart
- workflow.addNewPage
- workflow.applyActions
- workflow.applyAction
- workflow.outputPdf
- workflow.outputPdfA
- workflow.outputImage
- workflow.outputOffice
- workflow.outputJson
- workflow.execute
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.watermarkImage
- BuildActions.flatten
- BuildActions.applyInstantJson
- BuildActions.applyXfdf
- BuildActions.createRedactionsText
- BuildActions.createRedactionsRegex
- BuildActions.createRedactionsPreset
- BuildActions.applyRedactions

