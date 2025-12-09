# ACE Framework Architecture

This document provides a detailed overview of the ACE (Agentic Context Engineering) implementation architecture.

## Overview

ACE is a framework that enables language models to self-improve through **context adaptation** rather than weight updates. It treats contexts as evolving "playbooks" that accumulate knowledge through three core processes:

1. **Generation** - Creating reasoning trajectories
2. **Reflection** - Extracting insights from experiences
3. **Curation** - Organizing knowledge incrementally

## Core Components

### 1. Types (`src/types.ts`)

Defines the core data structures:

- **Task**: Input task with query and optional context
- **Trajectory**: Generated reasoning path with success/failure status
- **Insight**: Extracted knowledge marked as helpful or harmful
- **DeltaUpdate**: Incremental playbook modification
- **Playbook**: Evolving knowledge base organized by sections
- **Strategy**: Individual piece of learned knowledge with confidence scores

### 2. PlaybookManager (`src/playbook.ts`)

Manages the evolving knowledge base:

```typescript
class PlaybookManager {
  // Core operations
  applyUpdate(update: DeltaUpdate): void
  getFormattedContext(): string
  export(): string
  static import(json: string): PlaybookManager
}
```

**Key Features:**
- Hierarchical organization (sections → strategies)
- Confidence-based ranking
- Semantic similarity detection
- Strategy merging and deduplication
- Automatic pruning of low-quality strategies

**Update Operations:**
- `add`: Insert new strategy
- `update`: Increment counters on existing strategy
- `merge`: Combine similar strategies
- `prune`: Remove low-confidence strategies

### 3. Generator (`src/generator.ts`)

Creates reasoning trajectories:

```typescript
class Generator {
  generate(task, playbook, evaluator?): Promise<Trajectory>
  generateMultiple(task, playbook, count, evaluator?): Promise<Trajectory[]>
}
```

**Process:**
1. Retrieve formatted playbook context
2. Construct prompt with task + playbook
3. Request Claude to reason step-by-step
4. Parse response into reasoning + answer
5. Optionally evaluate correctness
6. Return trajectory with success status

**Prompt Structure:**
```
[Playbook Context]

Task: {query}
[Additional Context]

Please provide:
REASONING:
[step-by-step process]

ANSWER:
[final answer]
```

### 4. Reflector (`src/reflector.ts`)

Extracts actionable insights:

```typescript
class Reflector {
  reflect(trajectory): Promise<Insight[]>
  reflectComparative(successful[], failed[]): Promise<Insight[]>
  filterByConfidence(insights): Insight[]
}
```

**Two Modes:**

**Single-Trajectory Reflection:**
- Analyzes one trajectory at a time
- For successes: identifies effective strategies
- For failures: identifies mistakes and pitfalls

**Comparative Reflection:**
- Analyzes multiple successful vs failed trajectories
- Identifies differentiating patterns
- More robust insight extraction

**Confidence Scoring:**
- Based on insight specificity and clarity
- Longer, more detailed insights score higher
- Insights with action keywords (must, avoid, ensure) score higher

### 5. Curator (`src/curator.ts`)

Integrates insights into playbook:

```typescript
class Curator {
  curate(insights): DeltaUpdate[]
  applyUpdates(playbook, updates): void
}
```

**Three-Phase Process:**

1. **Deduplication**: Remove similar insights within batch
2. **Delta Creation**: Convert insights to incremental updates
3. **Post-Processing**:
   - Merge similar strategies across playbook
   - Prune low-confidence strategies
   - Maintain quality threshold

**Similarity Calculation:**
- Uses Jaccard similarity on word sets
- Threshold: 0.7 (configurable)
- Prevents redundancy and bloat

### 6. ACE Orchestrator (`src/ace.ts`)

Main coordination class:

```typescript
class ACE {
  // Single task
  processTask(task, evaluator?): Promise<ACEResult>

  // Batch processing
  processBatch(tasks, evaluator?): Promise<ACEResult[]>

  // Comparative reflection
  processWithComparison(tasks, evaluator, trajectories): Promise<{...}>

  // Training pipeline
  train(tasks, evaluator, options): Promise<{...}>

  // Playbook management
  getPlaybookContext(): string
  exportPlaybook(): string
  loadPlaybook(json): void
}
```

## Data Flow

### Standard Processing Pipeline

```
Input Task
    ↓
Generator ──→ Trajectory
    ↓
Reflector ──→ Insights
    ↓
Curator ──→ Delta Updates
    ↓
PlaybookManager ──→ Updated Playbook
    ↓
Output Result
```

### Comparative Processing Pipeline

```
Multiple Tasks
    ↓
Generator ──→ Multiple Trajectories per Task
    ↓
Filter ──→ Successful vs Failed
    ↓
Reflector ──→ Comparative Insights
    ↓
Curator ──→ Delta Updates
    ↓
PlaybookManager ──→ Enhanced Playbook
```

### Training Pipeline

```
Task Dataset
    ↓
Batch Processor
    ↓
Every N batches: Comparative Reflection
Otherwise: Standard Processing
    ↓
Progress Tracking
    ↓
Final Playbook + Statistics
```

