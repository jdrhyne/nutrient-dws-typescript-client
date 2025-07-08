#!/usr/bin/env node
/**
 * Test Coverage Report Generator
 * Analyzes which API methods have E2E test coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

interface CoverageItem {
  method: string;
  category: string;
  hasUnitTest: boolean;
  hasIntegrationTest: boolean;
  hasE2ETest: boolean;
  testFiles: string[];
}

class CoverageAnalyzer {
  private coverage: Map<string, CoverageItem> = new Map();
  private testDirectory = path.dirname(__filename);

  constructor() {
    this.initializeCoverageMap();
  }

  private initializeCoverageMap(): void {
    // Client convenience methods
    const convenienceMethods = [
      'ocr', 'watermarkText', 'watermarkImage', 'convert', 'merge',
      'extractText', 'extractTable', 'extractKeyValuePairs', 'flatten', 'rotate', 'workflow',
      'getAccountInfo', 'createToken', 'deleteToken', 'signPdf', 'createRedactionsAI',
      'passwordProtect', 'setMetadata', 'setPageLabels', 'applyInstantJson', 'applyXfdf',
      'createRedactionsPreset', 'createRedactionsRegex', 'createRedactionsText', 'applyRedactions',
      'addPage', 'optimize', 'splitPdf', 'duplicatePages', 'deletePages'
    ];

    for (const method of convenienceMethods) {
      this.coverage.set(`client.${method}`, {
        method: `client.${method}`,
        category: 'Convenience Methods',
        hasUnitTest: false,
        hasIntegrationTest: false,
        hasE2ETest: false,
        testFiles: []
      });
    }

    // Workflow builder methods
    const workflowMethods = [
      'addFilePart', 'addHtmlPart', 'addNewPage', 'addDocumentPart',
      'applyActions', 'applyAction', 'outputPdf', 'outputPdfA', 'outputPdfUA',
      'outputImage', 'outputOffice', 'outputJson', 'outputHtml', 'outputMarkdown',
      'execute', 'dryRun'
    ];

    for (const method of workflowMethods) {
      this.coverage.set(`workflow.${method}`, {
        method: `workflow.${method}`,
        category: 'Workflow Builder',
        hasUnitTest: false,
        hasIntegrationTest: false,
        hasE2ETest: false,
        testFiles: []
      });
    }

    // Build actions
    const buildActions = [
      'ocr', 'rotate', 'watermarkText', 'watermarkImage', 'flatten',
      'applyInstantJson', 'applyXfdf', 'createRedactionsText',
      'createRedactionsRegex', 'createRedactionsPreset', 'applyRedactions'
    ];

    for (const action of buildActions) {
      this.coverage.set(`BuildActions.${action}`, {
        method: `BuildActions.${action}`,
        category: 'Build Actions',
        hasUnitTest: false,
        hasIntegrationTest: false,
        hasE2ETest: false,
        testFiles: []
      });
    }
  }

  analyzeTestFiles(): void {
    this.scanDirectoryForTests(this.testDirectory);
  }

  private scanDirectoryForTests(directory: string): void {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        this.scanDirectoryForTests(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
        // Process test files
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Use relative path from test directory for consistent reporting
        const relativePath = path.relative(this.testDirectory, fullPath);
        this.analyzeTestFile(relativePath, content);
      }
    }
  }

  private analyzeTestFile(filename: string, content: string): void {
    // Determine test type
    const isUnit = filename.includes('client.test') || 
                   filename.includes('workflow.test') || 
                   filename.includes('build.test');
    const isIntegration = filename.includes('integration.test');
    const isE2E = filename.includes('e2e');

    // Analyze coverage
    for (const [key, item] of this.coverage) {
      const methodPattern = key.replace('.', '\\.');
      const patterns = [
        new RegExp(`${methodPattern}\\s*\\(`),
        new RegExp(`\\.${methodPattern.split('\\.').pop()}\\s*\\(`),
        new RegExp(`describe\\s*\\(\\s*['"\`].*${methodPattern}.*['"\`]`),
        new RegExp(`it\\s*\\(\\s*['"\`].*${methodPattern}.*['"\`]`)
      ];

      const hasTest = patterns.some(pattern => pattern.test(content));

      if (hasTest) {
        if (isUnit) item.hasUnitTest = true;
        if (isIntegration) item.hasIntegrationTest = true;
        if (isE2E) item.hasE2ETest = true;
        item.testFiles.push(filename);
      }
    }
  }

  generateReport(): string {
    let report = '# API Method Test Coverage Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;

    // Group by category
    const categories = new Map<string, CoverageItem[]>();
    for (const item of this.coverage.values()) {
      if (!categories.has(item.category)) {
        categories.set(item.category, []);
      }
      const categoryItems = categories.get(item.category);
      if (categoryItems) {
        categoryItems.push(item);
      }
    }

    // Generate summary
    report += '## Summary\n\n';
    const totalMethods = this.coverage.size;
    const withUnit = Array.from(this.coverage.values()).filter(i => i.hasUnitTest).length;
    const withIntegration = Array.from(this.coverage.values()).filter(i => i.hasIntegrationTest).length;
    const withE2E = Array.from(this.coverage.values()).filter(i => i.hasE2ETest).length;
    const fullyCovered = Array.from(this.coverage.values()).filter(i => 
      i.hasUnitTest && (i.hasIntegrationTest || i.hasE2ETest)
    ).length;

    report += `- Total API Methods: ${totalMethods}\n`;
    report += `- Methods with Unit Tests: ${withUnit} (${((withUnit/totalMethods)*100).toFixed(1)}%)\n`;
    report += `- Methods with Integration Tests: ${withIntegration} (${((withIntegration/totalMethods)*100).toFixed(1)}%)\n`;
    report += `- Methods with E2E Tests: ${withE2E} (${((withE2E/totalMethods)*100).toFixed(1)}%)\n`;
    report += `- Fully Covered Methods: ${fullyCovered} (${((fullyCovered/totalMethods)*100).toFixed(1)}%)\n\n`;

    // Detailed coverage by category
    for (const [category, items] of categories) {
      report += `## ${category}\n\n`;
      report += '| Method | Unit Test | Integration Test | E2E Test | Coverage |\n';
      report += '|--------|-----------|------------------|----------|----------|\n';

      for (const item of items.sort((a, b) => a.method.localeCompare(b.method))) {
        const unit = item.hasUnitTest ? '✅' : '❌';
        const integration = item.hasIntegrationTest ? '✅' : '❌';
        const e2e = item.hasE2ETest ? '✅' : '❌';
        const coverage = this.getCoverageLevel(item);

        report += `| ${item.method} | ${unit} | ${integration} | ${e2e} | ${coverage} |\n`;
      }
      report += '\n';
    }

    // Missing coverage section
    report += '## Missing E2E Coverage\n\n';
    const missingE2E = Array.from(this.coverage.values())
      .filter(i => !i.hasE2ETest && !i.hasIntegrationTest)
      .sort((a, b) => a.category.localeCompare(b.category) || a.method.localeCompare(b.method));

    if (missingE2E.length === 0) {
      report += '✅ All API methods have E2E or Integration test coverage!\n\n';
    } else {
      report += 'The following methods lack E2E/Integration tests:\n\n';
      for (const item of missingE2E) {
        report += `- **${item.method}** (${item.category})\n`;
      }
      report += '\n';
    }

    // Test file mapping
    report += '## Test File Mapping\n\n';
    const fileMap = new Map<string, string[]>();
    for (const item of this.coverage.values()) {
      for (const file of item.testFiles) {
        if (!fileMap.has(file)) {
          fileMap.set(file, []);
        }
        const fileMethods = fileMap.get(file);
        if (fileMethods) {
          fileMethods.push(item.method);
        }
      }
    }

    for (const [file, methods] of fileMap) {
      report += `### ${file}\n`;
      report += methods.map(m => `- ${m}`).join('\n');
      report += '\n\n';
    }

    return report;
  }

  private getCoverageLevel(item: CoverageItem): string {
    if (item.hasUnitTest && (item.hasIntegrationTest || item.hasE2ETest)) {
      return '🟢 Full';
    } else if (item.hasUnitTest || item.hasIntegrationTest || item.hasE2ETest) {
      return '🟡 Partial';
    } else {
      return '🔴 None';
    }
  }

  saveReport(outputPath: string): void {
    const report = this.generateReport();
    fs.writeFileSync(outputPath, report);
    // eslint-disable-next-line no-console
    console.log(`Coverage report saved to: ${outputPath}`);
  }

  printSummary(): void {
    // eslint-disable-next-line no-console
    console.log('\n📊 Test Coverage Summary\n');

    const totalMethods = this.coverage.size;
    const withE2E = Array.from(this.coverage.values()).filter(i => i.hasE2ETest || i.hasIntegrationTest).length;
    const percentage = ((withE2E / totalMethods) * 100).toFixed(1);

    // eslint-disable-next-line no-console
    console.log(`Total API Methods: ${totalMethods}`);
    // eslint-disable-next-line no-console
    console.log(`Methods with E2E/Integration Tests: ${withE2E} (${percentage}%)`);

    const missing = totalMethods - withE2E;
    if (missing > 0) {
      // eslint-disable-next-line no-console
      console.log(`\n⚠️  ${missing} methods need E2E test coverage`);
    } else {
      // eslint-disable-next-line no-console
      console.log('\n✅ All API methods have E2E test coverage!');
    }
  }
}

// Run the analyzer if executed directly and not in a test environment
if (process.env['NODE_ENV'] !== 'test' && !process.env['JEST_WORKER_ID']) {
  const analyzer = new CoverageAnalyzer();
  analyzer.analyzeTestFiles();
  analyzer.printSummary();
  analyzer.saveReport(path.join(path.dirname(__filename), '../../coverage-report.md'));
}

export { CoverageAnalyzer };
