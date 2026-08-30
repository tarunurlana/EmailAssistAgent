export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload?: {
    partId?: string;
    mimeType?: string;
    filename?: string;
    headers?: Array<{ name: string; value: string }>;
  };
  internalDate?: string;
}

export interface MessageMetadata {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
  listUnsubscribe?: string;
}

export const TEST_MESSAGES = {
  otp: {
    id: 'msg-otp-1',
    threadId: 't1',
    sender: 'noreply@google.com',
    subject: 'Your Google verification code is 123456',
    snippet: 'Verification code: 123456',
    date: new Date().toISOString(),
  },
  bankStatement: {
    id: 'msg-bank-1',
    threadId: 't2',
    sender: 'notifications@hdfc.com',
    subject: 'Your HDFC Account Statement for August',
    snippet: 'Your account balance is...',
    date: new Date().toISOString(),
  },
  bankPromo: {
    id: 'msg-bank-promo-1',
    threadId: 't3',
    sender: 'marketing@hdfc.com',
    subject: 'Limited Time: Exclusive Credit Card Offer',
    snippet: 'Get 0% APR for 6 months...',
    date: new Date().toISOString(),
  },
};
