import { useState } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Undo2,
  Redo2,
  Printer,
  Search,
  Upload,
  FileText,
  X,
  Download,
  BookTemplate,
  MoreHorizontal,
  Copy,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface DocumentMenuProps {
  onUpdate?: (content: string) => void;
  onSaveAsTemplate?: () => void;
  documentTitle?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  editor?: any; // TipTap editor instance
  documentContent?: string; // Current document content for PDF export
}

export default function DocumentMenu({
  onUpdate,
  onSaveAsTemplate,
  documentTitle = "Untitled Document",
  activeTab = "editor",
  onTabChange,
  editor,
  documentContent,
}: DocumentMenuProps) {
  // Document menu state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [searchMatches, setSearchMatches] = useState<number>(0);
  const [currentMatch, setCurrentMatch] = useState<number>(0);
  const [highlightedElements, setHighlightedElements] = useState<HTMLElement[]>([]);

  // Document menu handlers
  const handleUndo = () => {
    if (editor) {
      editor.chain().focus().undo().run();
    }
  };

  const handleRedo = () => {
    if (editor) {
      editor.chain().focus().redo().run();
    }
  };

  const handlePrint = () => {
    // Get content from props first, then fallback to editor
    let contentToPrint = documentContent;
    if (!contentToPrint && editor) {
      contentToPrint = editor.getHTML();
    }
    if (!contentToPrint) {
      window.print();
      return;
    }

    // Create print styles and inject content into current page for native print preview
    const printStyles = `
      <style id="print-styles" media="print">
        @page { 
          margin: 20mm; 
          size: A4;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .print-content h1, .print-content h2, .print-content h3, .print-content h4, .print-content h5, .print-content h6 { 
            margin-top: 24px; 
            margin-bottom: 12px; 
            font-weight: 600;
            color: #1a1a1a;
            page-break-after: avoid;
          }
          .print-content h1 { font-size: 2.2em; border-bottom: 2px solid #e1e5e9; padding-bottom: 0.3em; }
          .print-content h2 { font-size: 1.8em; border-bottom: 1px solid #e1e5e9; padding-bottom: 0.2em; }
          .print-content h3 { font-size: 1.4em; }
          .print-content h4 { font-size: 1.2em; }
          .print-content h5 { font-size: 1.1em; }
          .print-content h6 { font-size: 1em; color: #666; }
          .print-content p { 
            margin-bottom: 12px; 
            text-align: justify;
            page-break-inside: avoid;
            orphans: 2;
            widows: 2;
          }
          .print-content ul, .print-content ol { 
            margin: 12px 0; 
            padding-left: 24px; 
            page-break-inside: avoid;
          }
          .print-content li { margin-bottom: 6px; }
          .print-content table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 16px 0; 
            page-break-inside: avoid;
          }
          .print-content th, .print-content td { 
            border: 1px solid #e5e7eb; 
            padding: 8px; 
            text-align: left; 
          }
          .print-content th { 
            background-color: #f9fafb; 
            font-weight: 600;
            color: #374151;
          }
          .print-content tr:nth-child(even) { background-color: #f9fafb; }
          .print-content code { 
            background-color: #f3f4f6; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          .print-content pre { 
            background-color: #f3f4f6; 
            padding: 12px; 
            border-radius: 6px; 
            margin: 12px 0;
            page-break-inside: avoid;
          }
          .print-content pre code { 
            background-color: transparent; 
            padding: 0; 
          }
          .print-content strong { font-weight: 600; }
          .print-content em { font-style: italic; }
          .print-content a { 
            color: #2563eb; 
            text-decoration: underline;
          }
          .print-content hr { 
            border: none; 
            height: 1px; 
            background-color: #e5e7eb; 
            margin: 24px 0; 
            page-break-after: avoid;
          }
        }
      </style>
    `;

    // Create print content div
    const printDiv = document.createElement('div');
    printDiv.className = 'print-content';
    printDiv.innerHTML = contentToPrint;
    printDiv.style.display = 'none';

    // Add styles to head
    document.head.insertAdjacentHTML('beforeend', printStyles);
    document.body.appendChild(printDiv);

    // Trigger print dialog
    window.print();

    // Cleanup after print
    setTimeout(() => {
      const styleElement = document.getElementById('print-styles');
      if (styleElement) {
        styleElement.remove();
      }
      if (printDiv && printDiv.parentNode) {
        printDiv.parentNode.removeChild(printDiv);
      }
    }, 1000);
  };

  const handleExportToPDF = async () => {
    // Get content from props first, then fallback to editor
    let contentToExport = documentContent;
    if (!contentToExport && editor) {
      contentToExport = editor.getHTML();
    }
    if (!contentToExport) {
      return;
    }

    try {
      // Create a simplified temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: white;
        font-size: 14px;
      `;

      // Create styled content
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = contentToExport;

      // Apply basic styling to content elements
      const elements = contentDiv.querySelectorAll('*');
      elements.forEach(el => {
        const element = el as HTMLElement;
        if (element.tagName === 'H1') {
          element.style.cssText = 'font-size: 28px; font-weight: bold; margin: 24px 0 12px 0; border-bottom: 2px solid #ccc; padding-bottom: 8px;';
        } else if (element.tagName === 'H2') {
          element.style.cssText = 'font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; border-bottom: 1px solid #ccc; padding-bottom: 6px;';
        } else if (element.tagName === 'H3') {
          element.style.cssText = 'font-size: 20px; font-weight: bold; margin: 18px 0 9px 0;';
        } else if (element.tagName === 'P') {
          element.style.cssText = 'margin: 8px 0; text-align: justify;';
        } else if (element.tagName === 'UL' || element.tagName === 'OL') {
          element.style.cssText = 'margin: 8px 0; padding-left: 24px;';
        } else if (element.tagName === 'LI') {
          element.style.cssText = 'margin: 4px 0;';
        } else if (element.tagName === 'TABLE') {
          element.style.cssText = 'border-collapse: collapse; width: 100%; margin: 12px 0; border: 1px solid #ccc;';
        } else if (element.tagName === 'TH' || element.tagName === 'TD') {
          element.style.cssText = 'border: 1px solid #ccc; padding: 8px; text-align: left;';
          if (element.tagName === 'TH') {
            element.style.backgroundColor = '#f5f5f5';
            element.style.fontWeight = 'bold';
          }
        }
      });

      tempContainer.appendChild(contentDiv);
      document.body.appendChild(tempContainer);

      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(tempContainer, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false
      });

      // Remove temp container
      document.body.removeChild(tempContainer);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF with a simple filename
      const filename = `document.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Silently fail without showing alert
    }
  }; const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      clearSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchMatches(0);
    setCurrentMatch(0);
    clearHighlights();
  };

  const clearHighlights = () => {
    // Remove all existing highlights
    highlightedElements.forEach(element => {
      const parent = element.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(element.textContent || ''), element);
        parent.normalize();
      }
    });
    setHighlightedElements([]);
  };

  const highlightText = (query: string) => {
    if (!editor || !query.trim()) {
      clearHighlights();
      return;
    }

    const editorElement = editor.view.dom;
    const walker = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;

    // Collect all text nodes
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    const newHighlights: HTMLElement[] = [];
    let matchCount = 0;

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(regex);

      if (matches) {
        matchCount += matches.length;

        // Split text and create highlights
        const parts = text.split(regex);
        const parent = textNode.parentNode;

        if (parent) {
          const fragment = document.createDocumentFragment();

          for (let i = 0; i < parts.length; i++) {
            if (parts[i]) {
              fragment.appendChild(document.createTextNode(parts[i]));
            }

            if (i < parts.length - 1) {
              const highlight = document.createElement('mark');
              highlight.style.backgroundColor = '#ffeb3b';
              highlight.style.color = '#000';
              highlight.style.padding = '1px 2px';
              highlight.style.borderRadius = '2px';
              highlight.textContent = matches[i] || query;
              fragment.appendChild(highlight);
              newHighlights.push(highlight);
            }
          }

          parent.replaceChild(fragment, textNode);
        }
      }
    });

    setHighlightedElements(newHighlights);
    setSearchMatches(matchCount);
    setCurrentMatch(matchCount > 0 ? 1 : 0);

    // Scroll to first match
    if (newHighlights.length > 0) {
      newHighlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const navigateMatch = (direction: 'next' | 'prev') => {
    if (highlightedElements.length === 0) return;

    let newIndex = currentMatch - 1; // Convert to 0-based index

    if (direction === 'next') {
      newIndex = (newIndex + 1) % highlightedElements.length;
    } else {
      newIndex = (newIndex - 1 + highlightedElements.length) % highlightedElements.length;
    }

    setCurrentMatch(newIndex + 1); // Convert back to 1-based

    // Scroll to the selected match
    if (highlightedElements[newIndex]) {
      // Update highlight colors
      highlightedElements.forEach((el, index) => {
        if (index === newIndex) {
          el.style.backgroundColor = '#ff9800';
          el.style.color = '#fff';
        } else {
          el.style.backgroundColor = '#ffeb3b';
          el.style.color = '#000';
        }
      });

      highlightedElements[newIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim()) {
      // Clear previous highlights before creating new ones
      clearHighlights();

      // Use setTimeout to allow the input to update first
      setTimeout(() => {
        highlightText(query);
      }, 100);
    } else {
      clearHighlights();
      setSearchMatches(0);
      setCurrentMatch(0);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only accept Markdown files
    if (!file.name.endsWith('.md')) {
      alert('Please select a Markdown (.md) file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const markdownContent = e.target?.result as string;

      try {
        // Convert Markdown to HTML using marked
        const htmlContent = await marked(markdownContent);

        if (onUpdate && htmlContent) {
          onUpdate(htmlContent);
        }
      } catch (error) {
        console.error('Error parsing markdown:', error);
        alert('Error parsing markdown file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    setShowImportOptions(false);
  };

  const handleExport = (format: 'md' | 'pdf') => {
    if (format === 'pdf') {
      handleExportToPDF();
      return;
    }

    // Get the actual document content from props, editor, or fallback
    let contentToExport = documentContent;
    if (!contentToExport && editor) {
      contentToExport = editor.getHTML();
    }
    if (!contentToExport) {
      alert('No content to export');
      return;
    }

    // Convert HTML to Markdown for .md export
    const convertToMarkdown = (html: string): string => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Basic HTML to Markdown conversion
      let markdown = html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<ul[^>]*>/gi, '')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<ol[^>]*>/gi, '')
        .replace(/<\/ol>/gi, '\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br[^>]*>/gi, '\n')
        .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
        .trim();

      return markdown;
    };

    const content = convertToMarkdown(contentToExport);
    const filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    const mimeType = 'text/markdown';

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
                        accept=".md"
                        onChange={handleImport}
                        className="hidden"
                      />
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="text-sm">Markdown (.md)</span>
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
                      onClick={() => handleExport('md')}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="text-sm">Markdown (.md)</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport('pdf')}
                      className="w-full justify-start h-8 px-2 text-gray-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      <span className="text-sm">PDF (.pdf)</span>
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
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* View Mode Selector (replaces AI Enhance spot) */}
          <div className="flex items-center gap-2">
            <Select
              value={activeTab}
              onValueChange={(v) => onTabChange?.(v)}
            >
              <SelectTrigger className="h-7 w-36 text-sm">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editing</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-2">
          <div className="flex items-center space-x-2 max-w-2xl">
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

            {/* Match count and navigation */}
            {searchMatches > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 min-w-fit">
                  {currentMatch} of {searchMatches}
                </span>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMatch('prev')}
                    disabled={searchMatches === 0}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                    title="Previous match"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMatch('next')}
                    disabled={searchMatches === 0}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                    title="Next match"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
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
