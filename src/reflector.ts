import Anthropic from '@anthropic-ai/sdk';
import { Trajectory, Insight, ACEConfig } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reflector component - Extracts insights from trajectories
 *
 * The Reflector analyzes both successful and failed reasoning trajectories
 * to distill concrete, actionable insights. It compares successes and failures
 * to identify what works and what doesn't.
 */
export class Reflector {
  private client: Anthropic;
  private config: ACEConfig;

  constructor(config: ACEConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Reflect on a single trajectory to extract insights
   */
  async reflect(trajectory: Trajectory): Promise<Insight[]> {
    const prompt = this.buildSingleTrajectoryPrompt(trajectory);

    const response = await this.client.messages.create({
      model: this.config.modelName,
      max_tokens: this.config.maxTokens || 2048,
      temperature: this.config.temperature || 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    const fullResponse = content.type === 'text' ? content.text : '';

    return this.parseInsights(fullResponse, trajectory);
  }

  /**
   * Reflect on multiple trajectories to extract comparative insights
   */
  async reflectComparative(
    successfulTrajectories: Trajectory[],
    failedTrajectories: Trajectory[]
  ): Promise<Insight[]> {
    const prompt = this.buildComparativePrompt(successfulTrajectories, failedTrajectories);

    const response = await this.client.messages.create({
      model: this.config.modelName,
      max_tokens: this.config.maxTokens || 2048,
      temperature: this.config.temperature || 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    const fullResponse = content.type === 'text' ? content.text : '';

    return this.parseInsights(fullResponse);
  }

  /**
   * Build prompt for single trajectory reflection
   */
  private buildSingleTrajectoryPrompt(trajectory: Trajectory): string {
    const outcome = trajectory.success ? 'successful' : 'failed';

    let prompt = `Analyze the following ${outcome} reasoning trajectory and extract actionable insights:\n\n`;
    prompt += `Query: ${trajectory.query}\n\n`;
    prompt += `Reasoning:\n${trajectory.reasoning}\n\n`;
    prompt += `Answer: ${trajectory.answer}\n\n`;
    prompt += `Outcome: ${outcome.toUpperCase()}\n\n`;

    if (trajectory.success) {
      prompt += `Please identify:\n`;
      prompt += `1. What strategies or approaches made this reasoning successful?\n`;
      prompt += `2. What patterns or techniques can be generalized to similar problems?\n`;
      prompt += `3. What are the key insights that should be remembered?\n\n`;
    } else {
      prompt += `Please identify:\n`;
      prompt += `1. What went wrong in this reasoning process?\n`;
      prompt += `2. What mistakes or pitfalls should be avoided?\n`;
      prompt += `3. What alternative approaches might work better?\n\n`;
    }

    prompt += `Format your response as a list of insights, each on a new line starting with "INSIGHT:".\n`;
    prompt += `For each insight, indicate the category (e.g., "Strategy", "Pitfall", "Technique") in brackets.\n`;
    prompt += `Example format:\n`;
    prompt += `INSIGHT: [Strategy] Break down complex problems into smaller sub-problems\n`;
    prompt += `INSIGHT: [Pitfall] Avoid making assumptions without verification\n`;

    return prompt;
  }

  /**
   * Build prompt for comparative reflection
   */
  private buildComparativePrompt(
    successfulTrajectories: Trajectory[],
    failedTrajectories: Trajectory[]
  ): string {
    let prompt = `Compare the following successful and failed reasoning trajectories to extract insights:\n\n`;

    prompt += `## Successful Trajectories (${successfulTrajectories.length}):\n\n`;
    successfulTrajectories.forEach((traj, idx) => {
      prompt += `### Success ${idx + 1}:\n`;
      prompt += `Query: ${traj.query}\n`;
      prompt += `Reasoning: ${traj.reasoning.substring(0, 500)}...\n`;
      prompt += `Answer: ${traj.answer}\n\n`;
    });

    prompt += `## Failed Trajectories (${failedTrajectories.length}):\n\n`;
    failedTrajectories.forEach((traj, idx) => {
      prompt += `### Failure ${idx + 1}:\n`;
      prompt += `Query: ${traj.query}\n`;
      prompt += `Reasoning: ${traj.reasoning.substring(0, 500)}...\n`;
      prompt += `Answer: ${traj.answer}\n\n`;
    });

    prompt += `Please analyze the differences and identify:\n`;
    prompt += `1. What patterns consistently appear in successful trajectories but not in failures?\n`;
    prompt += `2. What mistakes or approaches consistently appear in failures?\n`;
    prompt += `3. What are the key differentiating factors?\n\n`;

    prompt += `Format your response as a list of insights, each on a new line starting with "INSIGHT:".\n`;
    prompt += `For each insight, indicate if it's HELPFUL or HARMFUL, and the category in brackets.\n`;
    prompt += `Example format:\n`;
    prompt += `INSIGHT: HELPFUL [Strategy] Verify assumptions before proceeding\n`;
    prompt += `INSIGHT: HARMFUL [Pitfall] Rushing to conclusions without checking all constraints\n`;

    return prompt;
  }

  /**
   * Parse insights from the reflector's response
   */
  private parseInsights(response: string, trajectory?: Trajectory): Insight[] {
    const insights: Insight[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(/INSIGHT:\s*(?:(HELPFUL|HARMFUL)\s*)?\[([^\]]+)\]\s*(.+)/i);

      if (match) {
        const typeStr = match[1]?.toUpperCase();
        const category = match[2].trim();
        const content = match[3].trim();

        let type: 'helpful' | 'harmful';
        if (typeStr === 'HARMFUL') {
          type = 'harmful';
        } else if (typeStr === 'HELPFUL') {
          type = 'helpful';
        } else if (trajectory) {
          // Infer from trajectory success
          type = trajectory.success ? 'helpful' : 'harmful';
        } else {
          // Default to helpful
          type = 'helpful';
        }

        const insight: Insight = {
          id: uuidv4(),
          content,
          type,
          category,
          examples: trajectory ? [trajectory.query] : [],
          confidence: this.calculateInsightConfidence(content),
          timestamp: new Date(),
        };

        insights.push(insight);
      }
    }

    return insights;
  }

  /**
   * Calculate confidence score for an insight based on its specificity and clarity
   */
  private calculateInsightConfidence(content: string): number {
    // Simple heuristic based on length and specificity
    let confidence = 0.5;

    // Longer, more detailed insights get higher confidence
    if (content.length > 100) confidence += 0.2;
    if (content.length > 200) confidence += 0.1;

    // Insights with specific keywords get higher confidence
    const specificKeywords = ['always', 'never', 'must', 'should', 'avoid', 'ensure', 'verify'];
    const hasSpecificKeywords = specificKeywords.some(keyword =>
      content.toLowerCase().includes(keyword)
    );
    if (hasSpecificKeywords) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Filter insights based on minimum confidence threshold
   */
  filterByConfidence(insights: Insight[]): Insight[] {
    const minConfidence = this.config.reflectorConfig?.minConfidence || 0.3;
    return insights.filter(insight => insight.confidence >= minConfidence);
  }
}
