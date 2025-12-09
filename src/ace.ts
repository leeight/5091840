import { Task, Trajectory, Insight, DeltaUpdate, ACEConfig, ACEResult } from './types';
import { PlaybookManager } from './playbook';
import { Generator } from './generator';
import { Reflector } from './reflector';
import { Curator } from './curator';

/**
 * ACE (Agentic Context Engineering) - Main orchestration class
 *
 * ACE treats contexts as evolving playbooks that accumulate, refine, and organize
 * strategies through a modular process of generation, reflection, and curation.
 *
 * The framework consists of three main components:
 * 1. Generator: Produces reasoning trajectories
 * 2. Reflector: Extracts insights from trajectories
 * 3. Curator: Integrates insights into the playbook
 */
export class ACE {
  private config: ACEConfig;
  private playbookManager: PlaybookManager;
  private generator: Generator;
  private reflector: Reflector;
  private curator: Curator;

  constructor(config: ACEConfig, playbookManager?: PlaybookManager) {
    this.config = config;
    this.playbookManager = playbookManager || new PlaybookManager();
    this.generator = new Generator(config);
    this.reflector = new Reflector(config);
    this.curator = new Curator(config);
  }

  /**
   * Process a single task through the ACE pipeline
   */
  async processTask(
    task: Task,
    evaluateFn?: (answer: string) => Promise<boolean>
  ): Promise<ACEResult> {
    // Step 1: Generate reasoning trajectory
    const trajectory = await this.generator.generate(task, this.playbookManager, evaluateFn);

    // Step 2: Reflect on the trajectory to extract insights
    const insights = await this.reflector.reflect(trajectory);
    const filteredInsights = this.reflector.filterByConfidence(insights);

    // Step 3: Curate insights into delta updates
    const updates = this.curator.curate(filteredInsights);

    // Step 4: Apply updates to the playbook
    this.curator.applyUpdates(this.playbookManager, updates);

    return {
      task,
      trajectory,
      insights: filteredInsights,
      updates,
      updatedPlaybook: this.playbookManager.getPlaybook(),
    };
  }

  /**
   * Process multiple tasks in batch
   */
  async processBatch(
    tasks: Task[],
    evaluateFn?: (answer: string) => Promise<boolean>
  ): Promise<ACEResult[]> {
    const results: ACEResult[] = [];

    for (const task of tasks) {
      const result = await this.processTask(task, evaluateFn);
      results.push(result);
    }

    return results;
  }

  /**
   * Process tasks with comparative reflection
   *
   * This method generates multiple trajectories and compares successful
   * and failed ones to extract more robust insights.
   */
  async processWithComparison(
    tasks: Task[],
    evaluateFn: (answer: string) => Promise<boolean>,
    trajectoriesPerTask: number = 3
  ): Promise<{
    results: ACEResult[];
    comparativeInsights: Insight[];
  }> {
    const allTrajectories: Trajectory[] = [];
    const results: ACEResult[] = [];

    // Generate multiple trajectories for each task
    for (const task of tasks) {
      const trajectories = await this.generator.generateMultiple(
        task,
        this.playbookManager,
        trajectoriesPerTask,
        evaluateFn
      );
      allTrajectories.push(...trajectories);
    }

    // Separate successful and failed trajectories
    const successful = allTrajectories.filter(t => t.success);
    const failed = allTrajectories.filter(t => !t.success);

    // Perform comparative reflection
    let comparativeInsights: Insight[] = [];
    if (successful.length > 0 && failed.length > 0) {
      comparativeInsights = await this.reflector.reflectComparative(successful, failed);
      comparativeInsights = this.reflector.filterByConfidence(comparativeInsights);

      // Curate comparative insights
      const updates = this.curator.curate(comparativeInsights);
      this.curator.applyUpdates(this.playbookManager, updates);
    }

    // Create results for each task
    for (const task of tasks) {
      const taskTrajectories = allTrajectories.filter(t => t.taskId === task.id);
      const bestTrajectory = taskTrajectories.find(t => t.success) || taskTrajectories[0];

      results.push({
        task,
        trajectory: bestTrajectory,
        insights: comparativeInsights,
        updates: [],
        updatedPlaybook: this.playbookManager.getPlaybook(),
      });
    }

    return {
      results,
      comparativeInsights,
    };
  }

