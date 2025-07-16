# SearchMark

A powerful browser extension for Firefox and Chrome that enhances bookmark management with quick save functionality and advanced search capabilities.

## Development

### Setup
```bash
pnpm install
pnpm run dev
```

### Code Quality
This project uses [pre-commit](https://pre-commit.com/) hooks to ensure code quality:

- **Biome**: Linting and formatting for JavaScript/TypeScript/Vue files
- **Security scanning**: Detects secrets and potential vulnerabilities
- **File checks**: Trailing whitespace, file endings, YAML/JSON validation

To install pre-commit hooks:
```bash
pre-commit install
```

To run checks manually:
```bash
pre-commit run --all-files
```

### Available Scripts
- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run format` - Format code with Biome
- `pnpm run lint` - Lint code with Biome
- `pnpm run check` - Run Biome checks

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).
