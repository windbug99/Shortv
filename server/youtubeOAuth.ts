import fetch from 'node-fetch';

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

class YouTubeOAuthManager {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  
  private readonly clientId = process.env.YOUTUBE_CLIENT_ID;
  private readonly clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  private readonly refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  constructor() {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      console.warn('YouTube OAuth credentials not fully configured');
    }
  }

  async getAccessToken(): Promise<string> {
    // Check if current token is still valid (with 5 minute buffer)
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now + 5 * 60 * 1000) {
      return this.accessToken;
    }

    // Refresh the access token
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId!,
          client_secret: this.clientSecret!,
          refresh_token: this.refreshToken!,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const data = await response.json() as OAuthTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in * 1000);
      
      console.log('YouTube OAuth token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to refresh YouTube OAuth token:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.refreshToken);
  }
}

export const youtubeOAuth = new YouTubeOAuthManager();