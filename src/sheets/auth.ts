declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }): TokenClient;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken(): void;
}

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_KEY = 'gis_access_token';
const EXPIRY_KEY = 'gis_token_expiry';

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Restore token from sessionStorage on module load
const storedToken = sessionStorage.getItem(TOKEN_KEY);
const storedExpiry = Number(sessionStorage.getItem(EXPIRY_KEY));
if (storedToken && storedExpiry && Date.now() < storedExpiry) {
  accessToken = storedToken;
  tokenExpiry = storedExpiry;
}

export function isGisLoaded(): boolean {
  return !!window.google?.accounts?.oauth2;
}

export function getAccessToken(): string | null {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }
  return null;
}

function waitForGis(timeoutMs: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isGisLoaded()) { resolve(); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      if (isGisLoaded()) { clearInterval(interval); resolve(); }
      else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Google Identity Services failed to load. Please refresh the page.'));
      }
    }, 100);
  });
}

export async function connect(clientId: string): Promise<string> {
  const existing = getAccessToken();
  if (existing) return existing;

  await waitForGis();

  return new Promise((resolve, reject) => {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response: TokenResponse) => {
        if (response.error) {
          reject(new Error(`OAuth error: ${response.error}`));
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + response.expires_in * 1000 - 60000; // 1min buffer
        sessionStorage.setItem(TOKEN_KEY, accessToken);
        sessionStorage.setItem(EXPIRY_KEY, String(tokenExpiry));
        resolve(response.access_token);
      },
    });

    tokenClient.requestAccessToken();
  });
}

export function refreshToken(clientId: string): Promise<string> {
  return connect(clientId);
}

export function disconnect(): void {
  accessToken = null;
  tokenExpiry = 0;
  tokenClient = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
}

export function notifyAuthInvalidated(): void {
  accessToken = null;
  tokenExpiry = 0;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
}
