import Anthropic from '@anthropic-ai/sdk';
import { Task, Trajectory, ACEConfig } from './types';
import { PlaybookManager } from './playbook';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generator component - Produces reasoning trajectories for tasks
 *
 * The Generator creates detailed reasoning traces that explore both successful
 * strategies and common pitfalls. It leverages the current playbook to guide
 * its reasoning process.
 */
export class Generator {
  private client: Anthropic;
  private config: ACEConfig;

  constructor(config: ACEConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Generate a reasoning trajectory for a task
   */
  async generate(
    task: Task,
    playbookManager: PlaybookManager,
    evaluateFn?: (answer: string) => Promise<boolean>
  ): Promise<Trajectory> {
    const playbookContext = this.config.generatorConfig?.includePlaybook
      ? playbookManager.getFormattedContext()
      : '';

    const prompt = this.buildPrompt(task, playbookContext);

    const response = await this.client.messages.create({
      model: this.config.modelName,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    const fullResponse = content.type === 'text' ? content.text : '';

    // Parse the response to extract reasoning and answer
    const { reasoning, answer } = this.parseResponse(fullResponse);

    // Evaluate the answer if evaluator is provided
    let success = false;
    if (evaluateFn) {
      success = await evaluateFn(answer);
    }

    const trajectory: Trajectory = {
      id: uuidv4(),
      taskId: task.id,
      query: task.query,
      reasoning,
      answer,
      success,
      timestamp: new Date(),
    };

    return trajectory;
  }

  /**
   * Build the prompt for the Generator
   */
  private buildPrompt(task: Task, playbookContext: string): string {
    let prompt = '';

    if (playbookContext) {
      prompt += `You are an intelligent agent solving complex tasks. Below is a playbook of strategies learned from previous experiences:\n\n${playbookContext}\n\n`;
      prompt += `Use these strategies to guide your reasoning, but adapt as needed for the specific task.\n\n`;
    } else {
      prompt += `You are an intelligent agent solving complex tasks.\n\n`;
    }

    prompt += `Task: ${task.query}\n\n`;

    if (task.context && Object.keys(task.context).length > 0) {
      prompt += `Additional Context:\n${JSON.stringify(task.context, null, 2)}\n\n`;
    }

    prompt += `Please provide a detailed step-by-step reasoning process, then give your final answer.\n\n`;
    prompt += `Format your response as:\n`;
    prompt += `REASONING:\n`;
    prompt += `[Your detailed reasoning here]\n\n`;
    prompt += `ANSWER:\n`;
    prompt += `[Your final answer here]`;

    return prompt;
  }

  /**
   * Parse the response to extract reasoning and answer
   */
  private parseResponse(response: string): { reasoning: string; answer: string } {
    const reasoningMatch = response.match(/REASONING:\s*([\s\S]*?)(?=ANSWER:|$)/i);
    const answerMatch = response.match(/ANSWER:\s*([\s\S]*?)$/i);

    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';
    const answer = answerMatch ? answerMatch[1].trim() : response.trim();

    return { reasoning, answer };
  }

  /**
   * Generate multiple trajectories for the same task (for exploration)
   */
  async generateMultiple(
    task: Task,
    playbookManager: PlaybookManager,
    count: number,
    evaluateFn?: (answer: string) => Promise<boolean>
  ): Promise<Trajectory[]> {
    const maxTrajectories = this.config.generatorConfig?.maxTrajectories || count;
    const actualCount = Math.min(count, maxTrajectories);

    const promises = Array.from({ length: actualCount }, () =>
      this.generate(task, playbookManager, evaluateFn)
    );

    return Promise.all(promises);
  }
}
