import { MessageMetadata } from '../gmail/types';
import { Category } from './categories';

export interface RuleCondition {
  senderDomains?: string[];
  subjectPatterns?: string[];
  listUnsubscribeRequired?: boolean;
}

export interface RuleSchema {
  name: string;
  category: Category;
  priority: number;
  match?: 'any' | 'all';
  conditions: RuleCondition;
}

export interface CompiledRule {
  name: string;
  category: Category;
  priority: number;
  match: 'any' | 'all';
  test: (msg: MessageMetadata) => boolean;
  matchedFields?: string[];
}

export function compileRules(ruleSchemas: RuleSchema[]): CompiledRule[] {
  return ruleSchemas
    .sort((a, b) => b.priority - a.priority)
    .map((rule) => ({
      name: rule.name,
      category: rule.category,
      priority: rule.priority,
      match: rule.match || 'any',
      test: (msg: MessageMetadata) => matchField(msg, rule),
    }));
}

function matchField(msg: MessageMetadata, rule: RuleSchema): boolean {
  const { conditions, match = 'any' } = rule;
  const results: boolean[] = [];

  if (conditions.senderDomains && conditions.senderDomains.length > 0) {
    const senderDomain = extractDomain(msg.sender);
    results.push(conditions.senderDomains.some((d) => senderDomain.includes(d)));
  }

  if (conditions.subjectPatterns && conditions.subjectPatterns.length > 0) {
    results.push(
      conditions.subjectPatterns.some((pattern) => {
        try {
          return new RegExp(pattern, 'i').test(msg.subject);
        } catch {
          return false;
        }
      })
    );
  }

  if (conditions.listUnsubscribeRequired) {
    results.push(!!msg.listUnsubscribe);
  }

  if (results.length === 0) {
    return false;
  }

  return match === 'all' ? results.every((r) => r) : results.some((r) => r);
}

function extractDomain(email: string): string {
  const match = email.match(/@([\w.-]+)/);
  return match ? match[1] : '';
}

export const DEFAULT_RULES: RuleSchema[] = [
  {
    name: 'OTP Detector',
    category: 'otp',
    priority: 100,
    match: 'any',
    conditions: {
      subjectPatterns: [
        'verification code',
        '2fa',
        'two factor',
        'otp',
        'confirm your identity',
      ],
    },
  },
  {
    name: 'Bank Account Statements',
    category: 'bank/account',
    priority: 90,
    match: 'any',
    conditions: {
      senderDomains: ['hdfc.com', 'icici.com', 'axis.com', 'sbi.co.in'],
      subjectPatterns: ['statement', 'account alert', 'transaction', 'kyc'],
    },
  },
  {
    name: 'Bank Promotional',
    category: 'bank/promotional',
    priority: 85,
    match: 'all',
    conditions: {
      senderDomains: ['hdfc.com', 'icici.com', 'axis.com', 'sbi.co.in'],
      subjectPatterns: [
        'offer',
        'promotional',
        'limited time',
        'exclusive',
        'credit card',
      ],
    },
  },
  {
    name: 'Stock and Finance',
    category: 'finance/stocks',
    priority: 80,
    match: 'any',
    conditions: {
      senderDomains: [
        'zerodha.com',
        'groww.in',
        'icicidirect.com',
        'bseindia.com',
      ],
      subjectPatterns: [
        'dividend',
        'stock',
        'portfolio',
        'ipo',
        'broker',
        'cas',
      ],
    },
  },
  {
    name: 'Invoices and Orders',
    category: 'invoice/orders',
    priority: 75,
    match: 'any',
    conditions: {
      subjectPatterns: [
        'invoice',
        'order confirmation',
        'receipt',
        'bill',
        'purchase',
      ],
    },
  },
  {
    name: 'Travel',
    category: 'travel',
    priority: 70,
    match: 'any',
    conditions: {
      senderDomains: ['makemytrip.com', 'cleartrip.com', 'airbnb.com'],
      subjectPatterns: [
        'booking',
        'flight',
        'hotel',
        'itinerary',
        'confirmation',
      ],
    },
  },
  {
    name: 'Work Microsoft',
    category: 'work/microsoft',
    priority: 65,
    match: 'any',
    conditions: {
      senderDomains: ['microsoft.com', 'outlook.com'],
    },
  },
  {
    name: 'Work Amdocs',
    category: 'work/amdocs',
    priority: 60,
    match: 'any',
    conditions: {
      senderDomains: ['amdocs.com'],
    },
  },
  {
    name: 'Jobs and Recruiters',
    category: 'jobs',
    priority: 55,
    match: 'any',
    conditions: {
      subjectPatterns: [
        'job',
        'offer',
        'interview',
        'application',
        'recruiter',
        'linkedin',
      ],
    },
  },
  {
    name: 'Promotions',
    category: 'promotions',
    priority: 20,
    match: 'any',
    conditions: {
      listUnsubscribeRequired: true,
      subjectPatterns: ['sale', 'discount', 'offer', 'limited time'],
    },
  },
];
