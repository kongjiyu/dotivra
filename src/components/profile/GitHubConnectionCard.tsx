import React, { useState, useEffect } from 'react';
import { 
  Github, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Unlink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import GitHubService, { type GitHubUser } from '../../services/gitHubService';
import { githubOAuthService } from '../../services/githubOAuthService';
import { showSuccess } from '@/utils/sweetAlert';

interface GitHubConnectionCardProps {
  onConnectionChange?: (connected: boolean) => void;
}

const GitHubConnectionCard: React.FC<GitHubConnectionCardProps> = ({ onConnectionChange }) => {
  const { user: firebaseUser, userProfile, refreshUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [githubUser, setGitHubUser] = useState<GitHubUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const githubService = new GitHubService();

  useEffect(() => {
    checkConnectionStatus();
  }, [firebaseUser, userProfile]);

  const checkConnectionStatus = async () => {
    if (!firebaseUser) return;

    try {
      setLoading(true);
      setError(null);

      const hasAccess = await githubService.hasGitHubAccess();
      setConnected(hasAccess);

      if (hasAccess) {
        const validation = await githubService.validateConnection();
        if (validation.valid && validation.user) {
          setGitHubUser(validation.user);
        } else {
          setError(validation.error || 'GitHub connection invalid');
          setConnected(false);
        }
      }

      onConnectionChange?.(hasAccess);
    } catch (err) {
      console.error('Failed to check GitHub connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to check GitHub connection');
      setConnected(false);
      onConnectionChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await authService.signInWithGitHub();
      
      if (result.success) {
        await checkConnectionStatus();
        // Refresh user profile to update GitHub username immediately
        await refreshUserProfile();
      } else if (result.needsLinking && result.pendingCredential) {
        // Handle account linking case
        setError('Linking your GitHub account to your existing email account...');
        
        const linkResult = await authService.linkGitHubAccount(result.pendingCredential);
        
        if (linkResult.success) {
          setError('✅ GitHub account successfully linked to your profile!');
          await checkConnectionStatus();
          // Refresh user profile to update GitHub username immediately
          await refreshUserProfile();
          // Clear success message after 3 seconds
          setTimeout(() => setError(null), 3000);
        } else {
          setError(linkResult.error || 'Failed to link GitHub account');
        }
      } else {
        setError(result.error || 'Failed to connect to GitHub');
      }
    } catch (err) {
      console.error('GitHub connection failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!firebaseUser || !confirm('Are you sure you want to disconnect GitHub?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Actually disconnect from Firestore
      await githubOAuthService.disconnectGitHub(firebaseUser);

      // Update local state
      setConnected(false);
      setGitHubUser(null);
      onConnectionChange?.(false);

      // Refresh user profile to reflect changes
      await refreshUserProfile();
      
      showSuccess('Disconnected', 'GitHub account has been disconnected successfully.');
      
    } catch (err) {
      console.error('Failed to disconnect GitHub:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect GitHub');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      const validation = await githubService.validateConnection();
      
      if (validation.valid) {
        setError(null);
        showSuccess('Connection Test Successful!', 'Your GitHub connection is working properly.');
      } else {
        setError(validation.error || 'GitHub connection test failed');
      }
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseUser) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">GitHub Integration</h3>
              <p className="text-sm text-gray-600">
                Connect your GitHub account to access repositories
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            ) : connected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              connected ? 'text-green-700' : 'text-red-700'
            }`}>
              {connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>

        {error && (
          <div className={`px-4 py-3 rounded-md mb-4 ${
            error.includes('successfully') || error.includes('linked') 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {connected && githubUser && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <img 
                src={githubUser.avatar_url} 
                alt={githubUser.name || githubUser.login}
                className="w-12 h-12 rounded-full border-2 border-gray-200"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  {githubUser.name || githubUser.login}
                </h4>
                <p className="text-sm text-gray-600">@{githubUser.login}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  <span>{githubUser.public_repos} public repos</span>
                  <span>{githubUser.followers} followers</span>
                  <span>{githubUser.following} following</span>
                </div>
              </div>
              <a
                href={`https://github.com/${githubUser.login}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {connected ? (
            <>
              <button
                onClick={testConnection}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" />
                ) : (
                  <span className="text-white">Test Connection</span>
                )}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                <>
                  <Github className="text-white w-4 h-4 inline-block mr-2" />
                  <span className="text-white">Connect GitHub Account</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          {connected ? (
            <p>✅ GitHub connected. You can now access your repositories for document creation.</p>
          ) : (
            <p>Connect your GitHub account to create documents from your repositories.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitHubConnectionCard;
