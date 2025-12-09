# Testing Guide

This document describes the testing strategy and how to run tests for the ACE framework.

## Test Structure

```
tests/
├── helpers/
│   ├── mock-anthropic.ts    # Mock Anthropic client for testing
│   └── test-fixtures.ts      # Test data and fixtures
├── unit/
│   ├── playbook.test.ts      # PlaybookManager unit tests
│   └── curator.test.ts       # Curator unit tests
└── integration/
    └── ace.test.ts           # Full ACE integration tests
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Watch Mode (for development)

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Test Categories

### Unit Tests

Unit tests focus on individual components in isolation:

- **PlaybookManager** (`tests/unit/playbook.test.ts`)
  - Initialization
  - Adding strategies
  - Updating strategies
  - Pruning low-confidence strategies
  - Formatting context
  - Export/Import functionality
  - Metadata tracking

- **Curator** (`tests/unit/curator.test.ts`)
  - Insight curation
  - Delta update creation
  - Deduplication
  - Statistics tracking
  - Configuration options

Unit tests run quickly and don't require API keys.

### Integration Tests

Integration tests verify the complete ACE pipeline:

- **ACE Framework** (`tests/integration/ace.test.ts`)
  - Single task processing
  - Batch processing
  - Comparative reflection
  - Playbook management
  - Training pipeline
  - Statistics tracking
  - Error handling
  - Configuration options

**Note:** Integration tests require a valid `ANTHROPIC_API_KEY` environment variable.

## Environment Setup

### For Unit Tests

No special setup required. Unit tests use mocks and don't make API calls.

```bash
npm run test:unit
```

### For Integration Tests

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
npm run test:integration
```

Or create a `.env` file:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

**Important:** Integration tests make real API calls and will incur costs. Tests are designed to use minimal tokens but you should monitor usage.

## Test Helpers

### Mock Anthropic Client

The `mock-anthropic.ts` helper provides a mock Anthropic client for unit tests:

```typescript
import { createMockAnthropicClient, createSuccessResponse } from '../helpers/mock-anthropic';

const mockClient = createMockAnthropicClient();
mockClient._mock.setResponse('keyword', createSuccessResponse('42'));
```

### Test Fixtures

The `test-fixtures.ts` helper provides sample data:

```typescript
import {
  createTestTask,
  createTestTrajectory,
  createTestInsight,
  mathTasks,
  sampleInsights
} from '../helpers/test-fixtures';

const task = createTestTask('What is 2 + 2?');
const insight = createTestInsight('Verify calculations', 'helpful', 'Math');
```

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { YourComponent } from '../../src/your-component';

describe('YourComponent', () => {
  let component: YourComponent;

  beforeEach(() => {
    component = new YourComponent();
  });

  describe('Feature Name', () => {
    it('should do something', () => {
      const result = component.doSomething();
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      expect(() => component.invalidOperation()).toThrow();
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { ACE } from '../../src/ace';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe('Integration Test', () => {
  it.skipIf(!hasApiKey)('should test with real API', async () => {
    const ace = new ACE({
      modelName: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const result = await ace.processTask(task);
    expect(result).toBeDefined();
  }, 30000); // 30 second timeout
});
```

## Test Coverage

Current test coverage includes:

- ✅ PlaybookManager (100% core functionality)
- ✅ Curator (deduplication, curation, statistics)
- ✅ ACE orchestration (single task, batch, comparative)
- ✅ Export/Import functionality
- ✅ Configuration options
- ✅ Error handling

### Viewing Coverage

```bash
npm run test:coverage
```

This generates:
- Terminal summary
- HTML report in `coverage/index.html`
- JSON report in `coverage/coverage-final.json`

## Best Practices

### 1. Keep Tests Fast

- Use mocks for unit tests
- Minimize API calls in integration tests
- Use appropriate timeouts

### 2. Test Isolation

```typescript
beforeEach(() => {
  // Reset state before each test
  component = new Component();
});
```

### 3. Descriptive Names

```typescript
it('should deduplicate similar insights when threshold is met', () => {
  // Test implementation
});
```

### 4. Test Edge Cases

```typescript
it('should handle empty input', () => {
  expect(process([])).toEqual([]);
});

it('should handle invalid data', () => {
  expect(() => process(null)).toThrow();
});
```

### 5. Use Test Fixtures

```typescript
// Good
const task = createTestTask('What is 2 + 2?');

// Avoid
const task = { id: '123', query: 'What is 2 + 2?' };
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - name: Integration Tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npm run test:integration
      - run: npm run test:coverage
```

## Debugging Tests

### Run Single Test File

```bash
npx vitest tests/unit/playbook.test.ts
```

### Run Single Test Case

```bash
npx vitest -t "should add a new strategy"
```

### Enable Debug Output

```typescript
it('should debug issue', () => {
  console.log('Debug info:', result);
  expect(result).toBe(expected);
});
```

### Use Vitest UI

```bash
npx vitest --ui
```

## Common Issues

### Issue: Tests Timeout

**Solution:** Increase timeout for API-heavy tests

```typescript
it('slow test', async () => {
  // Test code
}, 60000); // 60 seconds
```

### Issue: API Key Not Found

**Solution:** Ensure environment variable is set

```bash
export ANTHROPIC_API_KEY=your_key
npm test
```

### Issue: Random Test Failures

**Solution:** Check for shared state between tests

```typescript
beforeEach(() => {
  // Reset all state
});
```

### Issue: Mock Not Working

**Solution:** Verify mock is properly configured

```typescript
const mock = createMockAnthropicClient();
mock._mock.setResponse('keyword', response);
```

## Performance Testing

While not included in the standard test suite, you can benchmark performance:

```typescript
import { performance } from 'perf_hooks';

it('should process quickly', async () => {
  const start = performance.now();
  await ace.processTask(task);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(5000); // 5 seconds
});
```

## Test Data Management

### Fixtures Location

- Sample tasks: `tests/helpers/test-fixtures.ts`
- Mock responses: `tests/helpers/mock-anthropic.ts`

### Adding New Fixtures

```typescript
// tests/helpers/test-fixtures.ts
export const codingTasks: Task[] = [
  createTestTask('Write a function to reverse a string'),
  createTestTask('Implement binary search'),
];
```

## Coverage Goals

Target coverage levels:

- **Unit Tests:** > 80% coverage
- **Integration Tests:** Key workflows covered
- **Critical Paths:** 100% coverage (export/import, update operations)

## Related Documentation

- [README.md](./README.md) - Main documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [QUICKSTART.md](./QUICKSTART.md) - Getting started guide

## Contributing Tests

When adding new features:

1. Write unit tests first (TDD)
2. Add integration tests for workflows
3. Update test fixtures as needed
4. Run full test suite before committing
5. Update this documentation if needed

```bash
# Before committing
npm run test:coverage
# Ensure coverage meets standards
```

## Questions?

- Check existing test files for examples
- Review Vitest documentation: https://vitest.dev/
- Open an issue for test-related questions
