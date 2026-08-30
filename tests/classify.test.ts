import { describe, it, expect } from 'vitest';
import { Classifier, summarizeClassification } from '../src/classify/classifier';
import { RedactionFilter } from '../src/secrets/redact';
import { MessageMetadata } from '../src/gmail/types';

describe('Classifier', () => {
  const classifier = new Classifier();

  const testMessages: Record<string, MessageMetadata> = {
    otp: {
      id: '1',
      threadId: 't1',
      sender: 'no-reply@google.com',
      subject: 'Google verification code 123456',
      snippet: 'Your verification code is 123456',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: undefined,
    },
    bankAccount: {
      id: '2',
      threadId: 't2',
      sender: 'noreply@hdfc.com',
      subject: 'Your account statement for Dec 2024',
      snippet: 'Your monthly statement is ready',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: undefined,
    },
    bankPromo: {
      id: '3',
      threadId: 't3',
      sender: 'marketing@hdfc.com',
      subject: 'Limited time offer - Get credit card offer now',
      snippet: 'Exclusive offer for you',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: '<mailto:unsubscribe@hdfc.com>',
    },
    stock: {
      id: '4',
      threadId: 't4',
      sender: 'noreply@zerodha.com',
      subject: 'Your dividend payout has been credited',
      snippet: 'Dividend received in account',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: undefined,
    },
    invoice: {
      id: '5',
      threadId: 't5',
      sender: 'orders@amazon.in',
      subject: 'Order confirmation - Your purchase',
      snippet: 'Order ID: ABC123',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: undefined,
    },
    travel: {
      id: '6',
      threadId: 't6',
      sender: 'confirmations@makemytrip.com',
      subject: 'Flight booking confirmation - Delhi to Bangalore',
      snippet: 'Booking ref: MMT123',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: undefined,
    },
    microsoft: {
      id: '7',
      threadId: 't7',
      sender: 'noreply@microsoft.com',
      subject: 'Your meeting reminder',
      snippet: 'You have a meeting in 15 minutes',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: undefined,
    },
    promotion: {
      id: '8',
      threadId: 't8',
      sender: 'marketing@flipkart.com',
      subject: 'Big sale this weekend - 50% off',
      snippet: 'Don\'t miss our biggest sale',
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: '<mailto:unsubscribe@flipkart.com>',
    },
  };

  it('should classify OTP messages', () => {
    const category = classifier.classify(testMessages.otp);
    expect(category).toBe('otp');
  });

  it('should classify bank account statements', () => {
    const category = classifier.classify(testMessages.bankAccount);
    expect(category).toBe('bank/account');
  });

  it('should classify bank promotional with higher priority', () => {
    const category = classifier.classify(testMessages.bankPromo);
    expect(category).toBe('bank/promotional');
  });

  it('should classify stock/finance messages', () => {
    const category = classifier.classify(testMessages.stock);
    expect(category).toBe('finance/stocks');
  });

  it('should classify invoice/order messages', () => {
    const category = classifier.classify(testMessages.invoice);
    expect(category).toBe('invoice/orders');
  });

  it('should classify travel messages', () => {
    const category = classifier.classify(testMessages.travel);
    expect(category).toBe('travel');
  });

  it('should classify Microsoft work messages', () => {
    const category = classifier.classify(testMessages.microsoft);
    expect(category).toBe('work/microsoft');
  });

  it('should classify promotional messages', () => {
    const category = classifier.classify(testMessages.promotion);
    expect(category).toBe('promotions');
  });

  it('should batch classify multiple messages', () => {
    const messages = Object.values(testMessages);
    const classified = classifier.classifyBatch(messages);
    expect(classified.size).toBe(messages.length);
    expect(classified.get('1')).toBe('otp');
    expect(classified.get('3')).toBe('bank/promotional');
  });

  it('should summarize classifications', () => {
    const messages = Object.values(testMessages);
    const classified = classifier.classifyBatch(messages);
    const summary = summarizeClassification(classified);

    expect(summary.otp).toBe(1);
    expect(summary['bank/account']).toBe(1);
    expect(summary['bank/promotional']).toBe(1);
    expect(summary['finance/stocks']).toBe(1);
    expect(summary['invoice/orders']).toBe(1);
    expect(summary.travel).toBe(1);
    expect(summary['work/microsoft']).toBe(1);
    expect(summary.promotions).toBe(1);
  });

  it('should classify unmatched messages as personal', () => {
    const personal: MessageMetadata = {
      id: '99',
      threadId: 't99',
      sender: 'friend@personal.com',
      subject: 'How are you doing?',
      snippet: "Let's catch up sometime",
      date: '2024-01-01T10:00:00Z',
      listUnsubscribe: undefined,
    };
    const category = classifier.classify(personal);
    expect(category).toBe('personal');
  });
});

describe('RedactionFilter', () => {
  const filter = new RedactionFilter();

  it('should redact OAuth tokens', () => {
    const input = 'My token is ya29.a0AfH6SMBx1234567890abcdefghijklmnop';
    const result = filter.redact(input);
    expect(result).toContain('[REDACTED_CREDENTIAL]');
    expect(result).not.toContain('ya29');
  });

  it('should redact Google API keys', () => {
    const input = 'API key: AIzaSyDx1234567890abcdefghijklmnopqrst';
    const result = filter.redact(input);
    expect(result).toContain('[REDACTED_CREDENTIAL]');
    expect(result).not.toContain('AIza');
  });

  it('should redact Bearer tokens', () => {
    const input = 'Authorization: Bearer token.abcdef.1234567890';
    const result = filter.redact(input);
    expect(result).toContain('[REDACTED_CREDENTIAL]');
    expect(result).not.toContain('Bearer');
  });

  it('should redact objects with credentials', () => {
    const obj = {
      email: 'test@example.com',
      token: 'ya29.a0AfH6SMBx1234567890abcdefghijklmnop',
      message: 'Hello',
    };
    const result = filter.redactObject(obj);
    expect(result.token).toContain('[REDACTED_CREDENTIAL]');
    expect(result.email).toBe('test@example.com');
    expect(result.message).toBe('Hello');
  });

  it('should not redact normal email addresses', () => {
    const input = 'Contact me at user@example.com';
    const result = filter.redact(input);
    expect(result).toBe(input);
  });

  it('should handle arrays of strings', () => {
    const arr = [
      'Normal string',
      'Token: ya29.a0AfH6SMBx1234567890abcdefghijklmnop',
      'Another normal string',
    ];
    const result = filter.redactObject(arr);
    expect(result[0]).toBe('Normal string');
    expect(result[1]).toContain('[REDACTED_CREDENTIAL]');
    expect(result[2]).toBe('Another normal string');
  });
});
