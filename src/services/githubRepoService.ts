// GitHub Repository Service for accessing user repositories
import { githubOAuthService } from './githubOAuthService';
import type { User } from 'firebase/auth';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  encoding?: string;
  sha: string;
  html_url: string;
  download_url?: string;
}

class GitHubRepoService {
  /**
   * Get user's repositories
   */
  async getUserRepositories(user: User): Promise<GitHubRepository[]> {
    const token = await githubOAuthService.getUserGitHubToken(user);
    if (!token) {
      throw new Error('GitHub token not found. Please connect your GitHub account first.');
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/github/user/repos`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    const repos = await response.json();
    return repos;
  }

  /**
   * Get repository contents
   */
  async getRepositoryContents(
    user: User, 
    owner: string, 
    repo: string, 
    path: string = ''
  ): Promise<GitHubContent[]> {
    const token = await githubOAuthService.getUserGitHubToken(user);
    if (!token) {
      throw new Error('GitHub token not found. Please connect your GitHub account first.');
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/github/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository contents: ${response.statusText}`);
    }

    const contents = await response.json();
    
    // Handle single file response
    if (!Array.isArray(contents)) {
      return [contents];
    }
    
    return contents;
  }

  /**
   * Get file content
   */
  async getFileContent(
    user: User, 
    owner: string, 
    repo: string, 
    path: string
  ): Promise<{ content: string; encoding: string; name: string }> {
    const contents = await this.getRepositoryContents(user, owner, repo, path);
    const file = contents[0];
    
    if (file.type !== 'file' || !file.content) {
      throw new Error('Not a file or content not available');
    }

    // Decode base64 content
    let decodedContent = file.content;
    if (file.encoding === 'base64') {
      decodedContent = atob(file.content.replace(/\n/g, ''));
    }

    return {
      content: decodedContent,
      encoding: file.encoding || 'utf-8',
      name: file.name
    };
  }

  /**
   * Search repositories by name
   */
  async searchRepositories(user: User, searchTerm: string): Promise<GitHubRepository[]> {
    const repos = await this.getUserRepositories(user);
    
    if (!searchTerm.trim()) {
      return repos;
    }

    const term = searchTerm.toLowerCase();
    return repos.filter(repo => 
      repo.name.toLowerCase().includes(term) ||
      repo.description?.toLowerCase().includes(term) ||
      repo.full_name.toLowerCase().includes(term)
    );
  }

  /**
   * Get repository details
   */
  async getRepository(user: User, owner: string, repo: string): Promise<GitHubRepository> {
    const token = await githubOAuthService.getUserGitHubToken(user);
    if (!token) {
      throw new Error('GitHub token not found. Please connect your GitHub account first.');
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Dotivra-App'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if user has access to repository
   */
  async hasRepositoryAccess(user: User, owner: string, repo: string): Promise<boolean> {
    try {
      await this.getRepository(user, owner, repo);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported file types for import
   */
  getSupportedFileTypes(): string[] {
    return [
      '.md', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.html', '.css', '.scss', '.less', '.xml', '.yml', '.yaml',
      '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.rb',
      '.go', '.rs', '.swift', '.kt', '.dart', '.sql', '.sh',
      '.dockerfile', '.gitignore', '.env', '.config', '.ini',
      'README', 'LICENSE', 'CHANGELOG', 'CONTRIBUTING'
    ];
  }

  /**
   * Check if file type is supported for import
   */
  isFileTypeSupported(filename: string): boolean {
    const supportedTypes = this.getSupportedFileTypes();
    const lowerFilename = filename.toLowerCase();
    
    return supportedTypes.some(type => 
      lowerFilename.endsWith(type.toLowerCase()) || 
      lowerFilename === type.toLowerCase()
    );
  }

  /**
   * Filter files by supported types
   */
  filterSupportedFiles(contents: GitHubContent[]): GitHubContent[] {
    return contents.filter(item => 
      item.type === 'dir' || this.isFileTypeSupported(item.name)
    );
  }
}

export const githubRepoService = new GitHubRepoService();