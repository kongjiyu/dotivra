import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { marked } from 'marked';
import mammoth from 'mammoth';
import mermaid from 'mermaid';
import { Input } from "@/components/ui/input";
import { addDividersAfterHeadings } from "@/utils/addDividersAfterHeadings";
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
	Copy,
	Wrench,
	HelpCircle,
	Menu,
	FileBarChart,
	Keyboard,
	BookOpen,
	Settings,
	Sparkles,
} from "lucide-react";

// Import new components
// import NavigationPane from "./NavigationPane"; // Now integrated in DocumentLayout 3-column grid
import DocsHelp from "./DocsHelp";
import ShortcutKeys from "./ShortcutKeys";
import WordCount from "./WordCount";
import ZoomControl from "./ZoomControl";
import ImportConfirmationModal from "./ImportConfirmationModal";

// Import preferences utility
import {
	loadToolsPreferences,
	updateToolPreference,
} from "@/utils/documentToolsPreferences";

// Import document context
import { useDocument } from "@/context/DocumentContext";
import { useAuth } from "@/context/AuthContext";
import { aiService } from "@/services/aiService";
import { fetchDocument } from "@/services/apiService";
import { showNotification } from "@/services/documentService";
import { FirestoreService } from "@/../firestoreService";

// Import Mermaid export utilities
import { processMermaidForExport } from "@/utils/mermaidExportUtils";

// NEW: ProseMirror bits for decorations
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Editor } from "@tiptap/react";

interface DocumentMenuProps {
	onUpdate?: (content: string) => void;
	onSaveAsTemplate?: () => void;
	onCopyDocument?: () => void;
	documentTitle?: string;
	editor?: Editor; // TipTap editor instance
	documentContent?: string; // Current document content for PDF export
	context?: 'main' | 'project'; // To distinguish between main menu and project tab imports
	currentDocument?: any; // Current document data for template/copy operations
	onToolbarToggle?: (show: boolean) => void; // Callback when toolbar visibility changes
	onNavigationPaneToggle?: (show: boolean) => void; // Callback when navigation pane visibility changes
	isSummaryPage?: boolean; // Whether we're on the summary page
	documentId?: string; // Document ID for summary generation
}

