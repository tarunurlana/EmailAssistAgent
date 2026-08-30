# Gmail Organizer Agent

A secure, local-first email classification agent for your personal Gmail account. Never share your password or credentials with an agent — this tool uses Google OAuth 2.0 (PKCE + Keychain) to safely authorize access.

## Security First

- **Your credentials, your machine.** Refresh tokens are stored in macOS Keychain, not in a cloud service or logged anywhere.
- **No password ever.** Google OAuth installed-app flow means you log in in your own browser, and the agent never sees your password.
- **Least privilege.** Phase 1 requests `gmail.readonly` only. Phase 2+ scope upgrades require re-consent.
- **Read-only by default.** In phase 1, the agent can only search and classify mail, never write or delete anything.
- **Protected categories.** Your most important mail (OTPs, bank, invoices, stocks, travel, work, jobs) can never be auto-deleted, even by accident.

## Setup

### Prerequisites

- Node.js 24+ (or 18+ with `npm approve-scripts`)
- macOS (uses Keychain; Linux/Windows fallback to environment variables)
- Google Cloud project with Gmail API enabled (yours, under your personal Google account)

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the Gmail API
4. Create an **OAuth 2.0 Desktop App** credential
5. Set up OAuth consent screen as **External** with your email as a test user
6. Download the credentials as JSON and save to `credentials.json` in the repo root

### 2. Install and Login

```bash
npm install
npm run build
npm run login
```

When you run `npm run login`, a browser window will open. Log in with your Gmail account and grant access. Your refresh token is securely stored in Keychain.

### 3. Verify Authentication

```bash
npm run status
```

## Usage

### CLI Commands

```bash
# Check auth status
npm run status

# Classify emails in your inbox (last 7 days, first 20)
npm run classify

# Start the MCP server (for use with Copilot)
npm run dev
```

### MCP Tools

When the MCP server is running, the agent has access to these read-only tools:

- **`gmail_status`** — Check if authenticated
- **`gmail_search`** — Search for emails (e.g., `in:inbox from:bank@example.com`)
- **`gmail_get_message`** — Get a single email with subject, sender, snippet
- **`gmail_classify`** — Classify a batch of emails by category
- **`gmail_category_report`** — Generate a summary of categories in inbox

### Example

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: In Copilot, ask the agent:
# "What emails in my inbox are categorized as 'bank'?"
# "Summarize my email categories"
```

## Categories (Phase 1)

| Category | Protected | Examples |
|---|---|---|
| `otp` | ✓ | 2FA codes, verification codes |
| `bank/account` | ✓ | Statements, account alerts, KYC |
| `bank/promotional` | ✓ | Credit card offers from banks |
| `finance/stocks` | ✓ | Brokers, dividends, IPO, CAS |
| `invoice/orders` | ✓ | Order confirmations, receipts |
| `travel` | ✓ | Flights, hotels, trains |
| `work/microsoft` | ✓ | Emails from microsoft.com |
| `work/amdocs` | ✓ | Emails from amdocs.com |
| `jobs` | ✓ | Recruiters, applications |
| `promotions` | ✗ | Newsletters, marketing (cleanup candidate) |
| `spam-like` | ✗ | Bulk mail, unverified senders |
| `personal` | ✗ | Everything else, unclassified |

**Protected** categories can never be auto-deleted, even in future phases. The agent must ask before suggesting any action on them.

## Roadmap

### Phase 1 — ✅ Read-only Foundation
- OAuth login, Keychain storage, `gmail.readonly`
- Search, get, classify tools
- Rules-based classification
- Category report
- No destructive actions exist in code

### Phase 2 — 🎯 Labels (Planned)
- Upgrade to `gmail.modify`
- `gmail_apply_label` tool with dry-run default
- User approval per batch
- Never touches protected categories

### Phase 3 — 🔜 Cleanup Proposals (Later)
- Agent proposes batches to archive/trash
- You approve in chat
- Moves mail to Trash (recoverable)
- Protected categories still blocked by code

## Threat Model

| Threat | Mitigation |
|---|---|
| **Credential leak in logs** | Redaction filter scrubs all tool output for tokens, keys, secrets |
| **Malicious agent requests** | Only 5 read-only tools exposed; no write/delete tools in phase 1 |
| **Password compromise** | No password stored; Google OAuth + PKCE |
| **Token theft from disk** | Keychain (encrypted at rest); fallback to `security` CLI on macOS |
| **Accidental deletion of important mail** | Protected categories cannot be cleanup candidates; requires explicit approval |

## Architecture

```
Copilot Agent
    ↓ (MCP tools)
Local MCP Server (Node.js)
    ├ Auth: Google OAuth 2.0 + PKCE
    ├ Secrets: Keychain token storage
    ├ Gmail: API wrapper with backoff
    └ Classify: Rules engine + optional LLM
    ↓ (libraries)
Google APIs
    ↓
Your Gmail
```

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test
npm run test:watch

# Watch mode (auto-rebuild)
# (coming soon)
```

## Files

```
src/
  auth/
    oauth.ts           # Google OAuth 2.0 + PKCE flow
    scopes.ts          # OAuth scope constants
  gmail/
    client.ts          # Gmail API wrapper
    types.ts           # Message interfaces
  classify/
    categories.ts      # Category definitions
    classifier.ts      # Hybrid classifier
    rules.ts           # Rules engine
  secrets/
    redact.ts          # Credential redaction filter
    store.ts           # Keychain token helpers
  mcp/
    server.ts          # MCP tool definitions
  cli.ts               # CLI entry point (login, classify)
  mcp-server.ts        # MCP server lifecycle
rules/
  default-rules.yaml   # Classification rules
tests/
  classify.test.ts     # Classifier + redaction tests
```

## Troubleshooting

### "Not authenticated. Run `npm run login` first."
- Your refresh token is missing or expired (7-day limit in Testing mode)
- Solution: `npm run login` to re-authorize

### Token refresh fails
- Your Google Cloud project OAuth consent screen is not set up correctly
- Check: Console → OAuth Consent Screen → External, with your email as test user

### Keychain errors on macOS
- Ensure you have permission to access Keychain
- Solution: `security unlock-keychain` or grant Keychain access in System Preferences

## FAQ

**Q: Does my password ever leave my computer?**  
A: No. You log in in your browser (same as logging in to Gmail in Safari), and the app exchanges the authorization code for a token using PKCE. Your password is never given to or seen by this app.

**Q: Why Keychain?**  
A: Keychain is the macOS secure storage for passwords and tokens. It's encrypted at rest and integrated with Touch ID / password prompts.

**Q: Can I revoke access?**  
A: Yes. Go to [Google Account → Security → Connected Apps & Sites](https://myaccount.google.com/permissions) and revoke "Gmail Organizer Agent".

**Q: What happens if my computer is stolen?**  
A: Keychain is protected by your macOS password. The token is useless without your Mac's encryption key.

**Q: Will you ever request write/delete access?**  
A: Only in phase 2 (labels) and phase 3 (cleanup), and you'll see a new consent screen each time.

## License

MIT