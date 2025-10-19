// src/components/github/GitHubConnectionTest.tsx
import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import GitHubService, { type GitHubUser, type GitHubRepository } from '../../services/gitHubService';
import { useAuth } from '../../context/AuthContext';

const GitHubConnectionTest: React.FC = () => {
  const { user } = useAuth();
  const [githubUser, setGitHubUser] = useState<GitHubUser | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGitHubAccess, setHasGitHubAccess] = useState(false);

  const githubService = new GitHubService();

  useEffect(() => {
    checkGitHubConnection();
  }, [user]);

  const checkGitHubConnection = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const hasAccess = await githubService.hasGitHubAccess();
      setHasGitHubAccess(hasAccess);

      if (hasAccess) {
        const validation = await githubService.validateConnection();
        if (validation.valid && validation.user) {
          setGitHubUser(validation.user);
        } else {
          setError(validation.error || 'GitHub connection invalid');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check GitHub connection');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.signInWithGitHub();
      if (result.success) {
        await checkGitHubConnection();
      } else {
        setError(result.error || 'GitHub sign-in failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    if (!githubUser) return;

    try {
      setLoading(true);
      const repos = await githubService.getUserRepositories(undefined, {
        sort: 'updated',
        per_page: 10
      });
      setRepositories(repos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-gray-600">Please sign in to test GitHub connection</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">GitHub Integration Test</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">GitHub Connection Status</h3>
              <p className="text-sm text-gray-600">
                {hasGitHubAccess ? '✅ Connected' : '❌ Not connected'}
              </p>
            </div>
            {!hasGitHubAccess && (
              <button
                onClick={handleGitHubSignIn}
                disabled={loading}
                className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect GitHub'}
              </button>
            )}
          </div>

          {/* GitHub User Info */}
          {githubUser && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">GitHub Account</h3>
              <div className="flex items-center space-x-3">
                <img 
                  src={githubUser.avatar_url} 
                  alt={githubUser.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="font-medium">{githubUser.name}</p>
                  <p className="text-sm text-gray-600">@{githubUser.login}</p>
                  <p className="text-xs text-gray-500">
                    {githubUser.public_repos} repos • {githubUser.followers} followers
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Load Repositories */}
          {githubUser && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Your Repositories</h3>
                <button
                  onClick={loadRepositories}
                  disabled={loading}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Repos'}
                </button>
              </div>

              {repositories.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {repositories.map((repo) => (
                    <div 
                      key={repo.id} 
                      className="p-3 border rounded bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-600">{repo.name}</h4>
                          <p className="text-sm text-gray-600 truncate max-w-md">
                            {repo.description || 'No description'}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            {repo.language && (
                              <span className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                                {repo.language}
                              </span>
                            )}
                            <span>⭐ {repo.stargazers_count}</span>
                            <span>🍴 {repo.forks_count}</span>
                            <span>{repo.private ? '🔒 Private' : '🌍 Public'}</span>
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          Select
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitHubConnectionTest;