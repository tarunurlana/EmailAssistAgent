import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GmailClient } from './gmail/client.js';
import { Classifier, summarizeClassification } from './classify/classifier.js';
import { MCP_TOOLS, sanitizeToolResult, isProtectedCategory } from './mcp/server.js';
import { GoogleOAuth, loadCredentials } from './auth/oauth.js';

const server = new Server({
  name: 'gmail-organizer-agent',
  version: '1.0.0',
});

let oauth: GoogleOAuth;
let gmail: GmailClient | null = null;
const classifier = new Classifier();

async function initializeOAuth(): Promise<GoogleOAuth> {
  if (!oauth) {
    const creds = loadCredentials();
    oauth = new GoogleOAuth(creds.client_id, creds.client_secret);
  }
  return oauth;
}

async function getGmailClient(): Promise<GmailClient> {
  if (!gmail) {
    const oauthClient = await initializeOAuth();
    const token = await oauthClient.getOrRefreshAccessToken();
    if (!token) {
      throw new Error('Not authenticated. Run "npm run login" first.');
    }
    gmail = new GmailClient(token);
  }
  return gmail;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: Tool[] = Object.values(MCP_TOOLS).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'gmail_status': {
        const oauthClient = await initializeOAuth();
        const authenticated = await oauthClient.isLoggedIn();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizeToolResult({
                authenticated,
                message: authenticated
                  ? 'Authenticated and ready'
                  : 'Not authenticated. Run "npm run login" first.',
              })),
            },
          ],
        };
      }

      case 'gmail_search': {
        const gmailClient = await getGmailClient();
        const messageIds = await gmailClient.search((args as any).query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizeToolResult({
                query: (args as any).query,
                count: messageIds.length,
                messageIds: messageIds.slice(0, 20),
              })),
            },
          ],
        };
      }

      case 'gmail_get_message': {
        const gmailClient = await getGmailClient();
        const msg = await gmailClient.getMessageMetadata((args as any).messageId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizeToolResult({
                ...msg,
                category: classifier.classify(msg),
              })),
            },
          ],
        };
      }

      case 'gmail_classify': {
        const gmailClient = await getGmailClient();
        const messageIds = await gmailClient.search((args as any).query);
        const limit = (args as any).limit || 10;
        const sample = messageIds.slice(0, limit);

        const messages = await Promise.all(
          sample.map((id) => gmailClient.getMessageMetadata(id))
        );
        const classified = classifier.classifyBatch(messages);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizeToolResult({
                query: (args as any).query,
                totalFound: messageIds.length,
                classified: sample.map((id) => ({
                  messageId: id,
                  category: classified.get(id),
                  protected: isProtectedCategory(classified.get(id)!),
                })),
              })),
            },
          ],
        };
      }

      case 'gmail_category_report': {
        const gmailClient = await getGmailClient();
        const query = (args as any).query || 'in:inbox';
        const messageIds = await gmailClient.search(query);
        const sample = messageIds.slice(0, 50);

        const messages = await Promise.all(
          sample.map((id) => gmailClient.getMessageMetadata(id))
        );
        const classified = classifier.classifyBatch(messages);
        const summary = summarizeClassification(classified);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizeToolResult({
                query,
                totalInInbox: messageIds.length,
                sampleSize: sample.length,
                categorySummary: summary,
                protectedCategories: Array.from(
                  new Set(Array.from(classified.values()).filter((c) => isProtectedCategory(c)))
                ),
              })),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sanitizeToolResult({
                error: `Unknown tool: ${name}`,
              })),
            },
          ],
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(sanitizeToolResult({
            error: error.message || String(error),
          })),
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gmail Organizer MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
