# API Method Test Coverage Report

Generated on: 2025-06-25T23:42:30.117Z

## Summary

- Total API Methods: 33
- Methods with Unit Tests: 27 (81.8%)
- Methods with Integration Tests: 22 (66.7%)
- Methods with E2E Tests: 24 (72.7%)
- Fully Covered Methods: 27 (81.8%)

## Convenience Methods

| Method | Unit Test | Integration Test | E2E Test | Coverage |
|--------|-----------|------------------|----------|----------|
| client.compress | ❌ | ✅ | ❌ | 🟡 Partial |
| client.convert | ✅ | ✅ | ❌ | 🟢 Full |
| client.extractText | ❌ | ✅ | ❌ | 🟡 Partial |
| client.flatten | ✅ | ✅ | ✅ | 🟢 Full |
| client.merge | ❌ | ✅ | ❌ | 🟡 Partial |
| client.ocr | ✅ | ✅ | ❌ | 🟢 Full |
| client.rotate | ✅ | ✅ | ✅ | 🟢 Full |
| client.watermark | ✅ | ✅ | ❌ | 🟢 Full |
| client.workflow | ✅ | ✅ | ✅ | 🟢 Full |

## Workflow Builder

| Method | Unit Test | Integration Test | E2E Test | Coverage |
|--------|-----------|------------------|----------|----------|
| workflow.addDocumentPart | ✅ | ✅ | ❌ | 🟢 Full |
| workflow.addFilePart | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.addHtmlPart | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.addNewPage | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.applyAction | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.applyActions | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.dryRun | ✅ | ✅ | ❌ | 🟢 Full |
| workflow.execute | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.outputImage | ✅ | ❌ | ✅ | 🟢 Full |
| workflow.outputJson | ✅ | ❌ | ✅ | 🟢 Full |
| workflow.outputOffice | ✅ | ❌ | ✅ | 🟢 Full |
| workflow.outputPdf | ✅ | ✅ | ✅ | 🟢 Full |
| workflow.outputPdfA | ✅ | ❌ | ✅ | 🟢 Full |

## Build Actions

| Method | Unit Test | Integration Test | E2E Test | Coverage |
|--------|-----------|------------------|----------|----------|
| BuildActions.applyInstantJson | ✅ | ❌ | ✅ | 🟢 Full |
| BuildActions.applyRedactions | ✅ | ❌ | ✅ | 🟢 Full |
| BuildActions.applyXfdf | ✅ | ❌ | ✅ | 🟢 Full |
| BuildActions.createRedactionsPreset | ❌ | ❌ | ✅ | 🟡 Partial |
| BuildActions.createRedactionsRegex | ❌ | ❌ | ✅ | 🟡 Partial |
| BuildActions.createRedactionsText | ❌ | ❌ | ✅ | 🟡 Partial |
| BuildActions.flatten | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.ocr | ✅ | ✅ | ❌ | 🟢 Full |
| BuildActions.rotate | ✅ | ✅ | ✅ | 🟢 Full |
| BuildActions.watermarkImage | ✅ | ❌ | ✅ | 🟢 Full |
| BuildActions.watermarkText | ✅ | ✅ | ✅ | 🟢 Full |

## Missing E2E Coverage

✅ All API methods have E2E or Integration test coverage!

## Test File Mapping

### build.test.ts
- client.ocr
- client.flatten
- client.rotate
- BuildActions.ocr
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.watermarkImage
- BuildActions.flatten
- BuildActions.applyInstantJson
- BuildActions.applyXfdf
- BuildActions.applyRedactions

### client.test.ts
- client.ocr
- client.watermark
- client.convert
- client.workflow
- BuildActions.ocr

### integration.test.ts
- client.ocr
- client.watermark
- client.convert
- client.merge
- client.compress
- client.extractText
- client.flatten
- client.rotate
- client.workflow
- workflow.addFilePart
- workflow.addHtmlPart
- workflow.addNewPage
- workflow.addDocumentPart
- workflow.applyActions
- workflow.applyAction
- workflow.outputPdf
- workflow.execute
- workflow.dryRun
- BuildActions.ocr
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.flatten

### workflow.test.ts
- client.ocr
- client.flatten
- client.rotate
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
- workflow.execute
- workflow.dryRun
- BuildActions.ocr
- BuildActions.rotate
- BuildActions.watermarkText
- BuildActions.flatten

### e2e-advanced.test.ts
- client.flatten
- client.rotate
- client.workflow
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

