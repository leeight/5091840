import { Playbook, PlaybookSection, Strategy, DeltaUpdate } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manages the evolving playbook that accumulates, refines, and organizes strategies
 */
export class PlaybookManager {
  private playbook: Playbook;

  constructor(initialPlaybook?: Playbook) {
    this.playbook = initialPlaybook || this.createEmptyPlaybook();
  }

  /**
   * Create an empty playbook
   */
  private createEmptyPlaybook(): Playbook {
    return {
      id: uuidv4(),
      sections: new Map(),
      globalStrategies: [],
      metadata: {
        version: 1,
        created: new Date(),
        lastUpdated: new Date(),
        totalUpdates: 0,
      },
    };
  }

  /**
   * Get the current playbook
   */
  getPlaybook(): Playbook {
    return this.playbook;
  }

  /**
   * Apply a delta update to the playbook
   */
  applyUpdate(update: DeltaUpdate): void {
    const { operation, targetSection, content } = update;

    switch (operation) {
      case 'add':
        this.addStrategy(targetSection, update);
        break;
      case 'update':
        this.updateStrategy(targetSection, update);
        break;
      case 'merge':
        this.mergeStrategy(targetSection, update);
        break;
      case 'prune':
        this.pruneStrategy(targetSection, update);
        break;
    }

    this.playbook.metadata.version++;
    this.playbook.metadata.lastUpdated = new Date();
    this.playbook.metadata.totalUpdates++;
  }

  /**
   * Add a new strategy to a section
   */
  private addStrategy(sectionName: string, update: DeltaUpdate): void {
    let section = this.playbook.sections.get(sectionName);

    if (!section) {
      section = {
        id: uuidv4(),
        name: sectionName,
        strategies: [],
        metadata: {
          created: new Date(),
          lastUpdated: new Date(),
          usageCount: 0,
        },
      };
      this.playbook.sections.set(sectionName, section);
    }

    const strategy: Strategy = {
      id: uuidv4(),
      content: update.content,
      type: update.metadata.helpfulCount > update.metadata.harmfulCount ? 'helpful' : 'harmful',
      helpfulCount: update.metadata.helpfulCount,
      harmfulCount: update.metadata.harmfulCount,
      examples: [],
      confidence: this.calculateConfidence(update.metadata.helpfulCount, update.metadata.harmfulCount),
      created: new Date(),
      lastUpdated: new Date(),
    };

    section.strategies.push(strategy);
    section.metadata.lastUpdated = new Date();
  }

  /**
   * Update an existing strategy
   */
  private updateStrategy(sectionName: string, update: DeltaUpdate): void {
    const section = this.playbook.sections.get(sectionName);
    if (!section) return;

    // Find similar strategy and update it
    const similarStrategy = this.findSimilarStrategy(section, update.content);
    if (similarStrategy) {
      similarStrategy.helpfulCount += update.metadata.helpfulCount;
      similarStrategy.harmfulCount += update.metadata.harmfulCount;
      similarStrategy.confidence = this.calculateConfidence(
        similarStrategy.helpfulCount,
        similarStrategy.harmfulCount
      );
      similarStrategy.lastUpdated = new Date();
      section.metadata.lastUpdated = new Date();
    }
  }

  /**
   * Merge similar strategies
   */
  private mergeStrategy(sectionName: string, update: DeltaUpdate): void {
    const section = this.playbook.sections.get(sectionName);
    if (!section) return;

    const similarStrategies = this.findAllSimilarStrategies(section, update.content);

    if (similarStrategies.length > 1) {
      // Merge all similar strategies into one
      const mergedStrategy: Strategy = {
        id: uuidv4(),
        content: update.content,
        type: 'helpful',
        helpfulCount: similarStrategies.reduce((sum, s) => sum + s.helpfulCount, 0),
        harmfulCount: similarStrategies.reduce((sum, s) => sum + s.harmfulCount, 0),
        examples: similarStrategies.flatMap(s => s.examples),
        confidence: 0,
        created: new Date(),
        lastUpdated: new Date(),
      };

      mergedStrategy.type = mergedStrategy.helpfulCount > mergedStrategy.harmfulCount ? 'helpful' : 'harmful';
      mergedStrategy.confidence = this.calculateConfidence(
        mergedStrategy.helpfulCount,
        mergedStrategy.harmfulCount
      );

      // Remove old strategies
      section.strategies = section.strategies.filter(
        s => !similarStrategies.some(ss => ss.id === s.id)
      );

      // Add merged strategy
      section.strategies.push(mergedStrategy);
      section.metadata.lastUpdated = new Date();
    }
  }

  /**
   * Prune low-confidence strategies
   */
  private pruneStrategy(sectionName: string, update: DeltaUpdate): void {
    const section = this.playbook.sections.get(sectionName);
    if (!section) return;

    const threshold = 0.3; // Prune strategies with confidence below this threshold
    section.strategies = section.strategies.filter(s => s.confidence >= threshold);
    section.metadata.lastUpdated = new Date();
  }

  /**
   * Find a similar strategy in a section
   */
  private findSimilarStrategy(section: PlaybookSection, content: string): Strategy | null {
    const threshold = 0.7; // Similarity threshold

    for (const strategy of section.strategies) {
      const similarity = this.calculateSimilarity(strategy.content, content);
      if (similarity >= threshold) {
        return strategy;
      }
    }

    return null;
  }

  /**
   * Find all similar strategies in a section
   */
  private findAllSimilarStrategies(section: PlaybookSection, content: string): Strategy[] {
    const threshold = 0.7;
    return section.strategies.filter(
      s => this.calculateSimilarity(s.content, content) >= threshold
    );
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate confidence score based on helpful/harmful counts
   */
  private calculateConfidence(helpfulCount: number, harmfulCount: number): number {
    const total = helpfulCount + harmfulCount;
    if (total === 0) return 0;

    // Bayesian average with prior
    const prior = 2; // Prior counts
    return (helpfulCount + prior * 0.5) / (total + prior);
  }

  /**
   * Get formatted playbook context for inclusion in prompts
   */
  getFormattedContext(): string {
    let context = '# Playbook Strategies\n\n';

    // Add global strategies
    if (this.playbook.globalStrategies.length > 0) {
      context += '## Global Strategies\n\n';
      for (const strategy of this.playbook.globalStrategies) {
        context += this.formatStrategy(strategy);
      }
    }

    // Add section-specific strategies
    for (const [sectionName, section] of this.playbook.sections) {
      if (section.strategies.length > 0) {
        context += `## ${sectionName}\n\n`;
        for (const strategy of section.strategies) {
          context += this.formatStrategy(strategy);
        }
      }
    }

    return context;
  }

  /**
   * Format a single strategy for display
   */
  private formatStrategy(strategy: Strategy): string {
    const label = strategy.type === 'helpful' ? '✓' : '✗';
    const confidence = (strategy.confidence * 100).toFixed(1);

    return `${label} [${confidence}%] ${strategy.content}\n`;
  }

  /**
   * Export playbook to JSON
   */
  export(): string {
    const exportData = {
      ...this.playbook,
      sections: Array.from(this.playbook.sections.entries()),
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import playbook from JSON
   */
  static import(json: string): PlaybookManager {
    const data = JSON.parse(json);
    const playbook: Playbook = {
      ...data,
      sections: new Map(data.sections),
    };
    return new PlaybookManager(playbook);
  }
}
