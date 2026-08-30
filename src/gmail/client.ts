import { google } from 'googleapis';
import { GmailMessage, MessageMetadata } from './types';

export class GmailClient {
  private gmail: any;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async search(query: string): Promise<string[]> {
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10,
    });
    return (res.data.messages || []).map((m: any) => m.id);
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    const res = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe'],
    });
    return res.data;
  }

  async getMessageMetadata(messageId: string): Promise<MessageMetadata> {
    const msg = await this.getMessage(messageId);
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
        ?.value || '';

    return {
      id: msg.id,
      threadId: msg.threadId,
      sender: getHeader('From'),
      subject: getHeader('Subject'),
      snippet: msg.snippet,
      date: getHeader('Date'),
      listUnsubscribe: getHeader('List-Unsubscribe'),
    };
  }

  async classifyMessage(messageId: string): Promise<MessageMetadata> {
    return this.getMessageMetadata(messageId);
  }
}
