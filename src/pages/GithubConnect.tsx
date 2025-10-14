import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Github, 
  ExternalLink, 
  FileText, 
  Folder, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Copy,
  Download,
  Search,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { githubOAuthService } from '../services/githubOAuthService';
import { githubRepoService } from '../services/githubRepoService';
import type { GitHubUser } from '../services/githubOAuthService';
import type { GitHubRepository, GitHubContent } from '../services/githubRepoService';

export default function GithubConnect() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [repoContents, setRepoContents] = useState<GitHubContent[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ content: string; name: string; path: string } | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
    handleOAuthCallback();
  }, [user]);

  // Filter repositories based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRepos(repositories);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredRepos(repositories.filter(repo => 
        repo.name.toLowerCase().includes(term) ||
        repo.description?.toLowerCase().includes(term) ||
        repo.language?.toLowerCase().includes(term)
      ));
    }
  }, [repositories, searchTerm]);

  const checkConnectionStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const info = await githubOAuthService.getUserGitHubInfo(user);
      if (info?.connected && info.user) {
        setIsConnected(true);
        setGithubUser(info.user);
        await loadRepositories();
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
      setError('Failed to check GitHub connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async () => {
    if (!user) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      setConnecting(true);
      try {
        // Exchange code for token
        const token = await githubOAuthService.exchangeCodeForToken(code, state);
        
        // Get GitHub user info
        const githubUserInfo = await githubOAuthService.getGitHubUser(token.access_token);
        
        // Store token and user info
        await githubOAuthService.storeUserGitHubToken(user, token, githubUserInfo);
        
        // Update UI state
        setIsConnected(true);
        setGithubUser(githubUserInfo);
        await loadRepositories();
        
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Error during OAuth callback:', error);
        setError(error instanceof Error ? error.message : 'Failed to connect GitHub account');
      } finally {
        setConnecting(false);
      }
    }
  };

  const handleConnectGitHub = () => {
    setConnecting(true);
    setError(null);
    
    try {
      const authUrl = githubOAuthService.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating GitHub OAuth:', error);
      setError('Failed to initiate GitHub connection');
      setConnecting(false);
    }
  };

  const loadRepositories = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const repos = await githubRepoService.getUserRepositories(user);
      setRepositories(repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      setError('Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = async (repo: GitHubRepository) => {
    setSelectedRepo(repo);
    setRepoContents([]);
    setSelectedFile(null);
    setCurrentPath('');
    setPathHistory([]);
    await loadRepoContents(repo, '');
  };

  const loadRepoContents = async (repo: GitHubRepository, path: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const contents = await githubRepoService.getRepositoryContents(
        user, 
        repo.owner.login, 
        repo.name, 
        path
      );
      
      // Filter to show only supported files
      const filteredContents = githubRepoService.filterSupportedFiles(contents);
      setRepoContents(filteredContents);
      setCurrentPath(path);
    } catch (error) {
      console.error('Error loading repository contents:', error);
      setError('Failed to load repository contents');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = async (item: GitHubContent) => {
    if (!selectedRepo || !user) return;

    if (item.type === 'dir') {
      setPathHistory([...pathHistory, currentPath]);
      await loadRepoContents(selectedRepo, item.path);
    } else {
      setLoading(true);
      try {
        const fileContent = await githubRepoService.getFileContent(
          user,
          selectedRepo.owner.login,
          selectedRepo.name,
          item.path
        );
        setSelectedFile({
          content: fileContent.content,
          name: fileContent.name,
          path: item.path
        });
      } catch (error) {
        console.error('Error loading file content:', error);
        setError('Failed to load file content');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoBack = async () => {
    if (!selectedRepo || pathHistory.length === 0) return;
    
    const previousPath = pathHistory[pathHistory.length - 1];
    setPathHistory(pathHistory.slice(0, -1));
    await loadRepoContents(selectedRepo, previousPath);
  };

  const handleCopyContent = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(selectedFile.content);
      // Could show a toast notification here
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size) return 'Unknown size';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading && !isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Checking GitHub connection...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            GitHub Integration
          </h1>
          <p className="text-lg text-gray-600">
            Connect your GitHub account to import files and browse repositories
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {!isConnected ? (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <Github className="h-12 w-12 mx-auto mb-4 text-gray-700" />
                <CardTitle>Connect to GitHub</CardTitle>
                <CardDescription>
                  Authorize Dotivra to access your GitHub repositories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleConnectGitHub}
                  disabled={connecting}
                  className="w-full"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Github className="h-4 w-4 mr-2" />
                      Connect GitHub Account
                    </>
                  )}
                </Button>

                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-medium">What you can do after connecting:</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Browse your public and private repositories</li>
                    <li>• Import files directly into your documents</li>
                    <li>• Access repository contents and metadata</li>
                    <li>• Secure, OAuth-based authentication</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <h3 className="font-medium text-green-900">Connected to GitHub</h3>
                  <p className="text-sm text-green-700">
                    {githubUser?.name || githubUser?.login} (@{githubUser?.login})
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {repositories.length} repositories
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Repository List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Github className="h-5 w-5" />
                      Your Repositories
                    </CardTitle>
                    <CardDescription>
                      Browse and select repositories to explore
                    </CardDescription>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search repositories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading && repositories.length === 0 ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredRepos.map((repo) => (
                          <div
                            key={repo.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedRepo?.id === repo.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleSelectRepo(repo)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                  {repo.name}
                                </h3>
                                {repo.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {repo.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {repo.language && (
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      {repo.language}
                                    </span>
                                  )}
                                  {repo.private && (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                      Private
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ExternalLink
                                className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(repo.html_url, '_blank');
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        {filteredRepos.length === 0 && searchTerm && (
                          <div className="text-center py-4 text-gray-500">
                            <p>No repositories found matching "{searchTerm}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Repository Contents */}
              {selectedRepo && (
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5" />
                        {selectedRepo.name}
                      </CardTitle>
                      <CardDescription>
                        {currentPath ? `/${currentPath}` : '/ (root)'}
                      </CardDescription>
                      {pathHistory.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGoBack}
                          className="flex items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-96 overflow-y-auto">
                          {repoContents.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleSelectItem(item)}
                            >
                              {item.type === 'dir' ? (
                                <Folder className="h-4 w-4 text-blue-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-gray-500" />
                              )}
                              <span className="text-sm text-gray-700 truncate flex-1">
                                {item.name}
                              </span>
                              {item.type === 'file' && item.size && (
                                <span className="text-xs text-gray-400">
                                  {formatFileSize(item.size)}
                                </span>
                              )}
                            </div>
                          ))}
                          {repoContents.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                              <p>No supported files found in this directory</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* File Preview */}
              {selectedFile && (
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {selectedFile.name}
                      </CardTitle>
                      <CardDescription>
                        {selectedFile.path}
                      </CardDescription>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyContent}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const blob = new Blob([selectedFile.content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = selectedFile.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedFile.content}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}