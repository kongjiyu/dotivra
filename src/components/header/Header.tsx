import React from 'react';
import { FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  userName?: string;
  initials?: string;
  showProfile?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title = 'Dotivra',
  subtitle = 'Your documentation home base',
  userName = 'John Doe',
  initials,
  showProfile = true,
}) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const avatarLabel = (initials && initials.trim()) ||
    userName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) ||
    'U';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-blue-600" />
          <div>
            <p className="text-lg font-semibold text-blue-600">{title}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>

        {showProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open profile menu"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-xs font-medium text-gray-700 hidden sm:block">{userName}</span>
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold uppercase">
                  {avatarLabel}
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
    </header>
  );
};

export default Header;
