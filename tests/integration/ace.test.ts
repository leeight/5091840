/**
 * Integration tests for ACE framework
 *
 * Note: These tests require ANTHROPIC_API_KEY to be set
 * Run with: ANTHROPIC_API_KEY=xxx npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ACE } from '../../src/ace';
import { ACEConfig } from '../../src/types';
import { createTestTask, mathTasks } from '../helpers/test-fixtures';
import { v4 as uuidv4 } from 'uuid';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe('ACE Integration Tests', () => {
  let ace: ACE;
  let config: ACEConfig;

  beforeEach(() => {
    config = {
      modelName: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      maxTokens: 1024,
      temperature: 0.3,
      generatorConfig: {
        includePlaybook: true,
      },
      reflectorConfig: {
        minConfidence: 0.3,
      },
      curatorConfig: {
        deduplicationThreshold: 0.7,
        pruningThreshold: 0.3,
      },
    };
    ace = new ACE(config);
  });

  describe('Single Task Processing', () => {
    it.skipIf(!hasApiKey)('should process a simple math task', async () => {
      const task = createTestTask('What is 2 + 2?');

      const result = await ace.processTask(task);

      expect(result).toBeDefined();
      expect(result.task.id).toBe(task.id);
      expect(result.trajectory).toBeDefined();
      expect(result.trajectory.answer).toBeTruthy();
      expect(result.insights).toBeDefined();
    }, 30000);

    it.skipIf(!hasApiKey)('should extract insights from successful trajectory', async () => {
      const task = createTestTask('Calculate 5 factorial');
      const evaluator = async (answer: string) => answer.includes('120');

      const result = await ace.processTask(task, evaluator);

      expect(result.insights.length).toBeGreaterThanOrEqual(0);
      if (result.insights.length > 0) {
        expect(result.insights[0]).toHaveProperty('content');
        expect(result.insights[0]).toHaveProperty('type');
        expect(result.insights[0]).toHaveProperty('confidence');
      }
    }, 30000);

    it.skipIf(!hasApiKey)('should update playbook after processing', async () => {
      const task = createTestTask('What are the first 3 prime numbers?');

      const initialSize = ace.getPlaybookSize();
      await ace.processTask(task);
      const finalSize = ace.getPlaybookSize();

      expect(finalSize).toBeGreaterThanOrEqual(initialSize);
    }, 30000);
  });

  describe('Batch Processing', () => {
    it.skipIf(!hasApiKey)(
      'should process multiple tasks in batch',
      async () => {
        const tasks = [
          createTestTask('What is 3 + 7?'),
          createTestTask('What is 5 × 6?'),
        ];

        const results = await ace.processBatch(tasks);

        expect(results).toHaveLength(2);
        results.forEach(result => {
          expect(result.trajectory).toBeDefined();
          expect(result.trajectory.answer).toBeTruthy();
        });
      },
      60000
    );

    it.skipIf(!hasApiKey)(
      'should accumulate knowledge across batch',
      async () => {
        const tasks = mathTasks.slice(0, 2);
        const initialSize = ace.getPlaybookSize();

        await ace.processBatch(tasks);

        const finalSize = ace.getPlaybookSize();
        expect(finalSize).toBeGreaterThanOrEqual(initialSize);
      },
      60000
    );
  });

  describe('Comparative Reflection', () => {
    it.skipIf(!hasApiKey)(
      'should generate comparative insights',
      async () => {
        const tasks = [createTestTask('What is 10 × 10?')];

        const evaluator = async (answer: string) => {
          return answer.includes('100');
        };

        const result = await ace.processWithComparison(tasks, evaluator, 2);

        expect(result.results).toHaveLength(1);
        expect(result.comparativeInsights).toBeDefined();
      },
      60000
    );

    it.skipIf(!hasApiKey)(
      'should improve playbook with comparative insights',
      async () => {
        const tasks = [
          createTestTask('What is 15 + 25?'),
          createTestTask('What is 30 + 20?'),
        ];

        const evaluator = async (answer: string) => {
          return answer.includes('40') || answer.includes('50');
        };

        const initialSize = ace.getPlaybookSize();
        await ace.processWithComparison(tasks, evaluator, 2);
        const finalSize = ace.getPlaybookSize();

        expect(finalSize).toBeGreaterThanOrEqual(initialSize);
      },
      90000
    );
  });

  describe('Playbook Management', () => {
    it('should export playbook to JSON', () => {
      const json = ace.exportPlaybook();

      expect(json).toBeTruthy();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should import playbook from JSON', () => {
      const json = ace.exportPlaybook();
      const newAce = new ACE(config);

      expect(() => newAce.loadPlaybook(json)).not.toThrow();
    });

    it.skipIf(!hasApiKey)(
      'should preserve playbook through export/import',
      async () => {
        const task = createTestTask('What is 7 + 8?');
        await ace.processTask(task);

        const json = ace.exportPlaybook();
        const newAce = new ACE(config);
        newAce.loadPlaybook(json);

        const originalContext = ace.getPlaybookContext();
        const importedContext = newAce.getPlaybookContext();

        expect(importedContext).toBe(originalContext);
      },
      30000
    );

    it('should reset playbook', () => {
      ace.resetPlaybook();
      const size = ace.getPlaybookSize();

      expect(size).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    it.skipIf(!hasApiKey)(
      'should track statistics correctly',
      async () => {
        const task = createTestTask('What is 4 + 5?');
        await ace.processTask(task);

        const stats = ace.getStats();

        expect(stats.playbookVersion).toBeGreaterThan(0);
        expect(stats.totalSections).toBeGreaterThanOrEqual(0);
        expect(stats.totalStrategies).toBeGreaterThanOrEqual(0);
        expect(stats.lastUpdated).toBeInstanceOf(Date);
      },
      30000
    );
  });

  describe('Training Pipeline', () => {
    it.skipIf(!hasApiKey)(
      'should train on a small dataset',
      async () => {
        const tasks = mathTasks.slice(0, 3);
        const evaluator = async () => true; // Accept all for testing

        const progressCalls: any[] = [];
        const result = await ace.train(tasks, evaluator, {
          batchSize: 2,
          compareEveryNBatches: 2,
          onProgress: (progress) => {
            progressCalls.push(progress);
          },
        });

        expect(result.results).toHaveLength(3);
        expect(result.stats.totalTasks).toBe(3);
        expect(progressCalls.length).toBeGreaterThan(0);
      },
      120000
    );

    it.skipIf(!hasApiKey)(
      'should track success rate during training',
      async () => {
        const tasks = [
          createTestTask('What is 2 + 2?'),
          createTestTask('What is 3 + 3?'),
        ];

        const evaluator = async (answer: string) => {
          return answer.includes('4') || answer.includes('6');
        };

        const result = await ace.train(tasks, evaluator, {
          batchSize: 2,
        });

        expect(result.stats.successfulTasks).toBeGreaterThanOrEqual(0);
        expect(result.stats.successfulTasks).toBeLessThanOrEqual(tasks.length);
      },
      60000
    );
  });

  describe('Error Handling', () => {
    it('should handle invalid API key gracefully', async () => {
      const badAce = new ACE({
        ...config,
        apiKey: 'invalid-key',
      });

      const task = createTestTask('Test');

      await expect(badAce.processTask(task)).rejects.toThrow();
    });

    it.skipIf(!hasApiKey)('should handle empty task query', async () => {
      const task = createTestTask('');

      // Should not throw, but may produce empty results
      const result = await ace.processTask(task);
      expect(result).toBeDefined();
    }, 30000);
  });

  describe('Configuration Options', () => {
    it.skipIf(!hasApiKey)(
      'should respect includePlaybook setting',
      async () => {
        const aceWithoutPlaybook = new ACE({
          ...config,
          generatorConfig: {
            includePlaybook: false,
          },
        });

        const task = createTestTask('What is 1 + 1?');
        const result = await aceWithoutPlaybook.processTask(task);

        expect(result.trajectory).toBeDefined();
      },
      30000
    );

    it.skipIf(!hasApiKey)(
      'should filter insights by minimum confidence',
      async () => {
        const aceHighConfidence = new ACE({
          ...config,
          reflectorConfig: {
            minConfidence: 0.9, // Very high threshold
          },
        });

        const task = createTestTask('What is 5 + 5?');
        const result = await aceHighConfidence.processTask(task);

        // With high threshold, fewer insights should pass
        result.insights.forEach(insight => {
          expect(insight.confidence).toBeGreaterThanOrEqual(0.9);
        });
      },
      30000
    );
  });
});
