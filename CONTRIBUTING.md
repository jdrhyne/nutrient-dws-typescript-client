# Contributing to Nutrient DWS TypeScript Client

Thank you for your interest in contributing to the Nutrient DWS TypeScript Client! This document outlines our development standards and practices.

## Development Standards

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) to ensure consistent and meaningful commit messages. This helps with:
- Automatic versioning
- Clear change logs
- Better collaboration

#### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

#### Examples

```bash
# Feature
feat(client): add convert document method
feat: implement file input validation

# Bug fix
fix(http): handle authentication token refresh
fix: resolve memory leak in workflow execution

# Documentation
docs: update API reference for client options
docs(readme): add installation instructions

# Refactoring
refactor(types): simplify operation interface hierarchy
refactor: extract case transformation to utils

# Build/tooling
build: add commitlint configuration
chore: update dependencies to latest versions
```

#### Scopes (Optional)

Use scopes to indicate which part of the codebase is affected:
- `client` - Main NutrientClient class
- `workflow` - WorkflowBuilder functionality
- `http` - HTTP layer and requests
- `types` - TypeScript interfaces and types
- `utils` - Utility functions
- `errors` - Error handling
- `inputs` - File input processing

### Making Commits

#### Option 1: Using Commitizen (Recommended)
```bash
# Stage your changes
git add .

# Use commitizen for guided commit creation
npm run commit
```

#### Option 2: Manual Commits
```bash
# Ensure your commit message follows the convention
git commit -m "feat(client): add document conversion method"
```

### Commit Best Practices

#### Atomic Commits
- **One logical change per commit**
- Each commit should represent a complete, working change
- If you need to add multiple files for one feature, commit them together

#### Good Examples:
```bash
feat(types): add FileInput interface
feat(types): add type guards for file validation
feat(inputs): implement file input processor
test(inputs): add unit tests for file input processor
```

#### Bad Examples:
```bash
# Too broad - multiple unrelated changes
feat: add types, fix bugs, update docs

# Too granular - incomplete changes
feat: start adding types
fix: continue fixing bug from previous commit
```

#### Commit Message Guidelines

1. **Use imperative mood**: "add feature" not "added feature"
2. **Be concise but descriptive**: Explain what and why, not how
3. **Reference issues when applicable**: "fixes #123" or "closes #456"
4. **Keep the subject line under 50 characters**
5. **Use body for additional context when needed**

#### Examples with Body:

```bash
feat(workflow): add parallel execution support

Allow multiple operations to run concurrently when they don't
depend on each other's outputs. This improves performance for
complex workflows with independent operations.

Closes #45
```

```bash
fix(http): handle network timeout errors

Previously, network timeouts would cause uncaught exceptions.
Now they are properly caught and converted to NutrientError
instances with appropriate error codes.

Fixes #78
```

### Development Workflow

1. **Create feature branch**: `git checkout -b feat/your-feature-name`
2. **Make atomic commits**: Small, focused changes
3. **Write tests**: Ensure your changes are tested
4. **Run linting**: `npm run lint:fix`
5. **Run tests**: `npm test`
6. **Create pull request**: Use clear description

### Code Quality Standards

- **TypeScript strict mode**: All code must pass strict type checking
- **ESLint compliance**: Follow configured linting rules
- **Test coverage**: Maintain >90% test coverage
- **Documentation**: Add JSDoc comments for public APIs

### Pre-commit Hooks

Our pre-commit hooks will:
- Run ESLint and fix auto-fixable issues
- Format code with Prettier
- Validate commit messages against conventional commit format

### Questions?

If you have questions about these guidelines or need help with contributions, please:
- Open an issue for discussion
- Check existing issues and discussions
- Review the project documentation

Thank you for contributing to making this library better!