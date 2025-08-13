## Project Overview

This is a full-stack web application called Orbitr, an AI-powered circular step sequencer. The frontend is built with Next.js, React, and TypeScript, using Tailwind CSS for styling and Zustand for state management. The backend is a Python service using FastAPI to serve an AI model from Meta's AudioCraft for sample generation.

The application is designed as a musical instrument, allowing users to create polyphonic multi-track sequences and generate audio samples from text prompts.

## Building and Running

### Prerequisites

*   Node.js 18+ and npm
*   Python 3.9+

### Development

To run the application in development mode, which includes both the frontend and backend with hot-reloading:

```bash
npm run dev
```

This will start the Next.js frontend on `http://localhost:3000` and the FastAPI backend on `http://localhost:8000`.

### Frontend-only

To run only the Next.js frontend:

```bash
npm run dev:frontend
```

### Backend-only

To run only the Python backend:

```bash
npm run dev:backend
```

### Production Build

To build the application for production:

```bash
npm run build
```

To start the application in production mode:

```bash
npm run start
```

### Testing

To run the test suite:

```bash
npm test
```

To run the tests in watch mode:

```bash
npm run test:watch
```

To generate a test coverage report:

```bash
npm run test:coverage
```

## Development Conventions

### Linting and Formatting

This project uses ESLint for linting and Prettier for code formatting. To check for linting and formatting errors:

```bash
npm run lint
npm run format:check
```

To automatically fix linting and formatting errors:

```bash
npm run lint:fix
npm run format
```

A pre-commit hook is set up with Husky and lint-staged to automatically lint and format staged files before each commit.

### Type Checking

To check for TypeScript errors:

```bash
npm run type-check
```

### Contribution Guidelines

Contribution guidelines are available in `CONTRIBUTING.md`.