## Key Algorithms

### Semantic Similarity (Jaccard)

```typescript
similarity = |words1 ∩ words2| / |words1 ∪ words2|
```

Used for:
- Deduplicating insights
- Merging similar strategies
- Preventing redundancy

### Confidence Scoring

```typescript
confidence = (helpful + prior * 0.5) / (total + prior)
```

Bayesian average with prior to handle low sample sizes.

### Strategy Pruning

```typescript
if (strategy.confidence < threshold) {
  remove(strategy)
}
```

Default threshold: 0.3

## Configuration

### Generator Config

```typescript
generatorConfig: {
  maxTrajectories: number       // Limit trajectories per task
  includePlaybook: boolean      // Include playbook in prompts
}
```

### Reflector Config

```typescript
reflectorConfig: {
  minConfidence: number         // Filter low-confidence insights
  compareSuccessAndFailure: boolean
}
```

### Curator Config

```typescript
curatorConfig: {
  deduplicationThreshold: number    // Similarity threshold
  pruningThreshold: number          // Minimum confidence
  maxStrategiesPerSection: number   // Section capacity
}
```

## Optimization Strategies

### 1. Incremental Updates

Instead of rewriting entire playbook:
- Apply localized delta updates
- Preserve existing knowledge
- Faster and more stable

### 2. Lazy Merging

Merge operations occur:
- After batch processing
- During curation phase
- Not on every single update

### 3. Confidence-Based Filtering

Filter at multiple stages:
- After reflection (remove low-confidence insights)
- During curation (deduplicate before adding)
- Periodic pruning (remove degraded strategies)

### 4. Batch Processing

Process tasks in batches:
- Amortize overhead
- Enable comparative reflection
- Better progress tracking

## Error Handling

### Generator Errors
- API failures: Propagate to caller
- Parse failures: Return empty reasoning/answer
- Timeout: Configurable via maxTokens

### Reflector Errors
- No insights extracted: Return empty array
- Malformed responses: Skip invalid insights
- Low confidence: Filter during post-processing

### Curator Errors
- Duplicate updates: Handled via similarity detection
- Invalid sections: Create new sections automatically
- Merge conflicts: Use longest content as base

## Performance Characteristics

### Time Complexity
- Single task: O(1) API calls + O(n) reflection
- Batch: O(k) tasks × O(1) per task
- Comparative: O(k) tasks × O(m) trajectories
- Merging: O(n²) where n = strategies per section

### Space Complexity
- Playbook: O(sections × strategies)
- Bounded by pruning threshold
- Typical size: 100-1000 strategies

### API Costs
- Per task: 1-2 API calls (generate + reflect)
- Comparative: 1 + m API calls (m trajectories + 1 reflection)
- Training: scales linearly with dataset size

## Extension Points

### Custom Evaluators

```typescript
const evaluator = async (answer: string): Promise<boolean> => {
  // Custom logic to evaluate answer correctness
  return isCorrect(answer);
};
```

### Custom Similarity Metrics

Extend `PlaybookManager` or `Curator`:
```typescript
private calculateSimilarity(str1: string, str2: string): number {
  // Custom similarity logic (e.g., embeddings)
}
```

### Custom Insight Extraction

Extend `Reflector`:
```typescript
private parseInsights(response: string): Insight[] {
  // Custom parsing logic
}
```

### Custom Playbook Formatting

Extend `PlaybookManager`:
```typescript
getFormattedContext(): string {
  // Custom formatting for prompts
}
```

## Best Practices

### 1. Task Design
- Clear, specific queries
- Provide relevant context
- Define objective evaluation criteria

### 2. Evaluator Design
- Deterministic when possible
- Fast execution (called frequently)
- Handle edge cases gracefully

### 3. Training Strategy
- Start with small batches
- Use comparative reflection regularly
- Monitor playbook growth
- Export checkpoints periodically

### 4. Playbook Maintenance
- Prune regularly to prevent bloat
- Merge similar strategies
- Review and curate manually if needed
- Version control exported playbooks

### 5. Configuration Tuning
- Lower temperature for consistency
- Higher temperature for exploration
- Balance deduplication threshold
- Adjust pruning based on domain

## Monitoring and Debugging

### Key Metrics
- Playbook size over time
- Success rate trends
- Insight extraction rate
- Confidence score distribution

### Debugging Tools
```typescript
// Get current stats
const stats = ace.getStats();

// Export for inspection
const json = ace.exportPlaybook();

// View formatted context
const context = ace.getPlaybookContext();

// Check trajectory details
console.log(result.trajectory.reasoning);
```

## Future Enhancements

Potential improvements:
1. Embedding-based similarity
2. Hierarchical playbook organization
3. Multi-modal insights (code + text)
4. Distributed playbook sync
5. Active learning for task selection
6. Automated hyperparameter tuning
7. Playbook visualization tools

## References

- Original Paper: https://arxiv.org/abs/2510.04618
- Claude API: https://docs.anthropic.com/
- TypeScript: https://www.typescriptlang.org/
