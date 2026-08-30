import os from 'os';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

export const CONFIG = {
  appName: 'gmail-organizer-agent',
  configDir: path.join(os.homedir(), '.gmail-organizer'),
  credentialsPath: path.join(os.homedir(), '.gmail-organizer', 'credentials.json'),
  tokenKeychainKey: 'gmail-organizer-agent-token',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  redirectUrl: 'http://localhost:3000/callback',
  port: 3000,
};

export function getConfigDir(): string {
  const dir = CONFIG.configDir;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
