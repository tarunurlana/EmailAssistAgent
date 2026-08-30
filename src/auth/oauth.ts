import { readFileSync, writeFileSync, existsSync } from 'fs';
import { google } from 'googleapis';
import { CONFIG } from '../config';
import keytar from 'keytar';
import { createServer } from 'http';
import { parse } from 'url';
import crypto from 'crypto';
import { SCOPES } from './scopes';

export interface OAuth2TokenPayload {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export class GoogleOAuth {
  private clientId: string;
  private clientSecret: string;
  private oauth2Client: any;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      CONFIG.redirectUrl
    );
  }

  getAuthUrl(codeVerifier: string): string {
    const challenge = generateCodeChallenge(codeVerifier);
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [SCOPES.readonly],
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'consent',
    });
  }

  async exchangeCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<OAuth2TokenPayload> {
    const { tokens } = await this.oauth2Client.getToken({
      code,
      code_verifier: codeVerifier,
    });
    return tokens as OAuth2TokenPayload;
  }

  async getOrRefreshAccessToken(): Promise<string> {
    const storedToken = await keytar.getPassword(
      CONFIG.appName,
      CONFIG.tokenKeychainKey
    );
    if (!storedToken) {
      throw new Error('No stored token found. Please login first.');
    }

    const tokenPayload = JSON.parse(storedToken) as OAuth2TokenPayload;
    this.oauth2Client.setCredentials(tokenPayload);

    if (tokenPayload.refresh_token) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        const newPayload: OAuth2TokenPayload = {
          access_token: credentials.access_token!,
          refresh_token: credentials.refresh_token || tokenPayload.refresh_token,
          expires_in: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : undefined,
        };
        await keytar.setPassword(
          CONFIG.appName,
          CONFIG.tokenKeychainKey,
          JSON.stringify(newPayload)
        );
        return newPayload.access_token;
      } catch (err) {
        await this.clearToken();
        throw new Error(`Token refresh failed: ${err}`);
      }
    }

    return tokenPayload.access_token;
  }

  async storeToken(token: OAuth2TokenPayload): Promise<void> {
    await keytar.setPassword(
      CONFIG.appName,
      CONFIG.tokenKeychainKey,
      JSON.stringify(token)
    );
  }

  async clearToken(): Promise<void> {
    await keytar.deletePassword(CONFIG.appName, CONFIG.tokenKeychainKey);
  }

  async login(): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const authUrl = this.getAuthUrl(codeVerifier);

    console.log(`Authorize this app by visiting: ${authUrl}`);

    const token = await new Promise<OAuth2TokenPayload>((resolve, reject) => {
      const server = createServer((req, res) => {
        const { query } = parse(req.url || '', true);
        const code = query.code as string;

        if (code) {
          res.end('Authorization successful! You can close this window.');
          server.close();
          this.exchangeCodeForToken(code, codeVerifier)
            .then(resolve)
            .catch(reject);
        } else {
          res.end('Authorization failed: no code received');
          server.close();
          reject(new Error('No authorization code received'));
        }
      });

      server.listen(CONFIG.port, () => {
        console.log(`Waiting for authorization at ${CONFIG.redirectUrl}`);
      });

      setTimeout(() => {
        server.close();
        reject(new Error('Authorization timeout'));
      }, 10 * 60 * 1000);
    });

    await this.storeToken(token);
    console.log('Authorization successful! Token stored in Keychain.');
  }

  async logout(): Promise<void> {
    await this.clearToken();
    console.log('Logged out. Token removed from Keychain.');
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await keytar.getPassword(
      CONFIG.appName,
      CONFIG.tokenKeychainKey
    );
    return !!token;
  }
}

export function loadCredentials(): { client_id: string; client_secret: string } {
  try {
    const content = readFileSync(CONFIG.credentialsPath, 'utf-8');
    return JSON.parse(content).installed;
  } catch {
    throw new Error(
      `Could not load credentials from ${CONFIG.credentialsPath}. 
Please create a Google OAuth 2.0 Desktop app and save credentials there.`
    );
  }
}
