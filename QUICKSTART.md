# ACE Framework - Quick Start Guide

Get started with ACE (Agentic Context Engineering) in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Anthropic API key ([get one here](https://console.anthropic.com/))

## Installation

```bash
# Clone or download the project
cd ace-claude-sdk

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

## Your First ACE Program

Create a file `my-first-ace.ts`:

```typescript
import { ACE } from './src';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  // 1. Configure ACE
  const ace = new ACE({
    modelName: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    generatorConfig: {
      includePlaybook: true,  // Use accumulated knowledge
    },
  });

  // 2. Define a task
  const task = {
    id: uuidv4(),
    query: 'What are the first 5 prime numbers?',
  };

  // 3. Process the task
  const result = await ace.processTask(task);

  // 4. View the results
  console.log('Question:', result.task.query);
  console.log('Answer:', result.trajectory.answer);
  console.log('Insights learned:', result.insights.length);

  // 5. See the evolving playbook
  console.log('\nPlaybook:', ace.getPlaybookContext());
}

main();
```

Run it:
```bash
npx tsx my-first-ace.ts
```

## Example Workflows

### Workflow 1: Single Task with Evaluation

```typescript
const task = {
  id: uuidv4(),
  query: 'Calculate 15 × 12',
};

// Define an evaluator
const isCorrect = async (answer: string) => {
  return answer.includes('180');
};

const result = await ace.processTask(task, isCorrect);
console.log('Success:', result.trajectory.success);
```

### Workflow 2: Process Multiple Tasks

```typescript
const tasks = [
  { id: uuidv4(), query: 'What is 5! (5 factorial)?' },
  { id: uuidv4(), query: 'Is 29 a prime number?' },
  { id: uuidv4(), query: 'Find GCD of 48 and 18' },
];

const results = await ace.processBatch(tasks);
results.forEach((r, i) => {
  console.log(`Task ${i + 1}: ${r.trajectory.answer}`);
});
```

### Workflow 3: Learn from Successes and Failures

```typescript
const tasks = [
  { id: uuidv4(), query: 'Solve: 2x + 3 = 11' },
  { id: uuidv4(), query: 'Solve: 5x - 7 = 18' },
];

const evaluator = async (answer: string) => {
  // Check if answer contains correct value
  return answer.includes('x = 4') || answer.includes('x = 5');
};

const { results, comparativeInsights } = await ace.processWithComparison(
  tasks,
  evaluator,
  3  // Generate 3 attempts per task
);

console.log('Learned insights:', comparativeInsights.length);
comparativeInsights.forEach(insight => {
  console.log(`- [${insight.type}] ${insight.content}`);
});
```

### Workflow 4: Train on a Dataset

```typescript
// Load your dataset
const dataset = [
  { id: uuidv4(), query: 'Question 1...' },
  { id: uuidv4(), query: 'Question 2...' },
  // ... more tasks
];

// Train
const { results, finalPlaybook, stats } = await ace.train(
  dataset,
  evaluator,
  {
    batchSize: 10,
    compareEveryNBatches: 5,
    onProgress: (p) => {
      console.log(`${p.completed}/${p.total} - Playbook: ${p.currentPlaybookSize} strategies`);
    },
  }
);

console.log('Training complete!');
console.log('Success rate:', (stats.successfulTasks / stats.totalTasks * 100).toFixed(1) + '%');
console.log('Insights extracted:', stats.totalInsights);
```

### Workflow 5: Save and Load Playbooks

```typescript
// After training, save the playbook
const playbookJson = ace.exportPlaybook();
require('fs').writeFileSync('my-playbook.json', playbookJson);

// Later, load it
const savedPlaybook = require('fs').readFileSync('my-playbook.json', 'utf-8');
ace.loadPlaybook(savedPlaybook);

// Now the agent has all the accumulated knowledge!
```

## Common Patterns

### Pattern 1: Domain-Specific Agent

```typescript
// Create a math tutor
const mathTutor = new ACE({
  modelName: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  generatorConfig: {
    includePlaybook: true,
  },
});

// Train on math problems
const mathProblems = [...];  // Your math dataset
await mathTutor.train(mathProblems, mathEvaluator);

// Save for later use
fs.writeFileSync('math-tutor-playbook.json', mathTutor.exportPlaybook());
```

### Pattern 2: Continuous Learning

```typescript
// Load existing knowledge
ace.loadPlaybook(fs.readFileSync('playbook.json', 'utf-8'));

// Process new tasks
while (true) {
  const newTask = await getNextTask();
  const result = await ace.processTask(newTask);

  // Periodically save
  if (needsCheckpoint()) {
    fs.writeFileSync('playbook.json', ace.exportPlaybook());
  }
}
```

### Pattern 3: A/B Testing Strategies

```typescript
// Agent without playbook
const baselineAgent = new ACE({
  modelName: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  generatorConfig: {
    includePlaybook: false,  // Don't use playbook
  },
});

// Agent with playbook
const aceAgent = new ACE({
  modelName: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  generatorConfig: {
    includePlaybook: true,  // Use playbook
  },
});

// Train ACE agent first
await aceAgent.train(trainingData, evaluator);

// Compare performance
const testTasks = [...];
const baselineResults = await baselineAgent.processBatch(testTasks, evaluator);
const aceResults = await aceAgent.processBatch(testTasks, evaluator);

const baselineSuccess = baselineResults.filter(r => r.trajectory.success).length;
const aceSuccess = aceResults.filter(r => r.trajectory.success).length;

console.log('Baseline success rate:', baselineSuccess / testTasks.length);
console.log('ACE success rate:', aceSuccess / testTasks.length);
```

## Debugging Tips

### View Reasoning Process

```typescript
const result = await ace.processTask(task);
console.log('Reasoning:\n', result.trajectory.reasoning);
console.log('Answer:', result.trajectory.answer);
```

### Monitor Playbook Growth

```typescript
const stats = ace.getStats();
console.log('Playbook version:', stats.playbookVersion);
console.log('Total sections:', stats.totalSections);
console.log('Total strategies:', stats.totalStrategies);
console.log('Last updated:', stats.lastUpdated);
```

### Inspect Individual Insights

```typescript
result.insights.forEach(insight => {
  console.log('Category:', insight.category);
  console.log('Type:', insight.type);
  console.log('Content:', insight.content);
  console.log('Confidence:', insight.confidence);
});
```

### View Delta Updates

```typescript
result.updates.forEach(update => {
  console.log('Operation:', update.operation);
  console.log('Section:', update.targetSection);
  console.log('Content:', update.content);
});
```

## Configuration Tips

### For Exploration (Finding Novel Solutions)

```typescript
const config = {
  modelName: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperature: 1.0,  // Higher temperature
  generatorConfig: {
    includePlaybook: false,  // Don't constrain with playbook
  },
};
```

### For Consistency (Production Use)

```typescript
const config = {
  modelName: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  temperature: 0.3,  // Lower temperature
  generatorConfig: {
    includePlaybook: true,  // Use accumulated knowledge
  },
};
```

### For Quick Experimentation

```typescript
const config = {
  modelName: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 1024,  // Shorter responses
  reflectorConfig: {
    minConfidence: 0.5,  // Only high-confidence insights
  },
};
```

## Common Issues

### Issue: Playbook Growing Too Large

**Solution:** Increase pruning frequency
```typescript
curatorConfig: {
  pruningThreshold: 0.5,  // More aggressive pruning
}
```

### Issue: Not Enough Insights

**Solution:** Lower confidence threshold
```typescript
reflectorConfig: {
  minConfidence: 0.2,  // Accept more insights
}
```

### Issue: Too Many Duplicate Strategies

**Solution:** Increase deduplication threshold
```typescript
curatorConfig: {
  deduplicationThreshold: 0.8,  // Stricter deduplication
}
```

## Next Steps

1. Run the built-in examples: `npm run dev`
2. Read the [Architecture Guide](./ARCHITECTURE.md)
3. Check out the full [README](./README.md)
4. Experiment with your own tasks and evaluators!

## Resources

- [ACE Paper (arXiv)](https://arxiv.org/abs/2510.04618)
- [Claude API Docs](https://docs.anthropic.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- Review the examples in `src/example.ts`
- Check the type definitions in `src/types.ts`
- Read the architecture documentation in `ARCHITECTURE.md`

Happy coding! 🚀
