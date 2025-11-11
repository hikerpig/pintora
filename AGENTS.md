# Pintora Architecture Overview

## Project Overview

Pintora is an extensible JavaScript text-to-diagram library that supports both browser and Node.js environments. The project adopts a monorepo architecture and uses pnpm workspaces to manage multiple related packages.

### Core Architecture

- **pintora-core**: Core engine providing diagram registration, theme management, and configuration system
- **pintora-diagrams**: Implementation of various diagram types (sequence diagrams, ER diagrams, component diagrams, etc.)
- **pintora-renderer**: Rendering engine supporting SVG and Canvas output
- **pintora-standalone**: Standalone version integrating all functionalities
- **pintora-cli**: Command line tool
- **pintora-target-wintercg**: WinterCG compatible version

### Supported Diagram Types

- Sequence Diagram
- ER Diagram (Entity Relationship Diagram)
- Component Diagram
- Activity Diagram
- Mind Map
- Gantt Diagram
- DOT Diagram
- Class Diagram

## Build and Development Commands

### Core Commands

```bash
# Install dependencies
pnpm install

# Compile all packages
pnpm compile

# Compile browser version (excluding CLI)
pnpm compile:browser

# Run tests
pnpm test

# Run tests and generate coverage report
pnpm coverage

# Format code
pnpm format

# Check code format
pnpm format:check

# Lint code
pnpm lint

# Development in watch mode
pnpm watch

# Clean build files
pnpm clean
```

### Development Environment

```bash
# Start demo site
pnpm demo:dev

# Start documentation site
pnpm website:dev

# Build sites
pnpm build-site
```

### Testing Related

```bash
# Run all tests
pnpm test

# Generate coverage report
pnpm coverage

# CI environment tests
pnpm ci:coverage

# Upload coverage report
pnpm upload-coverage
```

## Code Style

### ESLint Configuration

- Using TypeScript ESLint ruleset
- Enabled Prettier integration
- Enabled unused import detection

### Formatting Rules

- Using Prettier for code formatting
- Supporting TypeScript and JavaScript files
- Integrated with lint-staged for automatic formatting and fixing before commits

- Using TypeScript strict mode
- Following modular architecture, each diagram type is independent
- Using clear file naming, such as `artist.ts`, `parser.ts`, `config.ts`

## Testing Framework

### Jest Configuration

- Using Jest as the testing framework
- Supporting TypeScript and JavaScript test files
- Using esbuild-jest for fast transformation
- Generating JUnit format test reports to `reports` directory

### Testing Environment

- **pintora-core**: Basic test configuration
- **pintora-diagrams**: jsdom environment, supporting D3 library tests
- **pintora-cli**: Basic test configuration
- **pintora-standalone**: Basic test configuration

### Test Coverage

- Target coverage: 95%
- Threshold: 5%
- Using codecov for coverage reporting

### Test File Patterns

- Test file naming: `*.spec.ts`, `*.spec.js`, `*.test.ts`, `*.test.js`
- Snapshot testing: Using Jest snapshot feature for regression testing

## Security Considerations

### Code Security

- No environment variable files (.env)
- Using TypeScript strict mode to reduce runtime errors
- Regular dependency updates (configured with renovate.json)

### Dependency Management

- Using pnpm for dependency management, providing better consistency
- Regular security scans and dependency updates
- Using workspace protocol to manage internal dependencies

### Deployment Security

- Supporting Vercel deployment
- Using HTTPS certificates (vite-plugin-mkcert)
- Supporting PWA functionality

## Configuration Management

### TypeScript Configuration

- Target: ES2019
- Module system: ES6
- Strict mode enabled
- Declaration file generation supported
- Sourcemap enabled

### Build Configuration

- Using Turbo for parallel build optimization
- Supporting watch mode development
- Output directories: `lib/`, `dist/`, `types/`

### Package Management

- Using pnpm workspaces to manage multiple packages
- Internal packages using workspace protocol
- Supporting changesets for version management

### Environment Configuration

- Supporting development, testing, and production environments
- Using Vite for development server and build
- Supporting hot reloading and module replacement

## Development Recommendations

1. **Modular Development**: Each diagram type should remain independent and follow unified interface specifications
2. **Test-Driven**: Write tests for new features and maintain high coverage
3. **Type Safety**: Make full use of TypeScript's type system
4. **Performance Optimization**: Pay attention to rendering performance, especially when handling large diagrams
5. **Compatibility**: Ensure code works properly in both browser and Node.js environments

## Related Resources

- [Online Documentation](http://pintorajs.vercel.app/docs/intro/)
- [Online Editor](http://pintorajs.vercel.app/demo/live-editor/)
- [VSCode Extension](https://marketplace.visualstudio.com/items?itemName=hikerpig.pintora-vscode)
