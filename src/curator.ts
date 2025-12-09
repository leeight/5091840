import { Insight, DeltaUpdate, ACEConfig } from './types';
import { PlaybookManager } from './playbook';
import { v4 as uuidv4 } from 'uuid';

/**
 * Curator component - Integrates insights into the playbook
 *
 * The Curator converts insights into structured delta updates that are applied
 * incrementally to the playbook. It handles deduplication, merging, and pruning
 * to maintain a high-quality, non-redundant knowledge base.
 */
export class Curator {
  private config: ACEConfig;

  constructor(config: ACEConfig) {
    this.config = config;
  }

  /**
   * Curate insights into delta updates
   */
  curate(insights: Insight[]): DeltaUpdate[] {
    const updates: DeltaUpdate[] = [];

    // Group insights by category
    const insightsByCategory = this.groupInsightsByCategory(insights);

    for (const [category, categoryInsights] of insightsByCategory) {
      // Deduplicate insights within the category
      const deduplicatedInsights = this.deduplicateInsights(categoryInsights);

      // Create delta updates for each insight
      for (const insight of deduplicatedInsights) {
        const update = this.createDeltaUpdate(insight, category);
        updates.push(update);
      }
    }

    return updates;
  }

  /**
   * Apply updates to the playbook
   */
  applyUpdates(playbookManager: PlaybookManager, updates: DeltaUpdate[]): void {
    // Apply each update
    for (const update of updates) {
      playbookManager.applyUpdate(update);
    }

    // Perform post-processing
    this.performMerging(playbookManager);
    this.performPruning(playbookManager);
  }

  /**
   * Group insights by category
   */
  private groupInsightsByCategory(insights: Insight[]): Map<string, Insight[]> {
    const groups = new Map<string, Insight[]>();

    for (const insight of insights) {
      const category = insight.category || 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(insight);
    }

    return groups;
  }

  /**
   * Deduplicate similar insights
   */
  private deduplicateInsights(insights: Insight[]): Insight[] {
    const threshold = this.config.curatorConfig?.deduplicationThreshold || 0.7;
    const deduplicated: Insight[] = [];

    for (const insight of insights) {
      const isDuplicate = deduplicated.some(existing => {
        const similarity = this.calculateSimilarity(existing.content, insight.content);
        return similarity >= threshold;
      });

      if (!isDuplicate) {
        deduplicated.push(insight);
      }
    }

    return deduplicated;
  }

  /**
   * Create a delta update from an insight
   */
  private createDeltaUpdate(insight: Insight, category: string): DeltaUpdate {
    const helpfulCount = insight.type === 'helpful' ? 1 : 0;
    const harmfulCount = insight.type === 'harmful' ? 1 : 0;

    return {
      id: uuidv4(),
      insightId: insight.id,
      operation: 'add',
      targetSection: category,
      content: insight.content,
      metadata: {
        helpfulCount,
        harmfulCount,
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Perform merging of similar strategies in the playbook
   */
  private performMerging(playbookManager: PlaybookManager): void {
    const playbook = playbookManager.getPlaybook();

    for (const [sectionName, section] of playbook.sections) {
      // Find groups of similar strategies
      const similarGroups = this.findSimilarStrategyGroups(section.strategies);

      // Create merge updates for each group
      for (const group of similarGroups) {
        if (group.length > 1) {
          // Create a merged content
          const mergedContent = this.mergeStrategyContents(group.map(s => s.content));

          const mergeUpdate: DeltaUpdate = {
            id: uuidv4(),
            insightId: group[0].id,
            operation: 'merge',
            targetSection: sectionName,
            content: mergedContent,
            metadata: {
              helpfulCount: group.reduce((sum, s) => sum + s.helpfulCount, 0),
              harmfulCount: group.reduce((sum, s) => sum + s.harmfulCount, 0),
              lastUpdated: new Date(),
            },
          };

          playbookManager.applyUpdate(mergeUpdate);
        }
      }
    }
  }

  /**
   * Perform pruning of low-quality strategies
   */
  private performPruning(playbookManager: PlaybookManager): void {
    const playbook = playbookManager.getPlaybook();
    const pruningThreshold = this.config.curatorConfig?.pruningThreshold || 0.3;

    for (const [sectionName] of playbook.sections) {
      const pruneUpdate: DeltaUpdate = {
        id: uuidv4(),
        insightId: 'pruning',
        operation: 'prune',
        targetSection: sectionName,
        content: '',
        metadata: {
          helpfulCount: 0,
          harmfulCount: 0,
          lastUpdated: new Date(),
        },
      };

      playbookManager.applyUpdate(pruneUpdate);
    }
  }

  /**
   * Find groups of similar strategies
   */
  private findSimilarStrategyGroups(strategies: any[]): any[][] {
    const groups: any[][] = [];
    const processed = new Set<string>();

    for (const strategy of strategies) {
      if (processed.has(strategy.id)) continue;

      const similarGroup = [strategy];
      processed.add(strategy.id);

      for (const other of strategies) {
        if (processed.has(other.id)) continue;

        const similarity = this.calculateSimilarity(strategy.content, other.content);
        if (similarity >= 0.7) {
          similarGroup.push(other);
          processed.add(other.id);
        }
      }

      if (similarGroup.length > 1) {
        groups.push(similarGroup);
      }
    }

    return groups;
  }

  /**
   * Merge multiple strategy contents into one
   */
  private mergeStrategyContents(contents: string[]): string {
    // Simple merging: use the longest content as base
    return contents.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    );
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get curation statistics
   */
  getCurationStats(updates: DeltaUpdate[]): {
    totalUpdates: number;
    additions: number;
    merges: number;
    updates: number;
    prunes: number;
  } {
    return {
      totalUpdates: updates.length,
      additions: updates.filter(u => u.operation === 'add').length,
      merges: updates.filter(u => u.operation === 'merge').length,
      updates: updates.filter(u => u.operation === 'update').length,
      prunes: updates.filter(u => u.operation === 'prune').length,
    };
  }
}
