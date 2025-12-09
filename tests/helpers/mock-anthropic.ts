/**
 * Mock Anthropic client for testing
 */

import type Anthropic from '@anthropic-ai/sdk';

export class MockAnthropicClient {
  private responses: Map<string, any> = new Map();
  private callCount: number = 0;

  setResponse(key: string, response: any) {
    this.responses.set(key, response);
  }

  async create(params: any): Promise<any> {
    this.callCount++;

    // Default response
    const defaultResponse = {
      id: 'msg_test_' + this.callCount,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'REASONING:\nTest reasoning process\n\nANSWER:\nTest answer',
        },
      ],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    };

    // Check if we have a custom response
    const message = params.messages?.[0]?.content || '';
    for (const [key, response] of this.responses) {
      if (message.includes(key)) {
        return response;
      }
    }

    return defaultResponse;
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset() {
    this.responses.clear();
    this.callCount = 0;
  }
}

export function createMockAnthropicClient(): any {
  const mockClient = new MockAnthropicClient();

  return {
    messages: {
      create: mockClient.create.bind(mockClient),
    },
    _mock: mockClient,
  };
}

/**
 * Create a mock response for successful reasoning
 */
export function createSuccessResponse(answer: string): any {
  return {
    id: 'msg_success',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: `REASONING:\nI will solve this step by step.\n1. Analyze the problem\n2. Apply appropriate strategy\n3. Verify the solution\n\nANSWER:\n${answer}`,
      },
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

/**
 * Create a mock response for failed reasoning
 */
export function createFailureResponse(answer: string): any {
  return {
    id: 'msg_failure',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: `REASONING:\nAttempting to solve...\nMade an error in calculation.\n\nANSWER:\n${answer}`,
      },
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

/**
 * Create a mock response for reflection
 */
export function createReflectionResponse(insights: string[]): any {
  const insightText = insights
    .map((insight, i) => `INSIGHT: [Strategy] ${insight}`)
    .join('\n');

  return {
    id: 'msg_reflection',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: insightText,
      },
    ],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    usage: { input_tokens: 200, output_tokens: 100 },
  };
}
