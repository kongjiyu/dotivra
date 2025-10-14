// GitHub OAuth Service for user-specific authentication
import { auth, db } from '@/config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

interface GitHubToken {
  access_token: string;
  token_type: string;
  scope: string;
  created_at: number;
  expires_at?: number;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  public_repos: number;
  private_repos?: number; // Optional since some GitHub API responses don't include this
}

class GitHubOAuthService {
  private readonly CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
  private readonly REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/profile?github_callback=true`;
  private readonly SCOPE = 'repo,user:email,read:user';

  /**
   * Generate GitHub OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    const state = this.generateState();
    sessionStorage.setItem('github_oauth_state', state);
    
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      scope: this.SCOPE,
      state: state,
      allow_signup: 'true'
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<GitHubToken> {
    // Verify state parameter
    const storedState = sessionStorage.getItem('github_oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter. Possible CSRF attack.');
    }
    sessionStorage.removeItem('github_oauth_state');

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/github/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getFirebaseToken()}`
      },
      body: JSON.stringify({
        code,
        client_id: this.CLIENT_ID,
        redirect_uri: this.REDIRECT_URI
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await response.json();
    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'bearer',
      scope: tokenData.scope || this.SCOPE,
      created_at: Date.now(),
      ...(tokenData.expires_at && { expires_at: tokenData.expires_at })
    };
  }

  /**
   * Get GitHub user information using access token
   */
  async getGitHubUser(token: string): Promise<GitHubUser> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user information');
    }

    return await response.json();
  }

  /**
   * Store encrypted GitHub token for user
   */
  async storeUserGitHubToken(user: User, token: GitHubToken, githubUser: GitHubUser): Promise<void> {
    const userRef = doc(db, 'Users', user.uid);
    
    // Store encrypted token and user info
    await setDoc(userRef, {
      github: {
        connected: true,
        user: {
          id: githubUser.id,
          login: githubUser.login,
          name: githubUser.name || '',
          email: githubUser.email || '',
          avatar_url: githubUser.avatar_url,
          public_repos: githubUser.public_repos,
          private_repos: githubUser.private_repos || 0
        },
        token: {
          // In production, encrypt this token
          access_token: token.access_token,
          token_type: token.token_type,
          scope: token.scope,
          created_at: token.created_at,
          ...(token.expires_at && { expires_at: token.expires_at })
        },
        connected_at: new Date().toISOString(),
        last_used: new Date().toISOString()
      }
    }, { merge: true });
  }

  /**
   * Get user's GitHub token from Firestore
   */
  async getUserGitHubToken(user: User): Promise<GitHubToken | null> {
    const userRef = doc(db, 'Users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data()?.github?.connected) {
      return null;
    }

    const githubData = userDoc.data().github;
    return githubData.token;
  }

  /**
   * Get user's GitHub information
   */
  async getUserGitHubInfo(user: User): Promise<{ connected: boolean; user?: GitHubUser; connected_at?: string } | null> {
    const userRef = doc(db, 'Users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data()?.github) {
      return { connected: false };
    }

    const githubData = userDoc.data().github;
    return {
      connected: githubData.connected || false,
      user: githubData.user,
      connected_at: githubData.connected_at
    };
  }

  /**
   * Disconnect user's GitHub account
   */
  async disconnectGitHub(user: User): Promise<void> {
    const userRef = doc(db, 'Users', user.uid);
    await setDoc(userRef, {
      github: {
        connected: false,
        disconnected_at: new Date().toISOString()
      }
    }, { merge: true });
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(user: User): Promise<void> {
    const userRef = doc(db, 'Users', user.uid);
    await setDoc(userRef, {
      github: {
        last_used: new Date().toISOString()
      }
    }, { merge: true });
  }

  /**
   * Validate if user has valid GitHub connection
   */
  async hasValidGitHubConnection(user: User): Promise<boolean> {
    const token = await this.getUserGitHubToken(user);
    if (!token) return false;

    // TODO: Add token expiration check if GitHub starts using expiring tokens
    // For now, GitHub personal access tokens don't expire unless revoked
    return true;
  }

  /**
   * Generate secure random state for OAuth
   */
  private generateState(): string {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, dec => dec.toString(16).padStart(8, '0')).join('');
  }

  /**
   * Get Firebase authentication token
   */
  private async getFirebaseToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Test GitHub API connection with user's token
   */
  async testConnection(user: User): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      const token = await this.getUserGitHubToken(user);
      if (!token) {
        return { success: false, error: 'No GitHub token found' };
      }

      const githubUser = await this.getGitHubUser(token.access_token);
      await this.updateLastUsed(user);
      
      return { success: true, user: githubUser };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const githubOAuthService = new GitHubOAuthService();
export type { GitHubToken, GitHubUser };