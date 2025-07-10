#! /usr/bin/env node
const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, '..', 'LLM_DOC.md');

// Use process.cwd() as the actual root of the user's project
const userProjectRoot = process.cwd();
const outputDirectory = path.join(userProjectRoot, '.github');
const outputFile = path.join(outputDirectory, 'copilot-instructions.md');

// Relative path from user project to the README file
const relativePath = path.relative(userProjectRoot, docPath);

try {
  const rule = `
# Nutrient DWS TypeScript Client Usage
- Use the \`nutrient-dws-typescript-client\` package for operations with document processing operations including conversion, merging, compression, watermarking, signage, and text extraction.
- Package Documentation and Examples can be found at: \`${relativePath}\`
`
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  fs.appendFileSync(outputFile, `${rule}`);
  console.log(`📄 Updated CLAUDE.md to point to Nutrient DWS documentation at \`${relativePath}\`.`);
} catch (err) {
  console.error('Failed to update .github/copilot-instructions.md file:', err.message);
}