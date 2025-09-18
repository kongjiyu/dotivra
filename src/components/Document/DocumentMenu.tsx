import { useState } from "react";
import { Button } from "@/components/ui/button";
import html2pdf from '@digivorefr/html2pdf.js';
import { marked } from 'marked';
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
	editor?: any; // TipTap editor instance
	documentContent?: string; // Current document content for PDF export
	context?: 'main' | 'project'; // To distinguish between main menu and project tab imports
}

export default function DocumentMenu({
	onUpdate,
	onSaveAsTemplate,
	documentTitle = "Untitled Document",
	editor,
	documentContent,
	context = 'main',
}: DocumentMenuProps) {
	// Document menu state
	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [showImportOptions, setShowImportOptions] = useState(false);
	const [showExportOptions, setShowExportOptions] = useState(false);
	const [showMoreOptions, setShowMoreOptions] = useState(false);
	const [searchMatches, setSearchMatches] = useState<number>(0);
	const [currentMatch, setCurrentMatch] = useState<number>(0);
	const [searchResults, setSearchResults] = useState<Array<{ from: number, to: number }>>([]);
	const [replaceText, setReplaceText] = useState<string>("");

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

		try {
			// --- STEP 1: Parse and modify HTML ---
			const parser = new DOMParser();
			const doc = parser.parseFromString(contentToPrint, "text/html");

			// Add "avoid-break" class to block elements
			doc.querySelectorAll("h1,h2,h3,table,ul,ol,pre,blockquote").forEach((el) => {
				el.classList.add("avoid-break");
			});

			// Serialize back to HTML string
			const updatedContent = doc.body.innerHTML;

			// --- STEP 2: Create hidden iframe ---
			const iframe = document.createElement("iframe");
			iframe.style.position = "absolute";
			iframe.style.left = "-9999px";
			iframe.style.top = "0px";
			iframe.style.width = "0px";
			iframe.style.height = "0px";
			document.body.appendChild(iframe);

			const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
			if (!iframeDoc) {
				window.print();
				return;
			}

			// --- STEP 3: Write HTML with styles ---
			const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Document</title>
        <style>
          @media print {
            .page-break { page-break-before: always; break-before: page; }
            .avoid-break { page-break-inside: avoid; break-inside: avoid; }

            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			font-size: 20px;
			line-height: 1.6;
			color: #333;
			max-width: 800px;
			margin: 0 auto;
			padding: 40px;
			background-color: white;
            }
           /* Hard page break: insert <div class="page-break"></div> */
      .page-break { page-break-before: always; break-before: page; }

      /* Try to keep these blocks intact on one page */
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }

      h1, h2, h3, table, pre, blockquote { page-break-inside: avoid; break-inside: avoid; }
      tr, img, figure { page-break-inside: avoid; break-inside: avoid; max-width: 100%; }

      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }

      h1 { font-size: 28px; font-weight: 700; margin: 24px 0 12px; border-bottom: 2px solid #ccc; padding-bottom: 8px; }
      h2 { font-size: 24px; font-weight: 700; margin: 20px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
      h3 { font-size: 20px; font-weight: 700; margin: 18px 0 9px; }
      p  { margin: 8px 0; text-align: justify; }
      ul, ol { margin: 8px 0; padding-left: 24px; }
      li { margin: 4px 0; }
          }
        </style>
      </head>
      <body>
        ${updatedContent}
      </body>
      </html>
    `;

			iframeDoc.open();
			iframeDoc.write(printContent);
			iframeDoc.close();

			// --- STEP 4: Trigger print ---
			iframe.onload = () => {
				iframe.contentWindow?.print();
				setTimeout(() => {
					document.body.removeChild(iframe);
				}, 100);
			};
		} catch (error) {
			console.error("Error printing:", error);
			window.print();
		}
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
			// Create element with content and styling for OKLCH-compatible PDF generation
			const element = document.createElement('div');
			const style = document.createElement("style");
			element.innerHTML = contentToExport;
			element.style.cssText = `
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
        background-color: white;
      `;
			style.textContent = `
      /* Hard page break: insert <div class="page-break"></div> */
      .page-break { page-break-before: always; break-before: page; }

      /* Try to keep these blocks intact on one page */
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }

      h1, h2, h3, table, pre, blockquote { page-break-inside: avoid; break-inside: avoid; }
      tr, img, figure { page-break-inside: avoid; break-inside: avoid; max-width: 100%; }

      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }

      h1 { font-size: 28px; font-weight: 700; margin: 24px 0 12px; border-bottom: 2px solid #ccc; padding-bottom: 8px; }
      h2 { font-size: 24px; font-weight: 700; margin: 20px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
      h3 { font-size: 20px; font-weight: 700; margin: 18px 0 9px; }
      p  { margin: 8px 0; text-align: justify; }
      ul, ol { margin: 8px 0; padding-left: 24px; }
      li { margin: 4px 0; }
    `;
			element.prepend(style);

			// 4) Optionally tag common blocks to avoid breaks (best-effort)
			element.querySelectorAll("h1,h2,h3,table,ul,ol,pre,blockquote").forEach((el) => {
				el.classList.add("avoid-break");
			});

			// Apply basic styling to elements


			// Configure html2pdf options with OKLCH support
			const options = {
				margin: 1,
				filename: 'document.pdf',
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: {
					scale: 2,
					useCORS: true,
					allowTaint: true,
					backgroundColor: '#ffffff',
					logging: false,
					// @digivorefr/html2pdf.js handles OKLCH colors automatically
				},
				jsPDF: {
					unit: 'in',
					format: 'letter',
					orientation: 'portrait'
				},
				pagebreak: {
					mode: ["css", "legacy"], // respect CSS break rules + legacy algorithm
					before: ".page-break", // manual hard breaks
					avoid:
						"h1, h2, h3, table, pre, blockquote, .avoid-break, tr, img, figure",
				}
			};

			// Generate PDF with native OKLCH support
			await html2pdf().set(options).from(element).save();

		} catch (error) {
			console.error('Error generating PDF:', error);
			// Silently fail without showing alert
		}
	};

	const toggleSearch = () => {
		setShowSearch(!showSearch);
		if (showSearch) {
			// If we're closing the search, clear it
			clearSearch();
		}
	};

	const clearSearch = () => {
		setSearchQuery("");
		setSearchMatches(0);
		setCurrentMatch(0);
		setSearchResults([]);
		// Don't close the search bar here, let toggleSearch handle that
		if (editor) {
			// Clear any existing selections/highlights and remove search highlights
			editor.commands.setTextSelection(0);
			editor.commands.unsetHighlight();
		}
	};

	const closeSearch = () => {
		clearSearch();
		setShowSearch(false);
	};

	const findAllMatches = (query: string) => {
		if (!editor || !query.trim()) {
			setSearchResults([]);
			setSearchMatches(0);
			setCurrentMatch(0);
			return [];
		}

		const doc = editor.state.doc;
		const results: Array<{ from: number, to: number }> = [];
		const normalizedQuery = query.toLowerCase();

		// Search through the document text
		doc.descendants((node: any, pos: number) => {
			if (node.isText && node.text) {
				const text = node.text.toLowerCase();
				let startIndex = 0;
				let index = text.indexOf(normalizedQuery, startIndex);

				while (index !== -1) {
					results.push({
						from: pos + index,
						to: pos + index + query.length
					});
					startIndex = index + 1;
					index = text.indexOf(normalizedQuery, startIndex);
				}
			}
			return true;
		});

		setSearchResults(results);
		setSearchMatches(results.length);
		setCurrentMatch(results.length > 0 ? 1 : 0);

		// Apply yellow highlights to all matches
		if (results.length > 0) {
			results.forEach(result => {
				editor.commands.setTextSelection({ from: result.from, to: result.to });
				editor.commands.setHighlight({ color: '#ffeb3b' });
			});
		}

		return results;
	};

	const highlightCurrentMatch = (results: Array<{ from: number, to: number }>, currentIndex: number) => {
		if (!editor || results.length === 0 || currentIndex < 0 || currentIndex >= results.length) {
			return;
		}

		const match = results[currentIndex];

		// First, reset all highlights to yellow
		results.forEach(result => {
			editor.commands.setTextSelection({ from: result.from, to: result.to });
			editor.commands.setHighlight({ color: '#ffeb3b' });
		});

		// Then highlight the current match with orange
		editor.commands.setTextSelection({ from: match.from, to: match.to });
		editor.commands.setHighlight({ color: '#ff9800' });

		// Scroll the selection into view
		const { view } = editor;
		const { from } = match;
		const coords = view.coordsAtPos(from);
		if (coords) {
			const element = view.dom;
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	};

	const navigateMatch = (direction: 'next' | 'prev') => {
		if (searchResults.length === 0) return;

		let newIndex = currentMatch - 1; // Convert to 0-based index

		if (direction === 'next') {
			newIndex = (newIndex + 1) % searchResults.length;
		} else {
			newIndex = (newIndex - 1 + searchResults.length) % searchResults.length;
		}

		setCurrentMatch(newIndex + 1); // Convert back to 1-based
		highlightCurrentMatch(searchResults, newIndex);
	};

	const handleReplaceOne = () => {
		if (!editor || !searchQuery || searchResults.length === 0 || currentMatch === 0) return;

		try {
			const currentIndex = currentMatch - 1; // Convert to 0-based
			const result = searchResults[currentIndex];

			editor.commands.setTextSelection({ from: result.from, to: result.to });
			editor.commands.insertContent(replaceText);

			// Refresh search results after replacement
			const newQuery = searchQuery;
			setTimeout(() => {
				const newResults = findAllMatches(newQuery);
				if (newResults.length > 0) {
					// Try to maintain position, or go to previous if we're at the end
					const newIndex = Math.min(currentIndex, newResults.length - 1);
					setCurrentMatch(newIndex + 1);
					highlightCurrentMatch(newResults, newIndex);
				} else {
					clearSearch();
				}
			}, 100);
		} catch (e) {
			console.error('Replace one failed:', e);
		}
	};

	const handleReplaceAll = () => {
		if (!editor || !searchQuery || searchResults.length === 0) return;

		try {
			// Replace from last to first to maintain positions
			const sortedResults = [...searchResults].sort((a, b) => b.from - a.from);

			editor.chain().focus();

			sortedResults.forEach(result => {
				editor.commands.setTextSelection({ from: result.from, to: result.to });
				editor.commands.insertContent(replaceText);
			});

			clearSearch();
		} catch (e) {
			console.error('Replace all failed:', e);
		}
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);

		if (query.trim()) {
			const results = findAllMatches(query);
			if (results.length > 0) {
				highlightCurrentMatch(results, 0);
			}
		} else {
			clearSearch();
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

				if (htmlContent) {
					let documentName: string | null = null;

					// Only prompt for name if context is 'project' 
					if (context === 'project') {
						const defaultName = file.name.replace('.md', '');
						documentName = prompt(`Enter a name for the imported document:`, defaultName);

						if (!documentName) {
							return; // User cancelled, don't import
						}
					}

					if (onUpdate) {
						onUpdate(htmlContent);
						// You could also update the document title here if there's a callback for that
						console.log(`Document "${documentName}" imported successfully`);
					}
				}
			} catch (error) {
				console.error('Error parsing markdown:', error);
				alert('Error parsing markdown file. Please check the file format.');
			}
		};
		reader.readAsText(file);
		setShowImportOptions(false);
		// Reset the input value to allow importing the same file again
		event.target.value = '';
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

					{/* Tools Section */}
					<div className="flex items-center gap-2">
					</div>
				</div>
			</div>

			{/* Search Bar */}
			{showSearch && (
				<div className="border-t border-gray-200 bg-gray-50 px-6 py-2">
					<div className="flex items-center space-x-2 max-w-4xl">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<Input
								type="text"
								placeholder="Search in document..."
								value={searchQuery}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
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

						{/* Replace input */}
						<div className="flex items-center gap-2">
							<Input
								type="text"
								placeholder="Replace with..."
								value={replaceText}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplaceText(e.target.value)}
								className="h-7 text-sm bg-white w-48"
							/>
							<Button
								variant="outline"
								size="sm"
								disabled={!searchQuery || searchMatches === 0}
								onClick={handleReplaceOne}
								className="h-7"
							>
								Replace
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!searchQuery || searchMatches === 0}
								onClick={handleReplaceAll}
								className="h-7"
							>
								Replace All
							</Button>
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
							onClick={closeSearch}
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
