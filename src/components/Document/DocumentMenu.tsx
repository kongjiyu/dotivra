import { useState, useEffect, useRef } from "react";
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
	Search as SearchIcon,
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

// NEW: ProseMirror bits for decorations
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Editor } from "@tiptap/react";

interface DocumentMenuProps {
	onUpdate?: (content: string) => void;
	onSaveAsTemplate?: () => void;
	documentTitle?: string;
	editor?: Editor; // TipTap editor instance
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

	// === NEW: Decoration plugin wiring ===
	const searchPluginKeyRef = useRef(new PluginKey("search-highlights"));
	const searchPluginRef = useRef<any>(null);

	function buildSearchDecorations(doc: any, matches: Array<{ from: number; to: number }>, currentIndex: number) {
		const decos: any[] = [];
		matches.forEach((m, i) => {
			const cls = i === currentIndex ? "pm-search-current" : "pm-search-hit";
			decos.push(Decoration.inline(m.from, m.to, { class: cls }));
		});
		return DecorationSet.create(doc, decos);
	}

	function updateHighlights(matches: Array<{ from: number; to: number }>, currentIndex: number) {
		if (!editor || !searchPluginRef.current) return;
		const key = searchPluginKeyRef.current;
		const tr = editor.state.tr.setMeta(key, { type: "SET_MATCHES", matches, currentIndex });
		editor.view.dispatch(tr);
	}

