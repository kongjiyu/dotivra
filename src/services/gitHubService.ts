// src/services/gitHubService.ts
import { authService } from './authService';
import { auth } from '../config/firebase';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
  public_repos: number;
  followers: number;
  following: number;
}

class GitHubService {
  private baseURL = 'https://api.github.com';

  // Get GitHub access token for current user
  private async getAccessToken(): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    return await authService.getGitHubAccessToken(currentUser.uid);
  }

  // Make authenticated GitHub API request
  private async githubFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('GitHub access token not found. Please sign in with GitHub.');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Get current authenticated GitHub user
  async getCurrentUser(): Promise<GitHubUser> {
    return await this.githubFetch('/user');
  }

  // Get user repositories (both public and private)
  async getUserRepositories(username?: string, options: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    const {
      type = 'owner',
      sort = 'updated',
      direction = 'desc',
      per_page = 30,
      page = 1
    } = options;

    const endpoint = username 
      ? `/users/${username}/repos`
      : '/user/repos';

    const params = new URLSearchParams({
      type,
      sort,
      direction,
      per_page: per_page.toString(),
      page: page.toString()
    });

    return await this.githubFetch(`${endpoint}?${params}`);
  }

  // Get repository details
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return await this.githubFetch(`/repos/${owner}/${repo}`);
  }

  // Get repository contents
  async getRepositoryContents(
    owner: string, 
    repo: string, 
    path: string = '',
    ref?: string
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (ref) params.append('ref', ref);
    
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    return await this.githubFetch(`${endpoint}?${params}`);
  }

  // Get file contents
  async getFileContent(
    owner: string, 
    repo: string, 
    path: string,
    ref?: string
  ): Promise<{
    content: string;
    encoding: string;
    size: number;
    sha: string;
  }> {
    const params = new URLSearchParams();
    if (ref) params.append('ref', ref);
    
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    const response = await this.githubFetch(`${endpoint}?${params}`);
    
    // Decode base64 content
    if (response.encoding === 'base64') {
      response.decodedContent = atob(response.content.replace(/\s/g, ''));
    }
    
    return response;
  }

  // Search repositories
  async searchRepositories(query: string, options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'desc' | 'asc';
    per_page?: number;
    page?: number;
  } = {}): Promise<{
    total_count: number;
    items: GitHubRepository[];
  }> {
    const {
      sort = 'updated',
      order = 'desc',
      per_page = 30,
      page = 1
    } = options;

    const params = new URLSearchParams({
      q: query,
      sort,
      order,
      per_page: per_page.toString(),
      page: page.toString()
    });

    return await this.githubFetch(`/search/repositories?${params}`);
  }

  // Get repository languages
  async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    return await this.githubFetch(`/repos/${owner}/${repo}/languages`);
  }

  // Get repository README
  async getRepositoryReadme(owner: string, repo: string): Promise<{
    content: string;
    decodedContent: string;
    name: string;
    path: string;
  }> {
    const response = await this.githubFetch(`/repos/${owner}/${repo}/readme`);
    
    if (response.encoding === 'base64') {
      response.decodedContent = atob(response.content.replace(/\s/g, ''));
    }
    
    return response;
  }

  // Check if user has GitHub access
  async hasGitHubAccess(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Validate GitHub connection
  async validateConnection(): Promise<{
    valid: boolean;
    user?: GitHubUser;
    error?: string;
  }> {
    try {
      const user = await this.getCurrentUser();
      return { valid: true, user };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default GitHubService;
export type { GitHubRepository, GitHubUser };