export default function DocumentMenu({
	onUpdate,
	onSaveAsTemplate,
	onCopyDocument,
	documentTitle = "Untitled Document",
	editor,
	documentContent,
	context = 'main',
	currentDocument,
	onToolbarToggle,
	onNavigationPaneToggle,
	isSummaryPage = false,
	documentId,
}: DocumentMenuProps) {
	const navigate = useNavigate();
	// Get context state for navigation pane
	const { showNavigationPane, setShowNavigationPane: setContextNavigationPane } = useDocument();

	// Document menu state
	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [showImportOptions, setShowImportOptions] = useState(false);
	const [searchMatches, setSearchMatches] = useState<number>(0);
	const [currentMatch, setCurrentMatch] = useState<number>(0);
	const [searchResults, setSearchResults] = useState<Array<{ from: number, to: number }>>([]);
	const [replaceText, setReplaceText] = useState<string>("");

	// New Tools & Help state - Initialize from cookies immediately
	const initialPrefs = loadToolsPreferences();
	const [showToolsMenu, setShowToolsMenu] = useState(false);
	const [showHelpMenu, setShowHelpMenu] = useState(false);
	// Note: showNavigationPane now comes from context, not local state
	const [showWordCount, setShowWordCount] = useState(initialPrefs.showWordCount);
	const [showDocsHelp, setShowDocsHelp] = useState(false);
	const [showShortcutKeys, setShowShortcutKeys] = useState(false);
	const [showToolbar, setShowToolbar] = useState(initialPrefs.showToolbar);

	// Import confirmation modal state
	const [showImportConfirm, setShowImportConfirm] = useState(false);
	const [pendingImport, setPendingImport] = useState<{ content: string; fileName: string } | null>(null);

	// Summary generation state
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
	const { user } = useAuth();
	const { setSummaryContent } = useDocument();

	// Save preferences when they change
	useEffect(() => {
		updateToolPreference('showToolbar', showToolbar);
		// Notify parent component about toolbar visibility change
		if (onToolbarToggle) {
			onToolbarToggle(showToolbar);
		}
	}, [showToolbar, onToolbarToggle]);

	useEffect(() => {
		updateToolPreference('showWordCount', showWordCount);
	}, [showWordCount]);

	useEffect(() => {
		updateToolPreference('showNavigationPane', showNavigationPane);
		// Notify parent component about navigation pane visibility change
		if (onNavigationPaneToggle) {
			onNavigationPaneToggle(showNavigationPane);
		}
	}, [showNavigationPane, onNavigationPaneToggle]);

	// Add keyboard shortcut handlers for Ctrl+F, Ctrl+H, Ctrl+P
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ctrl+F or Cmd+F - Open Search
			if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
				e.preventDefault();
				setShowSearch(true);
			}
			// Ctrl+H or Cmd+H - Open Search (same as Ctrl+F since replace is always visible)
			if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
				e.preventDefault();
				setShowSearch(true);
			}
			// Ctrl+P or Cmd+P - Print
			if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
				e.preventDefault();
				handlePrint();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [showSearch]);

	// === NEW: Decoration plugin wiring ===
	const searchPluginKeyRef = useRef(new PluginKey(`search-highlights-${Math.random().toString(36).substring(2)}`));
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

		// Check if plugin with this key is already registered
		const key = searchPluginKeyRef.current;
		const existingPlugin = editor.state.plugins.find((plugin: any) => plugin.spec?.key === key);
		if (existingPlugin) {
			console.warn('Plugin with key already exists, skipping registration');
			return;
		}

		searchPluginRef.current = new Plugin({
			key,
			state: {
				init: (_config) => DecorationSet.empty,
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
				try {
					editor.unregisterPlugin(searchPluginKeyRef.current);
				} catch (error) {
					console.warn('Error unregistering plugin:', error);
				}
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

	const handleGenerateSummary = async () => {
		if (!documentId || !user?.uid) {
			showNotification("Document ID or user not found", "error");
			return;
		}

		setIsGeneratingSummary(true);

		try {
			// Fetch the full document content
			const docData = await fetchDocument(documentId);
			if (!docData || !docData.Content) {
				throw new Error('Document content not found');
			}

			// Generate summary using AI
			const summary = await aiService.summarizeContent(docData.Content);

			if (!summary) {
				throw new Error('Failed to generate summary');
			}

			// Update summary in Firebase
			await FirestoreService.updateDocument(documentId, { Summary: summary });

			// Update local state
			setSummaryContent(summary);

			showNotification("Document summary generated successfully", "success");

		} catch (error) {
			console.error('Error generating summary:', error);
			showNotification(
				error instanceof Error ? error.message : 'Failed to generate summary',
				"error"
			);
		} finally {
			setIsGeneratingSummary(false);
		}
	};

	const handlePrint = async () => {
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
			console.log('[Print] Starting print process...');

			// Process Mermaid diagrams first
			const processedContent = await processMermaidForExport(contentToPrint);
			console.log('[Print] Mermaid diagrams processed');

			// --- STEP 1: Parse and modify HTML ---
			const parser = new DOMParser();
			const doc = parser.parseFromString(processedContent, "text/html");

			// Add "avoid-break" class to block elements
			doc.querySelectorAll("h1,h2,h3,table,ul,ol,pre,blockquote").forEach((el) => {
				el.classList.add("avoid-break");
			});

			// Process code blocks to add language headers
			doc.querySelectorAll(".code-block-wrapper, pre[class*='language-']").forEach((wrapper) => {
				// Check if it's a code-block-wrapper or a standalone pre
				const pre = wrapper.tagName === 'PRE' ? wrapper : wrapper.querySelector("pre");
				if (!pre) return;

				// Get language from data attribute or class
				let language = wrapper.getAttribute("data-language");
				if (!language) {
					const classMatch = pre.className.match(/language-(\w+)/);
					language = classMatch ? classMatch[1] : "plaintext";
				}

				// Create wrapper if it doesn't exist
				let container = wrapper.tagName === 'PRE' ? null : wrapper;
				if (!container) {
					container = doc.createElement("div");
					container.className = "code-block-wrapper";
					pre.parentNode?.insertBefore(container, pre);
					container.appendChild(pre);
				}

				// Add header with language label
				const header = doc.createElement("div");
				header.className = "code-block-header";
				header.textContent = language;
				container.insertBefore(header, pre);
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
            * { box-sizing: border-box; }
            .page-break { page-break-before: always; break-before: page; }
            .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
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

            h1, h2, h3, table, pre, blockquote, .code-block-wrapper { 
              page-break-inside: avoid !important; 
              break-inside: avoid !important; 
              page-break-after: avoid;
              break-after: avoid;
            }
            tr, img, figure { page-break-inside: avoid; break-inside: avoid; max-width: 100%; }

            table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }

            h1 { font-size: 28px; font-weight: 700; margin: 24px 0 12px; border-bottom: 2px solid #ccc; padding-bottom: 8px; }
            h2 { font-size: 24px; font-weight: 700; margin: 20px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
            h3 { font-size: 20px; font-weight: 700; margin: 18px 0 9px; }
            p  { margin: 8px 0; text-align: justify; orphans: 3; widows: 3; }
            ul, ol { margin: 8px 0; padding-left: 24px; page-break-inside: auto; }
            li { margin: 4px 0; page-break-inside: avoid; }
            
            /* Links should be inline */
            a {
              display: inline !important;
              color: #2563eb;
              text-decoration: underline;
            }
            
            code {
              font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
              font-size: 13px;
              background-color: #f3f4f6;
              color: #1f2937;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
              box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
              white-space: pre-wrap;
              word-break: break-word;
            }
            
            .code-block-wrapper {
              margin: 16px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .code-block-header {
              background-color: #000000 !important;
              color: #9cdcfe !important;
              font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
              font-size: 12px;
              font-weight: 600;
              padding: 8px 12px;
              border-radius: 6px 6px 0 0;
              text-transform: capitalize;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            /* Mermaid diagram styles */
            .mermaid-diagram-export {
              margin: 16px 0;
              padding: 16px;
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow-x: auto;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .mermaid-diagram-export svg {
              max-width: 100%;
              height: auto;
            }
            
            .mermaid-error-export {
              margin: 16px 0;
              padding: 12px;
              background: #fef2f2;
              border: 1px solid #ef4444;
              border-radius: 6px;
              color: #991b1b;
              font-family: monospace;
              page-break-inside: avoid;
            }
            
            pre {
              background-color: #000000 !important;
              color: #d4d4d4 !important;
              padding: 16px;
              border-radius: 0 0 6px 6px;
              overflow-x: auto;
              margin: 0;
              font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
              font-size: 13px;
              line-height: 1.6;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            pre code {
              background: transparent;
              border: none;
              padding: 0;
              color: inherit;
              box-shadow: none;
            }
            
            hr {
              border: none;
              border-top: 2px solid #e5e7eb;
              margin: 24px 0;
              page-break-after: avoid;
              break-after: avoid;
            }
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
		// Use the same print functionality as the print button
		await handlePrint();
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

	const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const fileName = file.name;
		const fileExtension = fileName.split('.').pop()?.toLowerCase();

		// Accept Markdown and Word documents
		if (!['md', 'docx', 'doc'].includes(fileExtension || '')) {
			alert('Please select a Markdown (.md) or Word (.docx, .doc) file');
			return;
		}

		try {
			let htmlContent: string;

			if (fileExtension === 'md') {
				// Handle Markdown files
				const markdownContent = await file.text();
				htmlContent = await marked(markdownContent);
			} else if (fileExtension === 'docx' || fileExtension === 'doc') {
				// Handle Word documents
				const arrayBuffer = await file.arrayBuffer();
				const result = await mammoth.convertToHtml({ arrayBuffer });
				htmlContent = result.value;

				if (result.messages.length > 0) {
					console.warn('Word conversion warnings:', result.messages);
				}
			} else {
				alert('Unsupported file format');
				return;
			}

			// Check if there's existing content
			const hasContent = editor && editor.getText().trim().length > 0;

			if (hasContent) {
				// Show confirmation modal
				setPendingImport({ content: htmlContent, fileName });
				setShowImportConfirm(true);
			} else {
				// No existing content, just import directly
				if (onUpdate) {
					onUpdate(htmlContent);
				}
			}
		} catch (error) {
			console.error('Error importing file:', error);
			alert('Error importing file. Please check the file format and try again.');
		}

		setShowImportOptions(false);
		event.target.value = '';
	};

	const handleImportConfirm = (action: 'overwrite' | 'append') => {
		if (!pendingImport) return;

		if (action === 'overwrite') {
			// Replace all content
			if (onUpdate) {
				onUpdate(pendingImport.content);
				// Add dividers after H1/H2 headings after a short delay to ensure content is loaded
				setTimeout(() => {
					if (editor) {
						addDividersAfterHeadings(editor);
					}
				}, 100);
			}
		} else if (action === 'append') {
			// Append to existing content
			if (editor && onUpdate) {
				const currentContent = editor.getHTML();
				const combinedContent = currentContent + '<p></p>' + pendingImport.content;
				onUpdate(combinedContent);
				// Add dividers after H1/H2 headings after a short delay
				setTimeout(() => {
					if (editor) {
						addDividersAfterHeadings(editor);
					}
				}, 100);
			}
		}

		// Cleanup
		setPendingImport(null);
		setShowImportConfirm(false);
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
		setShowImportOptions(false);
	};

	const handleSaveAsTemplate = async () => {
		if (onSaveAsTemplate) {
			onSaveAsTemplate();
			return;
		}

		// If no custom handler, use the built-in service
		if (!currentDocument) {
			console.warn("No document data available for template creation");
			return;
		}

		try {
			const { saveDocumentAsTemplate, showNotification } = await import('@/services/documentService');

			// Get current content from editor
			const content = editor ? editor.getHTML() : (documentContent || '');

			// Create document object with current content
			const documentToSave = {
				...currentDocument,
				Content: content,
				DocumentName: documentTitle
			};

			const template = await saveDocumentAsTemplate(documentToSave);
			showNotification(`Template "${template.TemplateName}" created successfully!`, 'success');
		} catch (error) {
			console.error('Error creating template:', error);
			const { showNotification } = await import('@/services/documentService');
			showNotification('Failed to create template', 'error');
		}
	};

	const handleCopyDocument = async () => {
		if (onCopyDocument) {
			onCopyDocument();
			return;
		}

		// If no custom handler, use the built-in service
		if (!currentDocument) {
			console.warn("No document data available for copying");
			return;
		}

		try {
			const { copyDocument, showNotification } = await import('@/services/documentService');

			// Get current content from editor
			const content = editor ? editor.getHTML() : (documentContent || '');

			// Create document object with current content
			const documentToCopy = {
				...currentDocument,
				Content: content,
				DocumentName: documentTitle
			};

			const copiedDoc = await copyDocument(documentToCopy);
			showNotification(`Document copy "${copiedDoc.DocumentName}" created successfully!`, 'success');
		} catch (error) {
			console.error('Error copying document:', error);
			const { showNotification } = await import('@/services/documentService');
			showNotification('Failed to copy document', 'error');
		}
	};

	// Undo/Redo state
	const canUndo = !!editor?.can().undo();
	const canRedo = !!editor?.can().redo();

	return (
		<div className="bg-white border-b border-gray-200">
			<div className="px-6 py-3">
				<div className="flex items-center">
					{/* All menu items on the left side */}
					<div className="flex items-center space-x-1">
						{/* Document Actions - Undo/Redo */}
						<div className="flex items-center bg-gray-50 rounded-lg p-1 space-x-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleUndo}
								disabled={!canUndo}
								className="h-7 w-7 p-0 text-gray-600 disabled:opacity-40 hover:bg-white hover:shadow-sm"
								title="Undo (Ctrl+Z)"
							>
								<Undo2 className="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleRedo}
								disabled={!canRedo}
								className="h-7 w-7 p-0 text-gray-600 disabled:opacity-40 hover:bg-white hover:shadow-sm"
								title="Redo (Ctrl+Y)"
							>
								<Redo2 className="w-4 h-4" />
							</Button>
						</div>
						<div className="w-px h-4 bg-gray-300 mx-1"></div>

						{/* Zoom Control */}
						<ZoomControl />
						<div className="w-px h-4 bg-gray-300 mx-1"></div>
						{/* Search */}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowSearch((s) => !s)}
							className={`h-7 w-7 p-0 hover:bg-white hover:shadow-sm ${showSearch ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}
							title="Search (Ctrl+F)"
						>
							<SearchIcon className="w-4 h-4" />
						</Button>
						{/* Print */}
						<Button
							variant="ghost"
							size="sm"
							onClick={handlePrint}
							className="h-7 w-7 p-0 text-gray-600 hover:bg-white hover:shadow-sm"
							title="Print (Ctrl+P)"
						>
							<Printer className="w-4 h-4" />
						</Button>






						<div className="w-px h-4 bg-gray-300 mx-1"></div>

						{/* File Menu - Combined Import (Markdown only), Export, Make a Copy */}
						<Popover open={showImportOptions} onOpenChange={setShowImportOptions}>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-gray-600 hover:bg-gray-100"
									title="File"
								>
									<FileText className="w-4 h-4 mr-1" />
									<span className="text-xs">File</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-52 p-1">
								<div className="space-y-1">
									{/* Import Section */}

									<label className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
										<input
											type="file"
											accept=".md,.docx,.doc"
											onChange={handleImport}
											className="hidden"
										/>
										<Upload className="w-4 h-4 mr-2" />
										<span className="text-sm font-semibold">Import (.md, .docx)</span>
									</label>

									<div className="border-t border-gray-200 my-1"></div>

									{/* Export Section */}
									<div className="px-2 py-1">
										<span className="text-xs font-semibold text-gray-500 uppercase">Export</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											handleExport('md');
											setShowImportOptions(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<FileText className="w-4 h-4 mr-2" />
										<span className="text-sm">Markdown (.md)</span>
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											handleExport('pdf');
											setShowImportOptions(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<Download className="w-4 h-4 mr-2" />
										<span className="text-sm">PDF (.pdf)</span>
									</Button>

									<div className="border-t border-gray-200 my-1"></div>

									{/* Document Actions - Removed Save as Template */}
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											handleCopyDocument();
											setShowImportOptions(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<Copy className="w-4 h-4 mr-2" />
										<span className="text-sm">Make a Copy</span>
									</Button>
								</div>
							</PopoverContent>
						</Popover>						{/* Tools Menu */}
						<Popover open={showToolsMenu} onOpenChange={setShowToolsMenu}>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-gray-600 hover:bg-gray-100"
									title="Tools"
								>
									<Wrench className="w-4 h-4 mr-1" />
									<span className="text-xs">Tools</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-56 p-1">
								<div className="space-y-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setShowToolbar(!showToolbar);
											setShowToolsMenu(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<Settings className="w-4 h-4 mr-2" />
										<span className="text-sm">Toolbar</span>
										{showToolbar && (
											<span className="ml-auto text-blue-600">✓</span>
										)}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setShowWordCount(!showWordCount);
											setShowToolsMenu(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<FileBarChart className="w-4 h-4 mr-2" />
										<span className="text-sm">Word Count</span>
										{showWordCount && (
											<span className="ml-auto text-blue-600">✓</span>
										)}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											const newValue = !showNavigationPane;
											setContextNavigationPane(newValue);
											updateToolPreference('showNavigationPane', newValue);
											setShowToolsMenu(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<Menu className="w-4 h-4 mr-2" />
										<span className="text-sm">Navigation Pane</span>
										{showNavigationPane && (
											<span className="ml-auto text-blue-600">✓</span>
										)}
									</Button>

									<div className="border-t border-gray-200 my-1" />

									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setShowToolsMenu(false);
											navigate('/tools/playground');
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<Wrench className="w-4 h-4 mr-2" />
										<span className="text-sm">Tools Playground</span>
									</Button>
								</div>
							</PopoverContent>
						</Popover>

						{/* Help Menu */}
						<Popover open={showHelpMenu} onOpenChange={setShowHelpMenu}>
							<PopoverTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2 text-gray-600 hover:bg-gray-100"
									title="Help"
								>
									<HelpCircle className="w-4 h-4 mr-1" />
									<span className="text-xs">Help</span>
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-52 p-1">
								<div className="space-y-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setShowDocsHelp(true);
											setShowHelpMenu(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<BookOpen className="w-4 h-4 mr-2" />
										<span className="text-sm">Docs Help</span>
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											setShowShortcutKeys(true);
											setShowHelpMenu(false);
										}}
										className="w-full justify-start h-8 px-2 text-gray-700"
									>
										<Keyboard className="w-4 h-4 mr-2" />
										<span className="text-sm">Shortcut Keys</span>
									</Button>
								</div>
							</PopoverContent>
						</Popover>

						{/* Generate Summary Button - Only on Summary Page */}
						{isSummaryPage && (
							<>
								<div className="w-px h-4 bg-gray-300 mx-1"></div>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleGenerateSummary}
									disabled={isGeneratingSummary}
									className="h-7 px-2 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
									title="Generate AI Summary"
								>
									<Sparkles className={`text-purple-800  w-4 h-4 mr-1 ${isGeneratingSummary ? 'animate-pulse' : ''}`} />
									<span className="text-xs text-purple-800 ">
										{isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
									</span>
								</Button>
							</>
						)}
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

						{/* Match count */}
						{searchMatches > 0 && (
							<span className="text-xs text-gray-600 min-w-fit">
								{currentMatch} of {searchMatches}
							</span>
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

			{/* Navigation Pane - Now integrated in DocumentLayout 3-column grid */}
			{/* <NavigationPane
				editor={editor || null}
				isOpen={showNavigationPane}
				onClose={() => setShowNavigationPane(false)}
			/> */}

			{/* Word Count */}
			<WordCount
				editor={editor || null}
				isOpen={showWordCount}
				onClose={() => setShowWordCount(false)}
			/>

			{/* Docs Help Modal */}
			<DocsHelp
				isOpen={showDocsHelp}
				onClose={() => setShowDocsHelp(false)}
			/>

			{/* Shortcut Keys Modal */}
			<ShortcutKeys
				isOpen={showShortcutKeys}
				onClose={() => setShowShortcutKeys(false)}
			/>

			{/* Import Confirmation Modal */}
			<ImportConfirmationModal
				isOpen={showImportConfirm}
				onClose={() => {
					setShowImportConfirm(false);
					setPendingImport(null);
				}}
				fileName={pendingImport?.fileName || ''}
				onConfirm={handleImportConfirm}
			/>
		</div>
	);
}