	useEffect(() => {
		if (!editor || searchPluginRef.current) return;

		const key = searchPluginKeyRef.current;

		searchPluginRef.current = new Plugin({
			key,
			state: {
				init: (_config, state) => DecorationSet.empty,
				apply(tr, oldDecos, _oldState, newState) {
					const meta = tr.getMeta(key);
					if (meta && meta.type === "SET_MATCHES") {
						const { matches, currentIndex } = meta;
						return buildSearchDecorations(newState.doc, matches, currentIndex);
					}
					if (tr.docChanged) return oldDecos.map(tr.mapping, tr.doc);
					return oldDecos;
				},
			},
			props: {
				decorations(state) {
					// @ts-ignore
					return this.getState(state);
				},
			},
		});

		// Tiptap exposes registerPlugin/unregisterPlugin
		editor.registerPlugin(searchPluginRef.current);

		return () => {
			if (editor && searchPluginRef.current) {
				editor.unregisterPlugin(searchPluginKeyRef.current);
				searchPluginRef.current = null;
			}
		};
	}, [editor]);
	// === END plugin wiring ===

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
			.pm-search-hit, .pm-search-current {
				background: transparent !important;
				outline: none !important;
          	}
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              background-color: white;
            }

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
			// Create element with content and styling
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
      .page-break { page-break-before: always; break-before: page; }
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
	  .pm-search-hit, .pm-search-current { background-color: transparent !important; outline: none !important; }
    `;
			element.prepend(style);

			element.querySelectorAll("h1,h2,h3,table,ul,ol,pre,blockquote").forEach((el) => {
				el.classList.add("avoid-break");
			});

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
				},
				jsPDF: {
					unit: 'in',
					format: 'letter',
					orientation: 'portrait'
				},
				pagebreak: {
					mode: ["css", "legacy"],
					before: ".page-break",
					avoid: "h1, h2, h3, table, pre, blockquote, .avoid-break, tr, img, figure",
				}
			};

			await html2pdf().set(options).from(element).save();

		} catch (error) {
			console.error('Error generating PDF:', error);
		}
	};

	const toggleSearch = () => {
		setShowSearch(!showSearch);
		if (showSearch) {
			clearSearch();
		}
	};

	const clearSearch = () => {
		setSearchQuery("");
		setSearchMatches(0);
		setCurrentMatch(0);
		setSearchResults([]);
		if (editor) {
			editor.commands.setTextSelection(0);
			// NEW: clear decorations instead of unsetHighlight()
			updateHighlights([], -1);
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
			updateHighlights([], -1);
			return [];
		}

		const doc = editor.state.doc;
		const results: Array<{ from: number, to: number }> = [];
		const normalizedQuery = query.toLowerCase();

		// Double-loop search within each text node (case-insensitive), supports multi-char & overlaps
		doc.descendants((node: any, pos: number) => {
			if (node.isText && node.text) {
				const lowerText = node.text.toLowerCase();
				const q = normalizedQuery;
				const qLen = q.length;
				if (qLen === 0) return true;

				for (let i = 0; i + qLen <= lowerText.length; i++) {
					let ok = true;
					for (let j = 0; j < qLen; j++) {
						if (lowerText.charCodeAt(i + j) !== q.charCodeAt(j)) {
							ok = false;
							break;
						}
					}
					if (ok) {
						results.push({
							from: pos + i,
							to: pos + i + qLen,
						});
					}
				}
			}
			return true;
		});

		setSearchResults(results);
		setSearchMatches(results.length);
		setCurrentMatch(results.length > 0 ? 1 : 0);

		// NEW: Paint via decorations (no marks, no node splitting)
		const currentIndex = results.length > 0 ? 0 : -1;
		updateHighlights(results, currentIndex);

		return results;
	};

	const highlightCurrentMatch = (results: Array<{ from: number, to: number }>, currentIndex: number) => {
		if (!editor || results.length === 0 || currentIndex < 0 || currentIndex >= results.length) {
			return;
		}

		// NEW: repaint decorations with a special class for the current item
		updateHighlights(results, currentIndex);

		// Scroll the selection into view (optional: also set selection)
		const match = results[currentIndex];
		const { view } = editor;
		try {
			view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, match.from, match.to)));
		} catch {
			// ignore selection errors
		}
		try {
			const coords = view.coordsAtPos(match.from);
			if (coords) {
				const el = view.dom.querySelector('.pm-search-current') as HTMLElement | null;
				if (el) {
					// Smooth center scroll (fallback in case scrollIntoView on tr isn't enough)
					el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

					// Add a temporary pulse/hover effect
					el.classList.add('pm-search-hover');
					window.setTimeout(() => el.classList.remove('pm-search-hover'), 1200);
				}
			}
		} catch { /* ignore */ }
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
					const newIdx = Math.min(currentIndex, newResults.length - 1);
					setCurrentMatch(newIdx + 1);
					highlightCurrentMatch(newResults, newIdx);
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
		event.target.value = '';
	};

	const handleExport = (format: 'md' | 'pdf') => {
		if (format === 'pdf') {
			handleExportToPDF();
			return;
		}

		let contentToExport = documentContent;
		if (!contentToExport && editor) {
			contentToExport = editor.getHTML();
		}
		if (!contentToExport) {
			alert('No content to export');
			return;
		}

		const convertToMarkdown = (html: string): string => {
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = html;

			// Basic HTML to Markdown conversion
			const markdown = html
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
				.replace(/<[^>]*>/g, '')
				.replace(/\n{3,}/g, '\n\n')
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
		navigator.clipboard.writeText("Document content copied");
		console.log("Document copied to clipboard");
	};

	// Undo/Redo state
	const canUndo = !!editor?.can().undo();
	const canRedo = !!editor?.can().redo();

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
								disabled={!canUndo}
								className="h-7 w-7 p-0 text-gray-600 disabled:opacity-40 hover:bg-white hover:shadow-sm"
								title="Undo"
							>
								<Undo2 className="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleRedo}
								disabled={!canRedo}
								className="h-7 w-7 p-0 text-gray-600 disabled:opacity-40 hover:bg-white hover:shadow-sm"
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
								onClick={() => setShowSearch((s) => !s)}
								className={`h-7 w-7 p-0 hover:bg-white hover:shadow-sm ${showSearch ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}
								title="Search"
							>
								<SearchIcon className="w-4 h-4" />
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
							<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<Input
								type="text"
								placeholder="Search in document..."
								value={searchQuery}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										// If no results yet, run search first, then focus the first hit
										if (!searchResults.length) {
											const results = findAllMatches(searchQuery);
											if (results.length) {
												// Shift+Enter = previous, Enter = next from the first
												if (e.shiftKey) {
													highlightCurrentMatch(results, results.length - 1);
												} else {
													highlightCurrentMatch(results, 0); // first
													navigateMatch('next');             // immediately move to next for Enter
												}
											}
										} else {
											// We already have results: navigate prev/next
											if (e.shiftKey) {
												navigateMatch('prev');
											} else {
												navigateMatch('next');
											}
										}
									}
								}}
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
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										// This already replaces current and advances to the next match
										handleReplaceOne();
									}
								}}
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
