/**
 * Example usage of the ACE (Agentic Context Engineering) framework
 */

import { ACE } from './ace';
import { Task, ACEConfig } from './types';
import { v4 as uuidv4 } from 'uuid';

// Example 1: Simple Math Problem Solving
async function example1Simple() {
  console.log('=== Example 1: Simple Task Processing ===\n');

  // Configure ACE with your API key
  const config: ACEConfig = {
    modelName: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxTokens: 4096,
    temperature: 0.7,
    generatorConfig: {
      includePlaybook: true,
    },
  };

  const ace = new ACE(config);

  // Define a simple task
  const task: Task = {
    id: uuidv4(),
    query: 'What is the sum of all prime numbers between 1 and 20?',
  };

  // Simple evaluator that checks if the answer contains the correct result
  const evaluator = async (answer: string): Promise<boolean> => {
    return answer.includes('77') || answer.includes('seventy-seven');
  };

  // Process the task
  const result = await ace.processTask(task, evaluator);

  console.log('Task:', result.task.query);
  console.log('Answer:', result.trajectory.answer);
  console.log('Success:', result.trajectory.success);
  console.log('Insights extracted:', result.insights.length);
  console.log('Updates applied:', result.updates.length);
  console.log('\nPlaybook context:\n', ace.getPlaybookContext());
}

// Example 2: Training on Multiple Tasks
async function example2Training() {
  console.log('\n=== Example 2: Training on Multiple Tasks ===\n');

  const config: ACEConfig = {
    modelName: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxTokens: 4096,
    temperature: 0.7,
    generatorConfig: {
      includePlaybook: true,
    },
  };

  const ace = new ACE(config);

  // Define a set of tasks
  const tasks: Task[] = [
    {
      id: uuidv4(),
      query: 'Calculate the factorial of 5',
    },
    {
      id: uuidv4(),
      query: 'Find the greatest common divisor (GCD) of 48 and 18',
    },
    {
      id: uuidv4(),
      query: 'Determine if 17 is a prime number',
    },
  ];

  // Define evaluators for each task
  const evaluators: Record<string, (answer: string) => Promise<boolean>> = {
    [tasks[0].id]: async (answer: string) => answer.includes('120'),
    [tasks[1].id]: async (answer: string) => answer.includes('6'),
    [tasks[2].id]: async (answer: string) =>
      answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('prime'),
  };

  // Train the system
  const { results, finalPlaybook, stats } = await ace.train(
    tasks,
    async (answer: string) => {
      // For simplicity, we'll use a generic evaluator
      return true;
    },
    {
      batchSize: 2,
      compareEveryNBatches: 1,
      onProgress: (progress) => {
        console.log(
          `Progress: ${progress.completed}/${progress.total} - Playbook size: ${progress.currentPlaybookSize}`
        );
      },
    }
  );

  console.log('\n=== Training Results ===');
  console.log('Total tasks:', stats.totalTasks);
  console.log('Successful tasks:', stats.successfulTasks);
  console.log('Total insights:', stats.totalInsights);
  console.log('Total updates:', stats.totalUpdates);
  console.log('\nFinal playbook size:', ace.getPlaybookSize());
  console.log('\nFinal playbook context:\n', ace.getPlaybookContext());

  // Export the playbook
  const exportedPlaybook = ace.exportPlaybook();
  console.log('\n=== Exported Playbook (first 500 chars) ===');
  console.log(exportedPlaybook.substring(0, 500) + '...');
}

// Example 3: Question Answering with Context
async function example3QA() {
  console.log('\n=== Example 3: Question Answering ===\n');

  const config: ACEConfig = {
    modelName: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxTokens: 4096,
    temperature: 0.7,
    generatorConfig: {
      includePlaybook: true,
    },
  };

  const ace = new ACE(config);

  // Define a question answering task with context
  const task: Task = {
    id: uuidv4(),
    query: 'Who was the first president of the United States?',
    context: {
      domain: 'history',
      type: 'factual',
    },
  };

  const result = await ace.processTask(task);

  console.log('Question:', result.task.query);
  console.log('Answer:', result.trajectory.answer);
  console.log('\nReasoning process:');
  console.log(result.trajectory.reasoning);
}

// Example 4: Comparative Reflection
async function example4Comparative() {
  console.log('\n=== Example 4: Comparative Reflection ===\n');

  const config: ACEConfig = {
    modelName: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    maxTokens: 4096,
    temperature: 0.7,
    generatorConfig: {
      includePlaybook: true,
    },
  };

  const ace = new ACE(config);

  const tasks: Task[] = [
    {
      id: uuidv4(),
      query: 'What is 15 * 12?',
    },
    {
      id: uuidv4(),
      query: 'What is 25 * 8?',
    },
  ];

  const evaluator = async (answer: string): Promise<boolean> => {
    return answer.includes('180') || answer.includes('200');
  };

  const { results, comparativeInsights } = await ace.processWithComparison(
    tasks,
    evaluator,
    3 // Generate 3 trajectories per task
  );

  console.log('Comparative insights extracted:', comparativeInsights.length);
  console.log('\nInsights:');
  comparativeInsights.forEach((insight, idx) => {
    console.log(`${idx + 1}. [${insight.type}] ${insight.content}`);
  });

  console.log('\nPlaybook after comparative reflection:');
  console.log(ace.getPlaybookContext());
}

// Main function to run examples
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
    console.log('Please set it with: export ANTHROPIC_API_KEY=your_api_key_here');
    process.exit(1);
  }

  try {
    // Run examples
    await example1Simple();
    // await example2Training();
    // await example3QA();
    // await example4Comparative();
  } catch (error) {
    console.error('Error running examples:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { example1Simple, example2Training, example3QA, example4Comparative };
