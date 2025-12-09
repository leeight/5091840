/**
 * Test fixtures and sample data
 */

import { Task, Trajectory, Insight, Strategy, PlaybookSection, Playbook } from '../../src/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a test task
 */
export function createTestTask(query: string, context?: Record<string, any>): Task {
  return {
    id: uuidv4(),
    query,
    context,
  };
}

/**
 * Create a test trajectory
 */
export function createTestTrajectory(
  taskId: string,
  query: string,
  answer: string,
  success: boolean
): Trajectory {
  return {
    id: uuidv4(),
    taskId,
    query,
    reasoning: 'Test reasoning process',
    answer,
    success,
    timestamp: new Date(),
  };
}

/**
 * Create a test insight
 */
export function createTestInsight(
  content: string,
  type: 'helpful' | 'harmful' = 'helpful',
  category: string = 'Test'
): Insight {
  return {
    id: uuidv4(),
    content,
    type,
    category,
    examples: ['example query'],
    confidence: 0.8,
    timestamp: new Date(),
  };
}

/**
 * Create a test strategy
 */
export function createTestStrategy(
  content: string,
  type: 'helpful' | 'harmful' = 'helpful'
): Strategy {
  return {
    id: uuidv4(),
    content,
    type,
    helpfulCount: type === 'helpful' ? 5 : 1,
    harmfulCount: type === 'harmful' ? 5 : 1,
    examples: ['example 1', 'example 2'],
    confidence: 0.75,
    created: new Date(),
    lastUpdated: new Date(),
  };
}

/**
 * Create a test playbook section
 */
export function createTestSection(name: string, strategies: Strategy[]): PlaybookSection {
  return {
    id: uuidv4(),
    name,
    strategies,
    metadata: {
      created: new Date(),
      lastUpdated: new Date(),
      usageCount: 0,
    },
  };
}

/**
 * Create a test playbook
 */
export function createTestPlaybook(): Playbook {
  const sections = new Map<string, PlaybookSection>();

  sections.set(
    'Mathematics',
    createTestSection('Mathematics', [
      createTestStrategy('Break down complex calculations into steps', 'helpful'),
      createTestStrategy('Verify calculations before providing final answer', 'helpful'),
    ])
  );

  sections.set(
    'Problem Solving',
    createTestSection('Problem Solving', [
      createTestStrategy('Identify the core problem before attempting solution', 'helpful'),
      createTestStrategy('Avoid making assumptions without verification', 'harmful'),
    ])
  );

  return {
    id: uuidv4(),
    sections,
    globalStrategies: [
      createTestStrategy('Always explain reasoning step-by-step', 'helpful'),
    ],
    metadata: {
      version: 1,
      created: new Date(),
      lastUpdated: new Date(),
      totalUpdates: 0,
    },
  };
}

/**
 * Sample math tasks
 */
export const mathTasks: Task[] = [
  createTestTask('What is 15 × 12?'),
  createTestTask('Calculate the factorial of 5'),
  createTestTask('Find the sum of prime numbers between 1 and 20'),
  createTestTask('What is the GCD of 48 and 18?'),
  createTestTask('Is 17 a prime number?'),
];

/**
 * Sample evaluators
 */
export const mathEvaluators: Record<string, (answer: string) => boolean> = {
  '15 × 12': (answer) => answer.includes('180'),
  'factorial of 5': (answer) => answer.includes('120'),
  'sum of prime': (answer) => answer.includes('77'),
  'GCD of 48 and 18': (answer) => answer.includes('6'),
  'Is 17 a prime': (answer) => answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('prime'),
};

/**
 * Sample insights
 */
export const sampleInsights: Insight[] = [
  createTestInsight('Break problems into smaller steps', 'helpful', 'Strategy'),
  createTestInsight('Verify calculations before answering', 'helpful', 'Verification'),
  createTestInsight('Avoid rushing to conclusions', 'harmful', 'Pitfall'),
  createTestInsight('Use systematic approach for complex problems', 'helpful', 'Strategy'),
];
