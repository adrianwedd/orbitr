# Contributing to Orbitr

First off, thank you for considering contributing to Orbitr! It's people like you that make Orbitr such a great tool for the music production community.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and expected**
* **Include screenshots if relevant**
* **Note your browser and OS version**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a detailed description of the suggested enhancement**
* **Provide specific examples to demonstrate the enhancement**
* **Describe the current behavior and expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/orbitr.git
cd orbitr

# Install dependencies
npm install

# Set up Python backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev
```

## Style Guide

### JavaScript/TypeScript

- Use TypeScript for all new components
- Follow the existing ESLint configuration
- Use functional components with hooks
- Prefer `const` over `let`, never use `var`
- Use meaningful variable names

```typescript
// Good
const calculateStepTiming = (bpm: number, swing: number) => {
  // Implementation
};

// Bad
const calc = (b, s) => {
  // Implementation
};
```

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

```
feat: Add euclidean rhythm generator

- Implements Bjorklund's algorithm for pattern generation
- Adds UI controls for steps and pulses
- Integrates with existing sequencer architecture

Closes #123
```

### Component Structure

```typescript
// components/ComponentName.tsx
import React from 'react';

interface ComponentNameProps {
  // Props interface
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  // Destructured props
}) => {
  // Hooks first
  // Handler functions
  // Render
  return (
    // JSX
  );
};
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Documentation

- Update README.md with details of changes to the interface
- Update ARCHITECTURE.md for structural changes
- Comment your code where necessary
- Create/update tests for your changes

## Recognition

Contributors who submit accepted PRs will be added to the [Contributors](#contributors) section in the README.

## Questions?

Feel free to open an issue with the tag "question" or reach out in our [Discord community](https://discord.gg/orbitr).

Thank you for contributing! 🎵
