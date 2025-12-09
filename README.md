# ACE - Agentic Context Engineering

A TypeScript implementation of **Agentic Context Engineering (ACE)** using the Claude Code Agent SDK.

Based on the paper: ["Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models"](https://arxiv.org/abs/2510.04618) by Zhang et al.

## Overview

ACE treats contexts as **evolving playbooks** that accumulate, refine, and organize strategies through a modular process of:

1. **Generation** - Produces reasoning trajectories for tasks
2. **Reflection** - Extracts insights from successes and failures
3. **Curation** - Integrates insights into structured knowledge

Unlike traditional approaches that rely on weight updates, ACE enables LLMs to self-improve through context adaptation.

## Key Features

- ✅ **Generator Component**: Creates detailed reasoning trajectories
- ✅ **Reflector Component**: Analyzes trajectories to extract actionable insights
- ✅ **Curator Component**: Manages incremental playbook updates with deduplication and pruning
- ✅ **Playbook Management**: Evolving knowledge base that grows and refines over time
- ✅ **Comparative Reflection**: Compares successful and failed trajectories
- ✅ **Training Pipeline**: Process multiple tasks to build domain expertise
- ✅ **Export/Import**: Save and load playbooks as JSON

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with your Anthropic API key:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

## Quick Start

```typescript
import { ACE, Task } from './src';
import { v4 as uuidv4 } from 'uuid';

// Configure ACE
const config = {
  modelName: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxTokens: 4096,
  temperature: 0.7,
  generatorConfig: {
    includePlaybook: true,
  },
};

const ace = new ACE(config);

// Create a task
const task: Task = {
  id: uuidv4(),
  query: 'What is the sum of all prime numbers between 1 and 20?',
};

// Process the task
const result = await ace.processTask(task, async (answer) => {
  return answer.includes('77');
});

console.log('Answer:', result.trajectory.answer);
console.log('Insights:', result.insights.length);
console.log('Playbook:', ace.getPlaybookContext());
```

## Architecture

### The Three-Component System

```
┌─────────────┐
│  Generator  │  Produces reasoning trajectories
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Reflector  │  Extracts insights from trajectories
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Curator   │  Integrates insights into playbook
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Playbook   │  Evolving knowledge base
└─────────────┘
```

### Generator

The Generator produces reasoning trajectories by:
- Leveraging the current playbook context
- Creating detailed step-by-step reasoning
- Exploring both successful strategies and potential pitfalls

### Reflector

The Reflector analyzes trajectories to:
- Compare successful and failed attempts
- Extract domain-specific insights
- Identify patterns and anti-patterns
- Assign confidence scores

### Curator

The Curator maintains playbook quality through:
- **Incremental Delta Updates**: Localized edits instead of full rewrites
- **Deduplication**: Merging similar strategies
- **Pruning**: Removing low-confidence strategies
- **Structured Organization**: Categorizing insights by domain

### Playbook

The Playbook is an evolving knowledge base that:
- Accumulates strategies over time
- Organizes knowledge by categories
- Tracks helpful and harmful patterns
- Maintains confidence scores

## Usage Examples

### Example 1: Single Task Processing

```typescript
const result = await ace.processTask(task, evaluator);
```

### Example 2: Batch Processing

```typescript
const results = await ace.processBatch(tasks, evaluator);
```

### Example 3: Comparative Reflection

```typescript
const { results, comparativeInsights } = await ace.processWithComparison(
  tasks,
  evaluator,
  3 // trajectories per task
);
```

### Example 4: Training

```typescript
const { results, finalPlaybook, stats } = await ace.train(
  tasks,
  evaluator,
  {
    batchSize: 10,
    compareEveryNBatches: 5,
    onProgress: (progress) => {
      console.log(`Progress: ${progress.completed}/${progress.total}`);
    },
  }
);
```

### Example 5: Export/Import Playbook

```typescript
// Export
const json = ace.exportPlaybook();
fs.writeFileSync('playbook.json', json);

// Import
const loadedJson = fs.readFileSync('playbook.json', 'utf-8');
ace.loadPlaybook(loadedJson);
```

## Running Examples

```bash
# Build the project
npm run build

# Run the example
npm run dev
```

## Testing

The ACE framework includes comprehensive unit and integration tests.

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests (requires API key)

```bash
export ANTHROPIC_API_KEY=your_api_key_here
npm run test:integration
```

### Generate Coverage Report

```bash
npm run test:coverage
```

### Test Structure

- **Unit Tests** (`tests/unit/`): Test individual components in isolation
  - PlaybookManager tests
  - Curator tests
  - Fast execution, no API calls required

- **Integration Tests** (`tests/integration/`): Test complete workflows
  - End-to-end ACE processing
  - Real API calls (requires ANTHROPIC_API_KEY)
  - Validates entire pipeline

For detailed testing information, see [TESTING.md](./TESTING.md).

## Configuration Options

### ACEConfig

```typescript
interface ACEConfig {
  modelName: string;              // Claude model to use
  apiKey: string;                 // Anthropic API key
  maxTokens?: number;             // Max tokens per request (default: 4096)
  temperature?: number;           // Temperature (default: 0.7)

  // Generator configuration
  generatorConfig?: {
    maxTrajectories?: number;     // Max trajectories to generate
    includePlaybook?: boolean;    // Include playbook in prompts
  };

  // Reflector configuration
  reflectorConfig?: {
    minConfidence?: number;       // Min confidence threshold (default: 0.3)
    compareSuccessAndFailure?: boolean;
  };

  // Curator configuration
  curatorConfig?: {
    deduplicationThreshold?: number;  // Similarity threshold (default: 0.7)
    pruningThreshold?: number;        // Pruning threshold (default: 0.3)
    maxStrategiesPerSection?: number;
  };
}
```

## Key Innovations

### 1. Dedicated Reflector
Separates evaluation and insight extraction from curation, improving context quality.

### 2. Incremental Delta Updates
Replaces costly monolithic rewrites with localized edits that preserve prior knowledge.

### 3. Grow-and-Refine Mechanism
Balances steady context expansion with redundancy control through:
- Semantic deduplication
- Deterministic merging
- Confidence-based pruning

## Performance Benefits

Based on the original paper, ACE provides:
- **+10.6%** improvement on agent tasks
- **+8.6%** improvement on finance tasks
- Significant reduction in adaptation latency
- Lower rollout costs

## Project Structure

```
ace-claude-sdk/
├── src/
│   ├── types.ts           # Core type definitions
│   ├── playbook.ts        # Playbook management
│   ├── generator.ts       # Generator component
│   ├── reflector.ts       # Reflector component
│   ├── curator.ts         # Curator component
│   ├── ace.ts             # Main ACE orchestration
│   ├── index.ts           # Public exports
│   └── example.ts         # Usage examples
├── package.json
├── tsconfig.json
└── README.md
```

## API Reference

### ACE

#### Methods

- `processTask(task, evaluator?)`: Process a single task
- `processBatch(tasks, evaluator?)`: Process multiple tasks
- `processWithComparison(tasks, evaluator, trajectoriesPerTask)`: Use comparative reflection
- `train(tasks, evaluator, options)`: Train on a dataset
- `getPlaybookContext()`: Get formatted playbook
- `exportPlaybook()`: Export as JSON
- `loadPlaybook(json)`: Import from JSON
- `resetPlaybook()`: Reset to empty state
- `getStats()`: Get system statistics

### PlaybookManager

#### Methods

- `getPlaybook()`: Get current playbook
- `applyUpdate(update)`: Apply delta update
- `getFormattedContext()`: Get formatted context
- `export()`: Export to JSON
- `import(json)`: Import from JSON (static)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Citation

If you use this implementation, please cite the original paper:

```bibtex
@article{zhang2025ace,
  title={Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models},
  author={Zhang, Qizheng and Hu, Changran and Upasani, Shubhangi and Ma, Boyuan and Hong, Fenglu and Kamanuru, Vamsidhar and Rainton, Jay and Wu, Chen and Ji, Mengmeng and Li, Hanchen and Thakker, Urmish and Zou, James and Olukotun, Kunle},
  journal={arXiv preprint arXiv:2510.04618},
  year={2025}
}
```

## License

MIT

## References

- [Original Paper (arXiv)](https://arxiv.org/abs/2510.04618)
- [Official GitHub Repository](https://github.com/ace-agent/ace)
- [Claude API Documentation](https://docs.anthropic.com/)

## Support

For issues and questions:
- Open an issue on GitHub
- Check the examples in `src/example.ts`
- Review the API documentation above
