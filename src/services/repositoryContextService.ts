// Repository Context Service for AI Integration
import { githubRepoService } from './githubRepoService';
import type { User } from 'firebase/auth';

export interface RepositoryContext {
  repository: {
    name: string;
    fullName: string;
    description: string;
    language: string;
  };
  structure: RepositoryFile[];
  readme?: string;
  packageJson?: any;
  recentFiles: RepositoryFile[];
}

export interface RepositoryFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  language?: string;
  content?: string;
  size?: number;
  lastModified?: string;
}

class RepositoryContextService {
  private contextCache = new Map<string, RepositoryContext>();
  private readonly MAX_FILE_SIZE = 100000; // 100KB limit per file
  private readonly MAX_FILES = 20; // Maximum files to include in context
  
  /**
   * Get repository context for AI operations
   */
  async getRepositoryContext(user: User, owner: string, repo: string): Promise<RepositoryContext | null> {
    const cacheKey = `${owner}/${repo}`;
    
    // Check cache first
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    try {
      // Get repository details
      const repository = await githubRepoService.getRepository(user, owner, repo);
      
      // Get repository structure
      const structure = await this.getRepositoryStructure(user, owner, repo);
      
      // Get README content
      const readme = await this.getReadmeContent(user, owner, repo);
      
      // Get package.json if it exists
      const packageJson = await this.getPackageJsonContent(user, owner, repo);
      
      // Get recent/important files
      const recentFiles = await this.getImportantFiles(user, owner, repo, structure);

      const context: RepositoryContext = {
        repository: {
          name: repository.name,
          fullName: repository.full_name,
          description: repository.description || '',
          language: repository.language || 'Unknown'
        },
        structure,
        readme,
        packageJson,
        recentFiles
      };

      // Cache the context
      this.contextCache.set(cacheKey, context);
      
      return context;
    } catch (error) {
      console.error('❌ Error getting repository context:', error);
      return null;
    }
  }

  /**
   * Get repository structure (directories and files)
   */
  private async getRepositoryStructure(user: User, owner: string, repo: string, path: string = ''): Promise<RepositoryFile[]> {
    try {
      const contents = await githubRepoService.getRepositoryContents(user, owner, repo, path);
      const structure: RepositoryFile[] = [];

      for (const item of contents) {
        const file: RepositoryFile = {
          path: item.path,
          name: item.name,
          type: item.type,
          size: item.size
        };

        // Add language detection for files
        if (item.type === 'file') {
          file.language = this.detectLanguage(item.name);
        }

        structure.push(file);

        // Recursively get subdirectories (limited depth)
        if (item.type === 'dir' && path.split('/').length < 3) {
          const subItems = await this.getRepositoryStructure(user, owner, repo, item.path);
          structure.push(...subItems);
        }
      }

      return structure;
    } catch (error) {
      console.warn(`Could not get repository structure for ${path}:`, error);
      return [];
    }
  }

  /**
   * Get README content
   */
  private async getReadmeContent(user: User, owner: string, repo: string): Promise<string | undefined> {
    try {
      const readmeFiles = ['README.md', 'README.txt', 'README.rst', 'readme.md', 'Readme.md'];
      
      for (const filename of readmeFiles) {
        try {
          const content = await githubRepoService.getFileContent(user, owner, repo, filename);
          return content.content;
        } catch (error) {
          // Try next README filename
          continue;
        }
      }
    } catch (error) {
      console.warn('Could not get README content:', error);
    }
    return undefined;
  }

  /**
   * Get package.json content
   */
  private async getPackageJsonContent(user: User, owner: string, repo: string): Promise<any | undefined> {
    try {
      const content = await githubRepoService.getFileContent(user, owner, repo, 'package.json');
      return JSON.parse(content.content);
    } catch (error) {
      // package.json doesn't exist or couldn't be parsed
      return undefined;
    }
  }

