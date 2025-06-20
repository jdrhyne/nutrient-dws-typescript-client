# Nutrient DWS TypeScript Client

TypeScript client library for Nutrient Document Web Services (DWS) API

## Development

### Contributing

We follow strict development standards to ensure code quality and maintainability. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

#### Quick Start for Contributors

1. **Clone and setup**:
   ```bash
   git clone https://github.com/jdrhyne/nutrient-dws-typescript-client.git
   cd nutrient-dws-typescript-client
   npm install
   ```

2. **Make changes following atomic commit practices**:
   ```bash
   # Create feature branch
   git checkout -b feat/your-feature-name
   
   # Make small, focused changes
   # Each commit should represent one logical change
   ```

3. **Use conventional commits**:
   ```bash
   # Option 1: Use commitizen (recommended)
   npm run commit
   
   # Option 2: Manual commit with conventional format
   git commit -m "feat(client): add document conversion method"
   ```

#### Commit Message Examples

```bash
# Features
feat(client): add convert document method
feat(workflow): implement step chaining
feat(types): add file input validation

# Bug fixes
fix(http): handle authentication errors properly
fix(inputs): resolve file path resolution issue

# Documentation
docs(api): update client options interface
docs: add usage examples for workflows

# Build/tooling
build: configure commitlint validation
chore: update dependencies to latest versions
```

### Development Scripts

```bash
npm run build          # Build all outputs (ESM, CJS, types)
npm run test           # Run test suite
npm run lint           # Check code quality
npm run format         # Format code with Prettier
npm run typecheck      # Validate TypeScript
npm run commit         # Create conventional commit (recommended)
```

### Project Structure

```
src/
├── types/           # TypeScript interfaces and types
├── utils/           # Utility functions
├── client.ts        # Main NutrientClient class
├── workflow.ts      # WorkflowBuilder class
├── errors.ts        # Error classes
├── inputs.ts        # Input handling
├── http.ts          # HTTP layer
└── index.ts         # Public exports
```

For detailed contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
