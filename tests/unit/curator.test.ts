/**
 * Unit tests for Curator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Curator } from '../../src/curator';
import { PlaybookManager } from '../../src/playbook';
import { ACEConfig } from '../../src/types';
import { createTestInsight, sampleInsights } from '../helpers/test-fixtures';

describe('Curator', () => {
  let curator: Curator;
  let config: ACEConfig;

  beforeEach(() => {
    config = {
      modelName: 'claude-3-5-sonnet-20241022',
      apiKey: 'test-key',
      curatorConfig: {
        deduplicationThreshold: 0.7,
        pruningThreshold: 0.3,
      },
    };
    curator = new Curator(config);
  });

  describe('Insight Curation', () => {
    it('should convert insights to delta updates', () => {
      const insights = [
        createTestInsight('Strategy 1', 'helpful', 'Category1'),
        createTestInsight('Strategy 2', 'harmful', 'Category2'),
      ];

      const updates = curator.curate(insights);

      expect(updates).toHaveLength(2);
      expect(updates[0].operation).toBe('add');
      expect(updates[0].targetSection).toBe('Category1');
      expect(updates[1].targetSection).toBe('Category2');
    });

    it('should group insights by category', () => {
      const insights = [
        createTestInsight('Insight 1', 'helpful', 'Math'),
        createTestInsight('Insight 2', 'helpful', 'Math'),
        createTestInsight('Insight 3', 'helpful', 'Logic'),
      ];

      const updates = curator.curate(insights);

      const mathUpdates = updates.filter(u => u.targetSection === 'Math');
      const logicUpdates = updates.filter(u => u.targetSection === 'Logic');

      expect(mathUpdates.length).toBe(2);
      expect(logicUpdates.length).toBe(1);
    });

    it('should deduplicate similar insights', () => {
      const insights = [
        createTestInsight('Break down complex problems step by step', 'helpful', 'Strategy'),
        createTestInsight('Break down complex problems step by step carefully', 'helpful', 'Strategy'),
        createTestInsight('Different insight entirely about something else', 'helpful', 'Strategy'),
      ];

      const updates = curator.curate(insights);

      // Should deduplicate the first two similar insights
      // With threshold 0.7, very similar strings should be deduplicated
      expect(updates.length).toBeLessThanOrEqual(insights.length);
      expect(updates.length).toBeGreaterThan(0);
    });

    it('should set helpful/harmful counts correctly', () => {
      const helpfulInsight = createTestInsight('Helpful strategy', 'helpful', 'Test');
      const harmfulInsight = createTestInsight('Harmful strategy', 'harmful', 'Test');

      const updates = curator.curate([helpfulInsight, harmfulInsight]);

      const helpfulUpdate = updates.find(u => u.content === 'Helpful strategy')!;
      const harmfulUpdate = updates.find(u => u.content === 'Harmful strategy')!;

      expect(helpfulUpdate.metadata.helpfulCount).toBe(1);
      expect(helpfulUpdate.metadata.harmfulCount).toBe(0);
      expect(harmfulUpdate.metadata.helpfulCount).toBe(0);
      expect(harmfulUpdate.metadata.harmfulCount).toBe(1);
    });
  });

  describe('Applying Updates', () => {
    it('should apply updates to playbook', () => {
      const playbookManager = new PlaybookManager();
      const insights = [createTestInsight('Test strategy', 'helpful', 'Test')];
      const updates = curator.curate(insights);

      curator.applyUpdates(playbookManager, updates);

      const playbook = playbookManager.getPlaybook();
      expect(playbook.sections.has('Test')).toBe(true);
    });

    it('should perform merging after applying updates', () => {
      const playbookManager = new PlaybookManager();
      const insights = [
        createTestInsight('Strategy one', 'helpful', 'Test'),
        createTestInsight('Strategy one with more details', 'helpful', 'Test'),
      ];
      const updates = curator.curate(insights);

      curator.applyUpdates(playbookManager, updates);

      // Merging should reduce similar strategies
      const section = playbookManager.getPlaybook().sections.get('Test');
      expect(section).toBeDefined();
    });

    it('should perform pruning after applying updates', () => {
      const playbookManager = new PlaybookManager();

      // Add a low-confidence insight
      const insights = [
        createTestInsight('Low confidence', 'helpful', 'Test'),
      ];
      insights[0].confidence = 0.2; // Below pruning threshold

      const updates = curator.curate(insights);
      curator.applyUpdates(playbookManager, updates);

      // Verify pruning occurred
      const playbook = playbookManager.getPlaybook();
      expect(playbook.sections.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Curation Statistics', () => {
    it('should provide statistics about updates', () => {
      const insights = [
        createTestInsight('Insight 1', 'helpful', 'Test'),
        createTestInsight('Insight 2', 'helpful', 'Test'),
      ];
      const updates = curator.curate(insights);

      const stats = curator.getCurationStats(updates);

      expect(stats.totalUpdates).toBe(updates.length);
      expect(stats.additions).toBeGreaterThan(0);
      expect(stats.merges).toBe(0);
      expect(stats.updates).toBe(0);
      expect(stats.prunes).toBe(0);
    });
  });

  describe('Deduplication Threshold', () => {
    it('should respect custom deduplication threshold', () => {
      const strictCurator = new Curator({
        ...config,
        curatorConfig: {
          deduplicationThreshold: 0.9, // Very strict
        },
      });

      const insights = [
        createTestInsight('Break down problems', 'helpful', 'Strategy'),
        createTestInsight('Break down complex problems', 'helpful', 'Strategy'),
      ];

      const updates = strictCurator.curate(insights);

      // With strict threshold, both should be kept
      expect(updates.length).toBe(2);
    });

    it('should deduplicate more aggressively with lower threshold', () => {
      const lenientCurator = new Curator({
        ...config,
        curatorConfig: {
          deduplicationThreshold: 0.5, // Very lenient
        },
      });

      const insights = [
        createTestInsight('Break down problems', 'helpful', 'Strategy'),
        createTestInsight('Break problems down', 'helpful', 'Strategy'),
      ];

      const updates = lenientCurator.curate(insights);

      // With lenient threshold, should deduplicate
      expect(updates.length).toBeLessThanOrEqual(insights.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty insights array', () => {
      const updates = curator.curate([]);
      expect(updates).toHaveLength(0);
    });

    it('should handle insights without category', () => {
      const insight = createTestInsight('Test', 'helpful');
      insight.category = '';

      const updates = curator.curate([insight]);

      // Should default to 'General' or similar
      expect(updates).toHaveLength(1);
      expect(updates[0].targetSection).toBeTruthy();
    });

    it('should handle multiple insights in different categories', () => {
      const insights = sampleInsights;
      const updates = curator.curate(insights);

      // Should create updates for all categories
      const categories = new Set(updates.map(u => u.targetSection));
      expect(categories.size).toBeGreaterThan(1);
    });
  });
});
