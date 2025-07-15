#! /usr/bin/env node
const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, '..', 'LLM_DOC.md');
const typePath = path.join(__dirname, '../dist', 'index.d.ts');

// Use process.cwd() as the actual root of the user's project
const userProjectRoot = process.cwd();
const outputFile = path.join(userProjectRoot, 'CLAUDE.md');

// Relative path from user project to the README file
const relativeDocPath = path.relative(userProjectRoot, docPath);
const relativeTypePath = path.relative(userProjectRoot, typePath);

try {
  const rule = `
# Nutrient DWS TypeScript Client Usage
- Use the \`nutrient-dws-typescript-client\` package for operations with document processing operations including conversion, merging, compression, watermarking, signage, and text extraction.
- Package Documentation and Examples can be found at: ${relativeDocPath}
- TypeScript Type Definitions can be found at: ${relativeTypePath}
`
  fs.appendFileSync(outputFile, `${rule}`);
  console.log(`📄 Updated Claude Code Rules to point to Nutrient DWS documentation at ${relativeDocPath} and ${relativeTypePath}.`);
} catch (err) {
  console.error('Failed to update CLAUDE.md file:', err.message);
}