  /**
   * Train the ACE system on a dataset
   *
   * This method iteratively processes tasks, accumulating knowledge in the playbook
   */
  async train(
    tasks: Task[],
    evaluateFn: (answer: string) => Promise<boolean>,
    options?: {
      batchSize?: number;
      compareEveryNBatches?: number;
      onProgress?: (progress: {
        completed: number;
        total: number;
        currentPlaybookSize: number;
      }) => void;
    }
  ): Promise<{
    results: ACEResult[];
    finalPlaybook: PlaybookManager;
    stats: {
      totalTasks: number;
      successfulTasks: number;
      totalInsights: number;
      totalUpdates: number;
    };
  }> {
    const batchSize = options?.batchSize || 10;
    const compareEveryNBatches = options?.compareEveryNBatches || 5;
    const allResults: ACEResult[] = [];
    let totalInsights = 0;
    let totalUpdates = 0;

    // Process tasks in batches
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      // Every N batches, use comparative reflection
      if ((i / batchSize) % compareEveryNBatches === 0) {
        const { results, comparativeInsights } = await this.processWithComparison(
          batch,
          evaluateFn
        );
        allResults.push(...results);
        totalInsights += comparativeInsights.length;
      } else {
        const results = await this.processBatch(batch, evaluateFn);
        allResults.push(...results);
        totalInsights += results.reduce((sum, r) => sum + r.insights.length, 0);
      }

      totalUpdates += allResults.reduce((sum, r) => sum + r.updates.length, 0);

      // Report progress
      if (options?.onProgress) {
        options.onProgress({
          completed: i + batch.length,
          total: tasks.length,
          currentPlaybookSize: this.getPlaybookSize(),
        });
      }
    }

    const successfulTasks = allResults.filter(r => r.trajectory.success).length;

    return {
      results: allResults,
      finalPlaybook: this.playbookManager,
      stats: {
        totalTasks: tasks.length,
        successfulTasks,
        totalInsights,
        totalUpdates,
      },
    };
  }

  /**
   * Get the current playbook manager
   */
  getPlaybookManager(): PlaybookManager {
    return this.playbookManager;
  }

  /**
   * Get formatted playbook context
   */
  getPlaybookContext(): string {
    return this.playbookManager.getFormattedContext();
  }

  /**
   * Get the size of the playbook (number of strategies)
   */
  getPlaybookSize(): number {
    const playbook = this.playbookManager.getPlaybook();
    let size = playbook.globalStrategies.length;

    for (const [, section] of playbook.sections) {
      size += section.strategies.length;
    }

    return size;
  }

  /**
   * Export playbook to JSON
   */
  exportPlaybook(): string {
    return this.playbookManager.export();
  }

  /**
   * Load playbook from JSON
   */
  loadPlaybook(json: string): void {
    this.playbookManager = PlaybookManager.import(json);
  }

  /**
   * Reset the playbook to empty state
   */
  resetPlaybook(): void {
    this.playbookManager = new PlaybookManager();
  }

  /**
   * Get statistics about the ACE system
   */
  getStats(): {
    playbookVersion: number;
    totalSections: number;
    totalStrategies: number;
    playbookSize: number;
    lastUpdated: Date;
  } {
    const playbook = this.playbookManager.getPlaybook();

    return {
      playbookVersion: playbook.metadata.version,
      totalSections: playbook.sections.size,
      totalStrategies: this.getPlaybookSize(),
      playbookSize: this.getPlaybookSize(),
      lastUpdated: playbook.metadata.lastUpdated,
    };
  }
}
