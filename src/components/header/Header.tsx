import React from 'react';
import { Home, Folder, Layout, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  userName?: string;
  initials?: string;
  showProfile?: boolean;
  showNavigation?: boolean;
  onFeedbackClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  userName,
  initials,
  showProfile = true,
  showNavigation = true,
  onFeedbackClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, userProfile, user } = useAuth();

  // Use provided userName or fallback to userProfile
  const displayName = userName || userProfile?.displayName || userProfile?.email || 'User';

  const avatarLabel = (initials && initials.trim()) ||
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) ||
    'U';

  // Get user's profile photo from Firebase Auth
  const userPhotoURL = user?.photoURL || userProfile?.photoURL;

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/projects', label: 'Projects', icon: Folder },
    { path: '/templates', label: 'Templates', icon: Layout },
    { path: '/feedback', label: 'Feedback', icon: MessageSquare, action: onFeedbackClick },
  ];

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 justify-start">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img src="/logo-banner.png" alt="Dotivra" className="h-14 w-auto" />
            </button>
          </div>

          {/* Navigation */}
          {showNavigation && (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Profile */}
          {showProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open profile menu"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-xs font-medium text-gray-700 hidden sm:block">{displayName}</span>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold uppercase overflow-hidden">
                    {userPhotoURL ? (
                      <img 
                        src={userPhotoURL} 
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      avatarLabel
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => navigate('/profile')}>Profile settings</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={async () => { try { await signOut(); navigate('/'); } catch { navigate('/'); } }}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Navigation */}
        {showNavigation && (
          <nav className="md:hidden mt-3 flex items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
