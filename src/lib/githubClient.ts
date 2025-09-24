import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Repository {
  id: number;
  full_name: string;
  name: string;
  owner: string;
  default_branch: string;
  private: boolean;
  description: string | null;
  html_url: string;
  installation_id: number;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  sha: string;
  encoding?: string;
  truncated: boolean;
  cached?: boolean;
  installation_id?: number;
  last_updated?: string;
  fetched_at?: string;
}

export interface TreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url?: string;
}

export interface Installation {
  id: number;
  repo_count: number;
  created_at: Date;
}

class GitHubClient {
  private getAuthHeaders() {
    // Get Firebase auth token
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user?.accessToken;
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getInstallUrl(): Promise<{ install_url: string; state: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/github/install-url`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error getting install URL:', error);
      throw new Error('Failed to get GitHub App install URL');
    }
  }

  async getRepositories(): Promise<{
    repositories: Repository[];
    installations: Installation[];
    total: number;
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/github/repos`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new Error('Failed to fetch repositories');
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<FileContent> {
    try {
      const params = new URLSearchParams({
        owner,
        repo,
        path,
      });

      if (ref) {
        params.append('ref', ref);
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/github/file?${params.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error fetching file content:', error);
      if (error.response?.status === 404) {
        throw new Error('File not found');
      }
      throw new Error('Failed to fetch file content');
    }
  }

  async getRepositoryTree(
    owner: string,
    repo: string,
    ref: string = 'HEAD',
    recursive: boolean = false
  ): Promise<{
    tree: TreeItem[];
    total: number;
    filtered: number;
    installation_id: number;
    fetched_at: string;
  }> {
    try {
      const params = new URLSearchParams({
        owner,
        repo,
        ref,
        recursive: recursive.toString(),
      });

      const response = await axios.get(
        `${API_BASE_URL}/api/github/tree?${params.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching repository tree:', error);
      throw new Error('Failed to fetch repository tree');
    }
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    totalSizeFormatted: string;
    oldestEntry: string | null;
    newestEntry: string | null;
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/github/cache/stats`, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      throw new Error('Failed to fetch cache statistics');
    }
  }

  async cleanupCache(): Promise<{ message: string; remaining_entries: number }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/github/cache/cleanup`, {}, {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error cleaning cache:', error);
      throw new Error('Failed to cleanup cache');
    }
  }

  // Helper method to get common file shortcuts for a repository
  getCommonFileShortcuts() {
    return [
      { name: 'README.md', path: 'README.md' },
      { name: 'package.json', path: 'package.json' },
      { name: 'pyproject.toml', path: 'pyproject.toml' },
      { name: 'composer.json', path: 'composer.json' },
      { name: 'Dockerfile', path: 'Dockerfile' },
      { name: 'Makefile', path: 'Makefile' },
      { name: '.env.example', path: '.env.example' },
      { name: 'tsconfig.json', path: 'tsconfig.json' },
      { name: 'cargo.toml', path: 'Cargo.toml' },
      { name: 'go.mod', path: 'go.mod' },
    ];
  }

  // Helper to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper to detect file type from path
  getFileType(path: string): 'markdown' | 'json' | 'yaml' | 'dockerfile' | 'text' | 'config' {
    const lowercasePath = path.toLowerCase();
    
    if (lowercasePath.endsWith('.md') || lowercasePath.endsWith('.markdown')) {
      return 'markdown';
    }
    
    if (lowercasePath.endsWith('.json')) {
      return 'json';
    }
    
    if (lowercasePath.endsWith('.yml') || lowercasePath.endsWith('.yaml')) {
      return 'yaml';
    }
    
    if (lowercasePath.includes('dockerfile') || lowercasePath === 'dockerfile') {
      return 'dockerfile';
    }
    
    if (
      lowercasePath.endsWith('.toml') ||
      lowercasePath.endsWith('.ini') ||
      lowercasePath.endsWith('.conf') ||
      lowercasePath.endsWith('.config')
    ) {
      return 'config';
    }
    
    return 'text';
  }
}

// Singleton instance
export const githubClient = new GitHubClient();