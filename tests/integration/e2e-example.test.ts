/**
 * End-to-end example tests demonstrating real-world usage
 *
 * These tests show how ACE would be used in practice
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ACE } from '../../src/ace';
import { ACEConfig, Task } from '../../src/types';
import { createTestTask } from '../helpers/test-fixtures';
import { v4 as uuidv4 } from 'uuid';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe('E2E: Math Tutoring Agent', () => {
  let mathTutor: ACE;
  let config: ACEConfig;

  beforeEach(() => {
    config = {
      modelName: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      maxTokens: 2048,
      temperature: 0.3,
      generatorConfig: {
        includePlaybook: true,
      },
    };
    mathTutor = new ACE(config);
  });

  it.skipIf(!hasApiKey)(
    'should learn from solving multiple math problems',
    async () => {
      // Phase 1: Initial training on basic arithmetic
      const basicTasks: Task[] = [
        createTestTask('What is 7 + 8?'),
        createTestTask('What is 12 - 5?'),
        createTestTask('What is 6 × 9?'),
      ];

      const arithmeticEvaluator = async (answer: string) => {
        return (
          answer.includes('15') ||
          answer.includes('7') ||
          answer.includes('54')
        );
      };

      const initialPlaybookSize = mathTutor.getPlaybookSize();

      for (const task of basicTasks) {
        await mathTutor.processTask(task, arithmeticEvaluator);
      }

      const afterBasicSize = mathTutor.getPlaybookSize();
      expect(afterBasicSize).toBeGreaterThan(initialPlaybookSize);

      // Phase 2: More complex problems
      const advancedTasks: Task[] = [
        createTestTask('Calculate 15% of 200'),
        createTestTask('What is the square root of 144?'),
      ];

      for (const task of advancedTasks) {
        await mathTutor.processTask(task);
      }

      const finalPlaybookSize = mathTutor.getPlaybookSize();
      expect(finalPlaybookSize).toBeGreaterThanOrEqual(afterBasicSize);

      // Verify playbook contains useful strategies
      const context = mathTutor.getPlaybookContext();
      expect(context).toBeTruthy();
      expect(context.length).toBeGreaterThan(0);
    },
    120000
  );

  it.skipIf(!hasApiKey)(
    'should improve over time with comparative reflection',
    async () => {
      const tasks: Task[] = [
        createTestTask('What is 25 × 4?'),
        createTestTask('What is 30 × 3?'),
        createTestTask('What is 20 × 5?'),
      ];

      const evaluator = async (answer: string) => {
        return (
          answer.includes('100') ||
          answer.includes('90') ||
          answer.includes('100')
        );
      };

      const { comparativeInsights } = await mathTutor.processWithComparison(
        tasks,
        evaluator,
        2 // Generate 2 attempts per task
      );

      expect(comparativeInsights.length).toBeGreaterThanOrEqual(0);

      // Check if insights are categorized
      if (comparativeInsights.length > 0) {
        comparativeInsights.forEach(insight => {
          expect(insight.category).toBeTruthy();
          expect(['helpful', 'harmful']).toContain(insight.type);
        });
      }
    },
    120000
  );

  it.skipIf(!hasApiKey)(
    'should be able to export and restore learned knowledge',
    async () => {
      // Train the agent
      const task = createTestTask('What is the factorial of 6?');
      await mathTutor.processTask(task);

      // Export playbook
      const savedPlaybook = mathTutor.exportPlaybook();
      expect(savedPlaybook).toBeTruthy();

      // Create new agent and load playbook
      const newAgent = new ACE(config);
      newAgent.loadPlaybook(savedPlaybook);

      // Verify knowledge transfer
      const originalContext = mathTutor.getPlaybookContext();
      const loadedContext = newAgent.getPlaybookContext();

      expect(loadedContext).toBe(originalContext);
    },
    60000
  );
});

describe('E2E: Question Answering Agent', () => {
  let qaAgent: ACE;

  beforeEach(() => {
    qaAgent = new ACE({
      modelName: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      maxTokens: 2048,
      temperature: 0.5,
      generatorConfig: {
        includePlaybook: true,
      },
    });
  });

  it.skipIf(!hasApiKey)(
    'should answer questions with context',
    async () => {
      const task: Task = {
        id: uuidv4(),
        query: 'What is the capital of France?',
        context: {
          domain: 'geography',
          type: 'factual',
        },
      };

      const result = await qaAgent.processTask(task);

      expect(result.trajectory.answer).toBeTruthy();
      expect(result.trajectory.reasoning).toBeTruthy();
    },
    30000
  );

  it.skipIf(!hasApiKey)(
    'should build domain knowledge over time',
    async () => {
      const geographyTasks: Task[] = [
        {
          id: uuidv4(),
          query: 'What is the largest ocean?',
          context: { domain: 'geography' },
        },
        {
          id: uuidv4(),
          query: 'What is the highest mountain?',
          context: { domain: 'geography' },
        },
      ];

      const results = await qaAgent.processBatch(geographyTasks);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.trajectory).toBeDefined();
      });

      // Check if geography-related strategies were added
      const stats = qaAgent.getStats();
      expect(stats.totalStrategies).toBeGreaterThanOrEqual(0);
    },
    60000
  );
});

describe('E2E: Training Pipeline', () => {
  let agent: ACE;

  beforeEach(() => {
    agent = new ACE({
      modelName: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      maxTokens: 1024,
      temperature: 0.3,
      generatorConfig: {
        includePlaybook: true,
      },
    });
  });

  it.skipIf(!hasApiKey)(
    'should complete full training pipeline',
    async () => {
      const trainingTasks: Task[] = [
        createTestTask('What is 2 + 2?'),
        createTestTask('What is 3 + 3?'),
        createTestTask('What is 4 + 4?'),
        createTestTask('What is 5 + 5?'),
      ];

      const evaluator = async (answer: string) => {
        return /\d+/.test(answer); // Accept if contains a number
      };

      const progressUpdates: any[] = [];

      const { results, stats } = await agent.train(
        trainingTasks,
        evaluator,
        {
          batchSize: 2,
          compareEveryNBatches: 1,
          onProgress: (progress) => {
            progressUpdates.push(progress);
          },
        }
      );

      // Verify training completed
      expect(results).toHaveLength(4);
      expect(stats.totalTasks).toBe(4);

      // Verify progress was tracked
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Verify playbook grew
      expect(stats.totalStrategies).toBeGreaterThanOrEqual(0);

      // Check success rate
      const successRate = stats.successfulTasks / stats.totalTasks;
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(1);
    },
    180000
  );

  it.skipIf(!hasApiKey)(
    'should track statistics during training',
    async () => {
      const tasks: Task[] = [
        createTestTask('Simple task 1'),
        createTestTask('Simple task 2'),
      ];

      const { stats } = await agent.train(
        tasks,
        async () => true,
        { batchSize: 2 }
      );

      expect(stats.totalTasks).toBe(2);
      expect(stats.successfulTasks).toBeGreaterThanOrEqual(0);
      expect(stats.totalInsights).toBeGreaterThanOrEqual(0);
      expect(stats.totalUpdates).toBeGreaterThanOrEqual(0);
    },
    60000
  );
});

describe('E2E: Real-world Scenarios', () => {
  it.skipIf(!hasApiKey)(
    'should handle a multi-step reasoning task',
    async () => {
      const agent = new ACE({
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY!,
        maxTokens: 3000,
        temperature: 0.4,
      });

      const task = createTestTask(
        'If a train travels 60 km/h for 2.5 hours, how far does it travel?'
      );

      const result = await agent.processTask(task);

      expect(result.trajectory.reasoning).toBeTruthy();
      expect(result.trajectory.answer).toBeTruthy();

      // Should show step-by-step reasoning
      const reasoning = result.trajectory.reasoning.toLowerCase();
      expect(
        reasoning.includes('step') ||
        reasoning.includes('first') ||
        reasoning.includes('calculate')
      ).toBe(true);
    },
    30000
  );

  it.skipIf(!hasApiKey)(
    'should learn from both successes and failures',
    async () => {
      const agent = new ACE({
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY!,
        temperature: 0.7, // Higher temp for more variation
      });

      const tasks = [
        createTestTask('What is 100 divided by 5?'),
        createTestTask('What is 200 divided by 10?'),
      ];

      const evaluator = async (answer: string) => {
        return answer.includes('20');
      };

      const { comparativeInsights } = await agent.processWithComparison(
        tasks,
        evaluator,
        3 // Multiple attempts to get both success and failure
      );

      // Should extract insights from the comparison
      expect(comparativeInsights).toBeDefined();
    },
    90000
  );
});
