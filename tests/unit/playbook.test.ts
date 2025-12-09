/**
 * Unit tests for PlaybookManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlaybookManager } from '../../src/playbook';
import { DeltaUpdate } from '../../src/types';
import { createTestPlaybook, createTestInsight } from '../helpers/test-fixtures';
import { v4 as uuidv4 } from 'uuid';

describe('PlaybookManager', () => {
  let playbookManager: PlaybookManager;

  beforeEach(() => {
    playbookManager = new PlaybookManager();
  });

  describe('Initialization', () => {
    it('should create an empty playbook by default', () => {
      const playbook = playbookManager.getPlaybook();
      expect(playbook).toBeDefined();
      expect(playbook.sections.size).toBe(0);
      expect(playbook.globalStrategies).toHaveLength(0);
      expect(playbook.metadata.version).toBe(1);
    });

    it('should accept an initial playbook', () => {
      const initialPlaybook = createTestPlaybook();
      const manager = new PlaybookManager(initialPlaybook);
      const playbook = manager.getPlaybook();

      expect(playbook.sections.size).toBe(2);
      expect(playbook.globalStrategies).toHaveLength(1);
    });
  });

  describe('Adding Strategies', () => {
    it('should add a new strategy to a new section', () => {
      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Mathematics',
        content: 'Always verify calculations',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);
      const playbook = playbookManager.getPlaybook();

      expect(playbook.sections.has('Mathematics')).toBe(true);
      const section = playbook.sections.get('Mathematics')!;
      expect(section.strategies).toHaveLength(1);
      expect(section.strategies[0].content).toBe('Always verify calculations');
    });

    it('should add multiple strategies to the same section', () => {
      const update1: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Mathematics',
        content: 'Strategy 1',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      const update2: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Mathematics',
        content: 'Strategy 2',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update1);
      playbookManager.applyUpdate(update2);

      const section = playbookManager.getPlaybook().sections.get('Mathematics')!;
      expect(section.strategies).toHaveLength(2);
    });

    it('should mark strategies as helpful or harmful based on counts', () => {
      const helpfulUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Helpful strategy',
        metadata: {
          helpfulCount: 5,
          harmfulCount: 1,
          lastUpdated: new Date(),
        },
      };

      const harmfulUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Harmful strategy',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 5,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(helpfulUpdate);
      playbookManager.applyUpdate(harmfulUpdate);

      const section = playbookManager.getPlaybook().sections.get('Test')!;
      expect(section.strategies[0].type).toBe('helpful');
      expect(section.strategies[1].type).toBe('harmful');
    });
  });

  describe('Updating Strategies', () => {
    it('should update an existing similar strategy', () => {
      // Add initial strategy
      const addUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Always verify your calculations carefully',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(addUpdate);

      // Update with very similar content (should match with threshold 0.7)
      const updateUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'update',
        targetSection: 'Test',
        content: 'Always verify your calculations carefully and thoroughly',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(updateUpdate);

      const section = playbookManager.getPlaybook().sections.get('Test')!;
      expect(section.strategies).toHaveLength(1);
      expect(section.strategies[0].helpfulCount).toBe(2);
    });
  });

  describe('Pruning Strategies', () => {
    it('should remove low-confidence strategies', () => {
      // Add strategies with different confidence levels
      const highConfidenceUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'High confidence strategy',
        metadata: {
          helpfulCount: 10,
          harmfulCount: 1,
          lastUpdated: new Date(),
        },
      };

      const lowConfidenceUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Low confidence strategy',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 10,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(highConfidenceUpdate);
      playbookManager.applyUpdate(lowConfidenceUpdate);

      // Prune
      const pruneUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: 'prune',
        operation: 'prune',
        targetSection: 'Test',
        content: '',
        metadata: {
          helpfulCount: 0,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(pruneUpdate);

      const section = playbookManager.getPlaybook().sections.get('Test')!;
      // Only high-confidence strategy should remain
      expect(section.strategies.length).toBeGreaterThan(0);
      expect(section.strategies.every(s => s.confidence >= 0.3)).toBe(true);
    });
  });

  describe('Formatted Context', () => {
    it('should format playbook as readable text', () => {
      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Mathematics',
        content: 'Verify your calculations',
        metadata: {
          helpfulCount: 5,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);
      const context = playbookManager.getFormattedContext();

      expect(context).toContain('# Playbook Strategies');
      expect(context).toContain('Mathematics');
      expect(context).toContain('Verify your calculations');
      expect(context).toMatch(/✓/); // Helpful marker
    });

    it('should show confidence percentages', () => {
      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Test strategy',
        metadata: {
          helpfulCount: 8,
          harmfulCount: 2,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);
      const context = playbookManager.getFormattedContext();

      expect(context).toMatch(/\[\d+\.\d+%\]/); // Confidence percentage
    });
  });

  describe('Export and Import', () => {
    it('should export playbook to JSON', () => {
      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Test strategy',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);
      const json = playbookManager.export();

      expect(json).toBeTruthy();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should import playbook from JSON', () => {
      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Test strategy',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);
      const json = playbookManager.export();

      const imported = PlaybookManager.import(json);
      const importedPlaybook = imported.getPlaybook();

      expect(importedPlaybook.sections.size).toBe(1);
      expect(importedPlaybook.sections.has('Test')).toBe(true);
    });

    it('should preserve data through export/import cycle', () => {
      const testPlaybook = createTestPlaybook();
      const manager = new PlaybookManager(testPlaybook);

      const json = manager.export();
      const imported = PlaybookManager.import(json);
      const importedPlaybook = imported.getPlaybook();

      expect(importedPlaybook.sections.size).toBe(testPlaybook.sections.size);
      expect(importedPlaybook.globalStrategies.length).toBe(testPlaybook.globalStrategies.length);
    });
  });

  describe('Metadata Tracking', () => {
    it('should increment version on updates', () => {
      const playbook = playbookManager.getPlaybook();
      const initialVersion = playbook.metadata.version;

      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Test',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);

      expect(playbookManager.getPlaybook().metadata.version).toBe(initialVersion + 1);
    });

    it('should update lastUpdated timestamp', () => {
      const beforeUpdate = new Date();

      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Test',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);
      const playbook = playbookManager.getPlaybook();

      expect(playbook.metadata.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
    });

    it('should track total updates', () => {
      const update: DeltaUpdate = {
        id: uuidv4(),
        insightId: uuidv4(),
        operation: 'add',
        targetSection: 'Test',
        content: 'Test',
        metadata: {
          helpfulCount: 1,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(update);
      playbookManager.applyUpdate(update);

      expect(playbookManager.getPlaybook().metadata.totalUpdates).toBe(2);
    });
  });
});