  /**
   * Get important files for context (limited by size and count)
   */
  private async getImportantFiles(user: User, owner: string, repo: string, structure: RepositoryFile[]): Promise<RepositoryFile[]> {
    const importantFiles: RepositoryFile[] = [];
    const priorityExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go'];
    const configFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', 'next.config.js', '.env.example', 'docker-compose.yml'];
    
    // Sort files by importance
    const sortedFiles = structure
      .filter(file => file.type === 'file' && (file.size || 0) < this.MAX_FILE_SIZE)
      .sort((a, b) => {
        // Prioritize config files
        if (configFiles.some(cf => a.name.includes(cf))) return -1;
        if (configFiles.some(cf => b.name.includes(cf))) return 1;
        
        // Prioritize important extensions
        const aHasPriority = priorityExtensions.some(ext => a.name.endsWith(ext));
        const bHasPriority = priorityExtensions.some(ext => b.name.endsWith(ext));
        
        if (aHasPriority && !bHasPriority) return -1;
        if (!aHasPriority && bHasPriority) return 1;
        
        // Sort by size (smaller first for better context)
        return (a.size || 0) - (b.size || 0);
      });

    // Get content for top files
    for (const file of sortedFiles.slice(0, this.MAX_FILES)) {
      if (githubRepoService.isFileTypeSupported(file.name)) {
        try {
          const content = await githubRepoService.getFileContent(user, owner, repo, file.path);
          importantFiles.push({
            ...file,
            content: content.content
          });
        } catch (error) {
          console.warn(`Could not get content for ${file.path}:`, error);
          // Add file without content
          importantFiles.push(file);
        }
      } else {
        // Add file info without content for unsupported types
        importantFiles.push(file);
      }
    }

    return importantFiles;
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript React',
      'jsx': 'JavaScript React',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'dart': 'Dart',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'md': 'Markdown',
      'json': 'JSON',
      'xml': 'XML',
      'yml': 'YAML',
      'yaml': 'YAML',
      'sh': 'Shell',
      'sql': 'SQL'
    };
    
    return languageMap[ext || ''] || 'Unknown';
  }

  /**
   * Search for specific files in repository
   */
  async searchFiles(user: User, owner: string, repo: string, searchTerm: string): Promise<RepositoryFile[]> {
    const context = await this.getRepositoryContext(user, owner, repo);
    if (!context) return [];

    const term = searchTerm.toLowerCase();
    return context.structure.filter(file => 
      file.name.toLowerCase().includes(term) ||
      file.path.toLowerCase().includes(term) ||
      file.language?.toLowerCase().includes(term)
    );
  }

  /**
   * Get specific file content with context
   */
  async getFileWithContext(user: User, owner: string, repo: string, filePath: string): Promise<RepositoryFile | null> {
    try {
      const content = await githubRepoService.getFileContent(user, owner, repo, filePath);
      const language = this.detectLanguage(content.name);
      
      return {
        path: filePath,
        name: content.name,
        type: 'file',
        language,
        content: content.content
      };
    } catch (error) {
      console.error('❌ Error getting file with context:', error);
      return null;
    }
  }

  /**
   * Clear context cache
   */
  clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * Format repository context for AI prompt
   */
  formatContextForAI(context: RepositoryContext): string {
    let formatted = `## Repository Context: ${context.repository.fullName}\n\n`;
    
    formatted += `**Description:** ${context.repository.description}\n`;
    formatted += `**Primary Language:** ${context.repository.language}\n\n`;

    if (context.readme) {
      formatted += `### README\n\`\`\`markdown\n${context.readme.substring(0, 1000)}\n\`\`\`\n\n`;
    }

    if (context.packageJson) {
      formatted += `### Package.json\n\`\`\`json\n${JSON.stringify(context.packageJson, null, 2).substring(0, 500)}\n\`\`\`\n\n`;
    }

    formatted += `### Repository Structure\n`;
    context.structure.slice(0, 20).forEach(file => {
      formatted += `- ${file.path} (${file.language || file.type})\n`;
    });

    formatted += `\n### Key Files Content\n`;
    context.recentFiles.slice(0, 5).forEach(file => {
      if (file.content) {
        formatted += `\n#### ${file.path}\n\`\`\`${file.language?.toLowerCase() || 'text'}\n${file.content.substring(0, 800)}\n\`\`\`\n`;
      }
    });

    return formatted;
  }
}

export const repositoryContextService = new RepositoryContextService();