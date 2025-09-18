import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Github, ExternalLink, FileText, Folder, Loader2, Settings } from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  language: string;
  updated_at: string;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
}

interface FileContent {
  name: string;
  path: string;
  content: string;
  size: number;
}

const API_BASE = 'http://localhost:3001/api';

export default function GithubConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [installUrl, setInstallUrl] = useState('');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [repoContents, setRepoContents] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [installationId, setInstallationId] = useState('');
  const [manualIdInput, setManualIdInput] = useState('');
  const [installations, setInstallations] = useState<any[]>([]);

  // Check for installation_id in URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instId = urlParams.get('installation_id');
    const connected = urlParams.get('connected');
    const callback = urlParams.get('callback');
    const error = urlParams.get('error');
    
    if (instId && connected === 'true') {
      setInstallationId(instId);
      setIsConnected(true);
      fetchRepositories(instId);
      
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      console.error('GitHub connection error:', error);
    } else if (callback === 'true') {
      console.log('User returned from GitHub without completing installation');
    } else {
      // Check for existing installations
      fetchInstallations();
    }
    
    // Always fetch install URL for initial connection
    fetchInstallUrl();
  }, []);

  const fetchInstallations = async () => {
    try {
      const response = await fetch(`${API_BASE}/github/installations`);
      const data = await response.json();
      setInstallations(data.installations || []);
      
      // If we have installations, automatically connect with the first one
      if (data.installations && data.installations.length > 0) {
        const firstInstallation = data.installations[0];
        setInstallationId(firstInstallation.id.toString());
        setIsConnected(true);
        fetchRepositories(firstInstallation.id.toString());
      }
    } catch (error) {
      console.error('Error fetching installations:', error);
    }
  };

  const fetchInstallUrl = async () => {
    try {
      const response = await fetch(`${API_BASE}/github/install-url`);
      const data = await response.json();
      setInstallUrl(data.install_url);
    } catch (error) {
      console.error('Error fetching install URL:', error);
    }
  };

  const fetchRepositories = async (instId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/github/repositories?installation_id=${instId}`);
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRepoContents = async (repo: Repository, path = '') => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/github/repository/${repo.full_name.split('/')[0]}/${repo.full_name.split('/')[1]}/contents?path=${path}&installation_id=${installationId}`
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setRepoContents(data);
      } else {
        setRepoContents([data]);
      }
    } catch (error) {
      console.error('Error fetching repository contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (repo: Repository, filePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/github/repository/${repo.full_name.split('/')[0]}/${repo.full_name.split('/')[1]}/file?path=${filePath}&installation_id=${installationId}`
      );
      const data = await response.json();
      setSelectedFile(data);
    } catch (error) {
      console.error('Error fetching file content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGitHub = () => {
    if (installUrl) {
      window.open(installUrl, '_blank');
      // Show message to user about refreshing after installation
      setTimeout(() => {
        alert('After installing the GitHub App, please refresh this page to see your repositories.');
      }, 1000);
    }
  };

  const handleManualConnect = () => {
    if (manualIdInput.trim()) {
      setInstallationId(manualIdInput.trim());
      setIsConnected(true);
      fetchRepositories(manualIdInput.trim());
      setManualIdInput('');
    }
  };

  const handleManageRepoAccess = () => {
    // Direct user to GitHub's installation settings where they can modify repository access
    const manageUrl = `https://github.com/settings/installations/${installationId}`;
    window.open(manageUrl, '_blank');
  };

  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
    setRepoContents([]);
    setSelectedFile(null);
    fetchRepoContents(repo);
  };

  const handleSelectItem = (item: FileItem) => {
    if (item.type === 'dir') {
      fetchRepoContents(selectedRepo!, item.path);
    } else {
      fetchFileContent(selectedRepo!, item.path);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Connect GitHub Repository
          </h1>
          <p className="text-lg text-gray-600">
            Connect your GitHub repositories to fetch files and generate documentation with AI
          </p>
        </div>

        {!isConnected ? (
          <div className="max-w-md mx-auto space-y-6">
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
                  className="w-full"
                  disabled={!installUrl}
                >
                  <Github className="h-4 w-4 mr-2" />
                  Install GitHub App
                </Button>
                
                <div className="text-center text-sm text-gray-500">
                  Already installed? Refresh the page to auto-connect
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Manual connection (if you know your installation ID):
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualIdInput}
                      onChange={(e) => setManualIdInput(e.target.value)}
                      placeholder="Installation ID"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <Button 
                      onClick={handleManualConnect}
                      variant="outline"
                      size="sm"
                      disabled={!manualIdInput.trim()}
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
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
                    {repositories.length} repositories available
                  </CardDescription>
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleManageRepoAccess}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Manage Repository Access
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading && !repositories.length ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {repositories.map((repo) => (
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
                      Browse repository files and folders
                    </CardDescription>
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
                            <span className="text-sm text-gray-700 truncate">
                              {item.name}
                            </span>
                          </div>
                        ))}
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
                      File size: {(selectedFile.size / 1024).toFixed(1)} KB
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedFile.content}
                      </pre>
                    </div>
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedFile.content);
                        }}
                      >
                        Copy Content
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}