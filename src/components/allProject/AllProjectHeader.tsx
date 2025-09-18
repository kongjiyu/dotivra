// src/components/allProject/AllProjectsHeader.tsx - Clean all projects header
import React from 'react';
import { Search, FolderOpen } from 'lucide-react';

interface AllProjectsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  projectCount: number;
}

const AllProjectsHeader: React.FC<AllProjectsHeaderProps> = ({
  searchQuery,
  onSearchChange,
  projectCount
}) => {

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header Content */}
        <div className="py-8">

          {/* Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
                <p className="text-gray-600 mt-1">
                  {projectCount} project{projectCount !== 1 ? 's' : ''} • Manage and organize your documentation
                </p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="w-full sm:w-80">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Search projects..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllProjectsHeader;