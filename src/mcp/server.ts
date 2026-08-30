import { MessageMetadata } from '../gmail/types';
import { Category, PROTECTED_CATEGORIES } from '../classify/categories';
import { redactionFilter } from '../secrets/redact';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface ToolContext {
  getAccessToken: () => Promise<string>;
  classify: (messages: MessageMetadata[]) => Map<string, Category>;
}

export const MCP_TOOLS: Record<string, MCPTool> = {
  gmail_status: {
    name: 'gmail_status',
    description: 'Check authentication status and get basic account info',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  gmail_search: {
    name: 'gmail_search',
    description: 'Search for emails by query (e.g., "in:inbox newer_than:7d from:bank@example.com")',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query',
        },
      },
      required: ['query'],
    },
  },
  gmail_get_message: {
    name: 'gmail_get_message',
    description:
      'Retrieve a specific message by ID with subject, sender, snippet, and metadata',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'The Gmail message ID',
        },
      },
      required: ['messageId'],
    },
  },
  gmail_classify: {
    name: 'gmail_classify',
    description:
      'Classify messages by rules (OTP, bank, stocks, invoices, travel, work, jobs, promotions, spam)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query to find messages to classify',
        },
        limit: {
          type: 'number',
          description: 'Max messages to classify (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  gmail_category_report: {
    name: 'gmail_category_report',
    description: 'Generate a summary report of email categories in inbox',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query (default: "in:inbox")',
        },
      },
      required: [],
    },
  },
};

export function sanitizeToolResult(result: any): MCPToolResult {
  const redacted = redactionFilter.redactObject(result);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(redacted, null, 2),
      },
    ],
  };
}

export function isProtectedCategory(category: Category): boolean {
  return PROTECTED_CATEGORIES.has(category);
}
