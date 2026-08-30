#!/usr/bin/env node

import { GoogleOAuth, loadCredentials } from './auth/oauth.js';
import { GmailClient } from './gmail/client.js';
import { Classifier, summarizeClassification } from './classify/classifier.js';

async function main() {
  const command = process.argv[2];

  try {
    // Load credentials.json and create OAuth instance
    const creds = loadCredentials();
    const oauth = new GoogleOAuth(creds.client_id, creds.client_secret);

    switch (command) {
      case 'login': {
        console.log('Starting OAuth login flow...');
        await oauth.login();
        console.log('✓ Successfully logged in and token stored in Keychain');
        break;
      }

      case 'logout': {
        await oauth.logout();
        console.log('✓ Successfully logged out');
        break;
      }

      case 'status': {
        const authenticated = await oauth.isLoggedIn();
        console.log(
          authenticated
            ? '✓ Authenticated and ready to use'
            : '✗ Not authenticated. Run "npm run login" first.'
        );
        break;
      }

      case 'classify': {
        const authenticated = await oauth.isLoggedIn();
        if (!authenticated) {
          console.error('✗ Not authenticated. Run "npm run login" first.');
          process.exit(1);
        }

        const token = await oauth.getOrRefreshAccessToken();
        if (!token) {
          console.error('✗ Failed to get access token');
          process.exit(1);
        }

        const gmail = new GmailClient(token);
        const classifier = new Classifier();

        console.log('Searching inbox...');
        const messageIds = await gmail.search('in:inbox newer_than:7d');
        console.log(`Found ${messageIds.length} messages in past 7 days`);

        const limit = 20;
        const sample = messageIds.slice(0, limit);
        console.log(`Classifying first ${sample.length} messages...`);

        const messages = await Promise.all(
          sample.map((id) => gmail.getMessageMetadata(id))
        );
        const classified = classifier.classifyBatch(messages);
        const summary = summarizeClassification(classified);

        console.log('\n📊 Classification Summary:');
        console.log(JSON.stringify(summary, null, 2));

        console.log('\n📧 Sample classifications:');
        for (const id of sample.slice(0, 5)) {
          const msg = messages.find((m) => m.id === id)!;
          const cat = classified.get(id)!;
          console.log(`  [${cat}] ${msg.subject.substring(0, 50)}`);
        }

        break;
      }

      case 'help':
      default:
        console.log(`
Gmail Organizer Agent - CLI

Commands:
  login     Authenticate with Google (stores token in Keychain)
  logout    Remove stored authentication
  status    Check authentication status
  classify  Classify emails in inbox (demo)
  help      Show this help message

Usage:
  npm run login
  npm run classify
  npm run dev   (starts MCP server)
        `);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
