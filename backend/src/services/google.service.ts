import { config } from '../config';

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

/**
 * Exchanges Google OAuth Authorization Code for User Info
 */
export async function exchangeCodeForGoogleUser(code: string, redirectUri: string): Promise<GoogleUserInfo> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';

  if (!config.google.clientId || !config.google.clientSecret) {
    console.error('[OAuth Config Error] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable is missing on backend server.');
    throw new Error('GOOGLE_CREDENTIALS_MISSING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured on server');
  }

  const params = new URLSearchParams({
    code,
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const errorData = await tokenRes.text();
    console.error('[Google OAuth Error] Token exchange error details:', errorData);
    throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED: ${errorData}`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string; id_token?: string };
  if (!tokens.access_token) {
    throw new Error('GOOGLE_AUTH_FAILED: No access token returned');
  }

  // Fetch User Info using Access Token
  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userinfoRes.ok) {
    throw new Error('GOOGLE_USERINFO_FAILED');
  }

  const userInfo = (await userinfoRes.json()) as GoogleUserInfo;
  if (!userInfo.email || !userInfo.email_verified) {
    throw new Error('GOOGLE_EMAIL_NOT_VERIFIED');
  }

  return userInfo;
}
