## Project Overview

This is a full-stack web application called Orbitr, an AI-powered circular step sequencer. The frontend is built with Next.js, React, and TypeScript, using Tailwind CSS for styling and Zustand for state management. The backend is a Python service using FastAPI to serve an AI model from Meta's AudioCraft for sample generation.

The application is designed as a musical instrument, allowing users to create polyphonic multi-track sequences and generate audio samples from text prompts.

## Building and Running

### Prerequisites

*   Node.js 18+ and pnpm (`npm install -g pnpm`)
*   Python 3.9+

### Development

To run the application in development mode, which includes both the frontend and backend with hot-reloading:

```bash
pnpm dev
```

This will start the Next.js frontend on `http://localhost:3000` and the FastAPI backend on `http://localhost:8000`.

### Frontend-only

To run only the Next.js frontend:

```bash
pnpm dev:frontend
```

### Backend-only

To run only the Python backend:

```bash
pnpm dev:backend
```

### Production Build

To build the application for production:

```bash
pnpm run build
```

To start the application in production mode:

```bash
pnpm run start
```

### Testing

To run the test suite:

```bash
pnpm test
```

To run the tests in watch mode:

```bash
pnpm run test:watch
```

To generate a test coverage report:

```bash
pnpm run test:coverage
```

## Development Conventions

### Linting and Formatting

This project uses ESLint for linting and Prettier for code formatting. To check for linting and formatting errors:

```bash
pnpm run lint
pnpm run format:check
```

To automatically fix linting and formatting errors:

```bash
pnpm run lint:fix
pnpm run format
```

A pre-commit hook is set up with Husky and lint-staged to automatically lint and format staged files before each commit.

### Type Checking

To check for TypeScript errors:

```bash
pnpm run type-check
```

### Contribution Guidelines

Contribution guidelines are available in `CONTRIBUTING.md`.
