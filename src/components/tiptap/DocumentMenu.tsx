import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Sparkles,
  Undo2,
  Redo2,
  Printer,
  Search,
  Upload,
  FileText,
  File,
  X,
  Code,
  Download,
  BookTemplate,
  MoreHorizontal,
  Copy,
  Share2,
  Settings,
  History
} from "lucide-react";

interface DocumentMenuProps {
  onUpdate?: (content: string) => void;
  isAIGenerating?: boolean;
  onAIGenerate?: () => void;
  onSaveAsTemplate?: () => void;
  documentTitle?: string;
}

export default function DocumentMenu({ 
  onUpdate, 
  isAIGenerating = false, 
  onAIGenerate,
  onSaveAsTemplate,
  documentTitle = "Untitled Document"
}: DocumentMenuProps) {
  // Document menu state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Document menu handlers
  const handleUndo = () => {
    // Will be implemented with TipTap editor instance
    console.log("Undo");
  };

  const handleRedo = () => {
    // Will be implemented with TipTap editor instance
    console.log("Redo");
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setSearchQuery("");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Will be implemented with TipTap editor instance
    console.log("Searching for:", query);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      let processedContent = "";
      
      if (file.type === "text/html" || file.name.endsWith('.html')) {
        processedContent = content;
      } else if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        processedContent = `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
      } else if (file.type === "application/json" || file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content);
          if (jsonData.content) {
            processedContent = jsonData.content;
          }
        } catch (error) {
          console.error("Invalid JSON file:", error);
        }
      }

      if (onUpdate && processedContent) {
        onUpdate(processedContent);
      }
    };
    reader.readAsText(file);
    setShowImportOptions(false);
  };

  const handleExport = (format: 'html' | 'txt' | 'json') => {
    // This will need to be implemented with actual document content
    // For now, we'll use a placeholder
    const documentContent = "<h1>Document Content</h1><p>This is a placeholder.</p>";
    
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'html':
        content = documentContent;
        filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
        mimeType = 'text/html';
        break;
      case 'txt':
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = documentContent;
        content = tempDiv.textContent || tempDiv.innerText || '';
        filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        mimeType = 'text/plain';
        break;
      case 'json':
        content = JSON.stringify({
          title: documentTitle,
          content: documentContent,
          timestamp: new Date().toISOString()
        }, null, 2);
        filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
  };

  const handleSaveAsTemplate = () => {
    if (onSaveAsTemplate) {
      onSaveAsTemplate();
    } else {
      console.log("Saving as template...");
    }
  };

  const handleCopyDocument = () => {
    // Copy document content to clipboard
    navigator.clipboard.writeText("Document content copied");
    console.log("Document copied to clipboard");
  };

  const handleShareDocument = () => {
    // Share document functionality
    console.log("Sharing document...");
  };

  const handleDocumentSettings = () => {
    // Document settings
    console.log("Opening document settings...");
  };

  const handleVersionHistory = () => {
    // Version history
    console.log("Opening version history...");
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Document Actions */}
            <div className="flex items-center bg-gray-50 rounded-lg p-1 space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleUndo}
                className="h-7 w-7 p-0 text-gray-600 hover:bg-white hover:shadow-sm"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRedo}
                className="h-7 w-7 p-0 text-gray-600 hover:bg-white hover:shadow-sm"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
              <div className="w-px h-4 bg-gray-300 mx-1"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePrint}
                className="h-7 w-7 p-0 text-gray-600 hover:bg-white hover:shadow-sm"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleSearch}
                className={`h-7 w-7 p-0 hover:bg-white hover:shadow-sm ${showSearch ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}
                title="Search"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* File Operations */}
            <div className="flex items-center space-x-1 ml-2">
              

              <Popover open={showImportOptions} onOpenChange={setShowImportOptions}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-gray-600 hover:bg-gray-100"
                    title="Import"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    <span className="text-xs">Import</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1">
                  <div className="space-y-1">
                    <label className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="file"
                        accept=".html,.txt,.json"
                        onChange={handleImport}
                        className="hidden"
                      />
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="text-sm">HTML File</span>
                    </label>
                    <label className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleImport}
                        className="hidden"
                      />
                      <File className="w-4 h-4 mr-2" />
                      <span className="text-sm">Text File</span>
                    </label>
                    <label className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                      />
                      <Code className="w-4 h-4 mr-2" />
                      <span className="text-sm">JSON File</span>
                    </label>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={showExportOptions} onOpenChange={setShowExportOptions}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-gray-600 hover:bg-gray-100"
                    title="Export"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    <span className="text-xs">Export</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport('html')}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="text-sm">Export as HTML</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport('txt')}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <File className="w-4 h-4 mr-2" />
                      <span className="text-sm">Export as Text</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport('json')}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      <span className="text-sm">Export as JSON</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* More Options */}
              <Popover open={showMoreOptions} onOpenChange={setShowMoreOptions}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-gray-600 hover:bg-gray-100"
                    title="More Options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveAsTemplate}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <BookTemplate className="w-4 h-4 mr-2" />
                      <span className="text-sm">Save as Template</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyDocument}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      <span className="text-sm">Copy Document</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShareDocument}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      <span className="text-sm">Share Document</span>
                    </Button>
                    <div className="h-px bg-gray-200 my-1"></div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleVersionHistory}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <History className="w-4 h-4 mr-2" />
                      <span className="text-sm">Version History</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDocumentSettings}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      <span className="text-sm">Document Settings</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* AI Enhancement Button - More Prominent */}
          {onAIGenerate && (
            <Button 
              variant="default"
              size="sm" 
              onClick={onAIGenerate}
              disabled={isAIGenerating}
              className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 h-7"
            >
              {isAIGenerating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700 mr-2"></div>
                  <span className="text-xs">Generating...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-xs font-medium">AI Enhance</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-2">
          <div className="flex items-center space-x-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search in document..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10 h-7 text-sm bg-white"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearch("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSearch}
              className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
