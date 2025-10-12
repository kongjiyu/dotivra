import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Github, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Unlink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { githubOAuthService } from '@/services/githubOAuthService';
import type { GitHubUser } from '@/services/githubOAuthService';

interface GitHubConnectionCardProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function GitHubConnectionCard({ onConnectionChange }: GitHubConnectionCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [githubUser, setGitHubUser] = useState<GitHubUser | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check GitHub connection status on component mount
  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const githubCallback = urlParams.get('github_callback');

    if (githubCallback === 'true' && code && state && user) {
      handleOAuthCallback(code, state);
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const info = await githubOAuthService.getUserGitHubInfo(user);
      if (info) {
        setConnected(info.connected);
        setGitHubUser(info.user || null);
        setConnectedAt(info.connected_at || null);
        onConnectionChange?.(info.connected);
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
      setError('Failed to check GitHub connection status');
    } finally {
      setLoading(false);
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

  const handleOAuthCallback = async (code: string, state: string) => {
    if (!user) return;

    setConnecting(true);
    setError(null);

    try {
      // Exchange code for token
      const token = await githubOAuthService.exchangeCodeForToken(code, state);
      
      // Get GitHub user info
      const githubUserInfo = await githubOAuthService.getGitHubUser(token.access_token);
      
      // Store token and user info
      await githubOAuthService.storeUserGitHubToken(user, token, githubUserInfo);
      
      // Update UI state
      setConnected(true);
      setGitHubUser(githubUserInfo);
      setConnectedAt(new Date().toISOString());
      onConnectionChange?.(true);
      
      console.log('GitHub account connected successfully!');
    } catch (error) {
      console.error('Error connecting GitHub account:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect GitHub account');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await githubOAuthService.disconnectGitHub(user);
      setConnected(false);
      setGitHubUser(null);
      setConnectedAt(null);
      onConnectionChange?.(false);
      console.log('GitHub account disconnected successfully!');
    } catch (error) {
      console.error('Error disconnecting GitHub account:', error);
      setError('Failed to disconnect GitHub account');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user) return;

    setTesting(true);
    setError(null);

    try {
      const result = await githubOAuthService.testConnection(user);
      if (result.success) {
        console.log('GitHub connection test successful!');
        setGitHubUser(result.user || null);
      } else {
        setError(result.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing GitHub connection:', error);
      setError('Failed to test GitHub connection');
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Checking connection status...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your GitHub account to import repositories and files into your documents.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {connected && githubUser ? (
          <div className="space-y-4">
            {/* Connected Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-900">Connected to GitHub</h3>
                  <p className="text-sm text-green-700">
                    Your GitHub account is successfully connected
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Active
              </Badge>
            </div>

            {/* GitHub User Info */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <img
                src={githubUser.avatar_url}
                alt={githubUser.login}
                className="h-12 w-12 rounded-full"
              />
              <div className="flex-1">
                <h4 className="font-medium">{githubUser.name || githubUser.login}</h4>
                <p className="text-sm text-muted-foreground">@{githubUser.login}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {githubUser.public_repos} public repos
                  </span>
                  {(githubUser.private_repos || 0) > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {githubUser.private_repos || 0} private repos
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://github.com/${githubUser.login}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Connection Details */}
            <div className="text-xs text-muted-foreground space-y-1">
              {connectedAt && (
                <p>Connected: {formatDate(connectedAt)}</p>
              )}
              <p>Access: Repository content, user profile</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Test Connection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnectGitHub}
                disabled={loading}
              >
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not Connected Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Github className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">GitHub Not Connected</h3>
                  <p className="text-sm text-gray-600">
                    Connect your GitHub account to access your repositories
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                Disconnected
              </Badge>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What you can do after connecting:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Import files from your repositories</li>
                <li>• Browse repository contents</li>
                <li>• Access both public and private repositories</li>
                <li>• Secure, personal access to your GitHub data</li>
              </ul>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleConnectGitHub}
              disabled={connecting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 [&>*]:text-primary-foreground"
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}