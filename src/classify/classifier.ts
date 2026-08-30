import { MessageMetadata } from '../gmail/types';
import { Category } from './categories';
import { CompiledRule, compileRules, DEFAULT_RULES } from './rules';

export class Classifier {
  private rules: CompiledRule[];

  constructor(ruleSchemas = DEFAULT_RULES) {
    this.rules = compileRules(ruleSchemas);
  }

  classify(msg: MessageMetadata): Category {
    const matches = this.rules.filter((rule) => rule.test(msg));

    if (matches.length === 0) {
      return 'personal';
    }

    // Precedence rule: if both bank/account and bank/promotional match, prefer bank/promotional
    const hasPromo = matches.some((r) => r.category === 'bank/promotional');
    const hasAccount = matches.some((r) => r.category === 'bank/account');
    if (hasPromo && hasAccount) {
      return 'bank/promotional';
    }

    return matches[0].category;
  }

  classifyBatch(messages: MessageMetadata[]): Map<string, Category> {
    const result = new Map<string, Category>();
    for (const msg of messages) {
      result.set(msg.id, this.classify(msg));
    }
    return result;
  }
}

export function summarizeClassification(
  classified: Map<string, Category>
): Record<Category, number> {
  const summary: Record<string, number> = {};
  for (const category of classified.values()) {
    summary[category] = (summary[category] || 0) + 1;
  }
  return summary as Record<Category, number>;
}
