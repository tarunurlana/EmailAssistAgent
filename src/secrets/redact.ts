export class RedactionFilter {
  private patterns = [
    // OAuth tokens
    /ya29\.[A-Za-z0-9\-_]{30,}/g,
    // API keys (e.g., Google API keys start with AIza)
    /AIza[A-Za-z0-9_-]{30,}/g,
    // Client secrets
    /GOCSPX-[A-Za-z0-9_-]{30,}/g,
    // Generic Bearer tokens
    /Bearer\s+[A-Za-z0-9\-_.]+/gi,
    // Email-like patterns that look suspicious
    /[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}(?=.*(?:password|token|secret|key))/gi,
  ];

  redact(input: string): string {
    let result = input;
    for (const pattern of this.patterns) {
      result = result.replace(pattern, '[REDACTED_CREDENTIAL]');
    }
    return result;
  }

  redactObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.redact(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map((item) => this.redactObject(item));
      }
      const redacted: any = {};
      for (const key of Object.keys(obj)) {
        redacted[key] = this.redactObject(obj[key]);
      }
      return redacted;
    }
    return obj;
  }
}

export const redactionFilter = new RedactionFilter();
