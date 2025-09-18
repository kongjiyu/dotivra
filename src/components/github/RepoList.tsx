import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Repository } from '../../lib/githubClient';
import { ExternalLink, Lock, Users, GitBranch } from 'lucide-react';

interface RepoListProps {
  repositories: Repository[];
  loading?: boolean;
  onSelectRepo: (repo: Repository) => void;
  selectedRepo?: Repository | null;
}

export function RepoList({ repositories, loading, onSelectRepo, selectedRepo }: RepoListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No repositories found</h3>
            <p className="text-gray-600 mb-4">
              No repositories are accessible through your GitHub App installations.
            </p>
            <p className="text-sm text-gray-500">
              Try installing the GitHub App on more repositories or organizations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Accessible Repositories ({repositories.length})
        </h3>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {repositories.map((repo) => (
          <Card
            key={repo.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRepo?.id === repo.id
                ? 'ring-2 ring-blue-500 border-blue-200'
                : 'hover:border-gray-300'
            }`}
            onClick={() => onSelectRepo(repo)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">
                    {repo.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-1">
                    {repo.owner}/{repo.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {repo.private && (
                    <Lock className="h-3 w-3 text-gray-400" />
                  )}
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {repo.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {repo.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {repo.private ? (
                      <><Lock className="h-3 w-3 mr-1" /> Private</>
                    ) : (
                      <><Users className="h-3 w-3 mr-1" /> Public</>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center text-xs text-gray-500">
                  <GitBranch className="h-3 w-3 mr-1" />
                  {repo.default_branch}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}