import React, { useState, useCallback, useEffect, useRef } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, Copy, ChevronDown, Eye, Code } from 'lucide-react'
import { cx } from 'class-variance-authority'
import mermaid from 'mermaid'

const PROGRAMMING_LANGUAGES = [
    { value: 'plaintext', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'scss', label: 'SCSS' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'mermaid', label: 'Mermaid' },
    { value: 'bash', label: 'Bash' },
    { value: 'shell', label: 'Shell' },
    { value: 'sql', label: 'SQL' },
    { value: 'docker', label: 'Dockerfile' },
]

export const CodeBlockNodeView: React.FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
    editor,
    getPos,
}) => {
    const [copied, setCopied] = useState(false)
    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        // Detect browser theme preference
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    })
    const [open, setOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [isPreviewMode, setIsPreviewMode] = useState(node.attrs.language === 'mermaid')
    const [mermaidError, setMermaidError] = useState<string | null>(null)
    const [mermaidSvg, setMermaidSvg] = useState<string>('')
    const codeRef = useRef<HTMLPreElement>(null)
    const mermaidRef = useRef<HTMLDivElement>(null)

    // Initialize Mermaid
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: isDarkTheme ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'monospace'
        })
    }, [isDarkTheme])

    // Listen for browser theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleThemeChange = (e: MediaQueryListEvent) => {
            setIsDarkTheme(e.matches)
        }

        mediaQuery.addEventListener('change', handleThemeChange)
        return () => mediaQuery.removeEventListener('change', handleThemeChange)
    }, [])

    const handleLanguageChange = useCallback((language: string) => {
        updateAttributes({ language })
        setOpen(false)
        setSearchValue('')
        // Auto-enable preview mode for Mermaid language
        if (language === 'mermaid') {
            setIsPreviewMode(true)
        }
    }, [updateAttributes])

    const handleCopy = useCallback(async () => {
        try {
            let codeText = ''

            // Try the same methods as renderMermaid to get content
            if (editor && getPos) {
                try {
                    const pos = getPos()
                    if (typeof pos === 'number') {
                        const currentNode = editor.state.doc.nodeAt(pos)
                        if (currentNode && currentNode.textContent) {
                            codeText = currentNode.textContent
                        }
                    }
                } catch (e) {
                    console.log('Could not get content from editor position for copy:', e)
                }
            }

            if (!codeText && node.textContent) {
                codeText = node.textContent
            }

            if (!codeText && node.content && node.content.size > 0) {
                const textNode = node.content.firstChild
                if (textNode && textNode.text) {
                    codeText = textNode.text
                }
            }

            if (!codeText && codeRef.current) {
                const contentElement = codeRef.current.querySelector('[contenteditable]')
                if (contentElement) {
                    codeText = contentElement.textContent || ''
                } else {
                    codeText = codeRef.current.textContent || ''
                }
            }

            if (codeText) {
                await navigator.clipboard.writeText(codeText)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }
        } catch (err) {
            console.error('Failed to copy code:', err)
        }
    }, [node, editor, getPos])

    // Render Mermaid diagram
    const renderMermaid = useCallback(async () => {
        if (node.attrs.language !== 'mermaid') return

        try {
            let codeContent = ''

            // Method 1: Get content from editor at current position
            if (editor && getPos) {
                try {
                    const pos = getPos()
                    if (typeof pos === 'number') {
                        const currentNode = editor.state.doc.nodeAt(pos)
                        if (currentNode && currentNode.textContent) {
                            codeContent = currentNode.textContent
                        }
                    }
                } catch (e) {
                    console.log('Could not get content from editor position:', e)
                }
            }

            // Method 2: Direct from node textContent
            if (!codeContent && node.textContent) {
                codeContent = node.textContent
            }

            // Method 3: From node content structure
            if (!codeContent && node.content && node.content.size > 0) {
                const textNode = node.content.firstChild
                if (textNode && textNode.text) {
                    codeContent = textNode.text
                }
            }

            // Method 4: From DOM element as fallback
            if (!codeContent && codeRef.current) {
                // Try to get from the NodeViewContent element
                const contentElement = codeRef.current.querySelector('[contenteditable]')
                if (contentElement) {
                    codeContent = contentElement.textContent || ''
                } else {
                    codeContent = codeRef.current.textContent || ''
                }
            }

            if (!codeContent.trim()) {
                setMermaidSvg('')
                setMermaidError(null)
                return
            }

            // Generate unique ID for this diagram
            const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

            // Clear previous error
            setMermaidError(null)


            // Render the diagram
            const { svg } = await mermaid.render(diagramId, codeContent)
            setMermaidSvg(svg)
        } catch (error) {
            console.error('Mermaid render error:', error)
            setMermaidError(error instanceof Error ? error.message : 'Failed to render diagram')
            setMermaidSvg('')
        }
    }, [node, editor, getPos])    // Toggle between code and preview mode
    const togglePreviewMode = useCallback(async () => {
        if (!isPreviewMode) {
            await renderMermaid()
        }
        setIsPreviewMode(!isPreviewMode)
    }, [isPreviewMode, renderMermaid])

    // Re-render Mermaid when content changes in preview mode
    useEffect(() => {
        if (isPreviewMode && node.attrs.language === 'mermaid') {
            // Add a small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                renderMermaid()
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [isPreviewMode, node.attrs.language, node.textContent, renderMermaid])

    // Additional effect to monitor content changes via MutationObserver
    useEffect(() => {
        if (isPreviewMode && node.attrs.language === 'mermaid' && codeRef.current) {
            const observer = new MutationObserver(() => {
                // Debounce the re-render
                const timer = setTimeout(() => {
                    renderMermaid()
                }, 300)

                return () => clearTimeout(timer)
            })

            observer.observe(codeRef.current, {
                childList: true,
                subtree: true,
                characterData: true
            })

            return () => {
                observer.disconnect()
            }
        }
    }, [isPreviewMode, node.attrs.language, renderMermaid])

    // Filter languages based on search
    const filteredLanguages = PROGRAMMING_LANGUAGES.filter(lang =>
        lang.label.toLowerCase().includes(searchValue.toLowerCase()) ||
        lang.value.toLowerCase().includes(searchValue.toLowerCase())
    )

    // Get current language label
    const currentLanguage = PROGRAMMING_LANGUAGES.find(lang => lang.value === node.attrs.language)?.label || 'Select language'

    return (
        <NodeViewWrapper
            className={cx(
                "code-block-wrapper relative",
                isDarkTheme ? "theme-dark" : "theme-light",
                selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
            )}
            data-language={node.attrs.language}
        >
            {/* Header with searchable language selector and copy button */}
            <div className={cx(
                "flex items-center justify-between border border-b-0 rounded-t-lg px-3 py-2",
                isDarkTheme
                    ? "bg-gray-800 border-gray-600 text-gray-200"
                    : "bg-gray-100 border-gray-200 text-gray-800"
            )}>
                <div className="flex items-center gap-2">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className={cx(
                                    "w-40 h-8 justify-between text-sm",
                                    isDarkTheme
                                        ? "border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600"
                                        : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                                )}
                            >
                                {currentLanguage}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className={cx(
                            "w-[220px] p-0",
                            isDarkTheme ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
                        )}>
                            <div className="p-3">
                                <Input
                                    placeholder="Search languages..."
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className={cx(
                                        "mb-3 h-9",
                                        isDarkTheme
                                            ? "bg-gray-700 border-gray-600 text-gray-200 placeholder:text-gray-400"
                                            : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                                    )}
                                />
                                <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                                    {filteredLanguages.map((lang) => (
                                        <div
                                            key={lang.value}
                                            className={cx(
                                                "flex items-center px-3 py-2.5 text-sm cursor-pointer rounded-md transition-colors",
                                                node.attrs.language === lang.value
                                                    ? isDarkTheme
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-blue-100 text-blue-900"
                                                    : isDarkTheme
                                                        ? "text-gray-200 hover:bg-gray-700"
                                                        : "text-gray-900 hover:bg-gray-100"
                                            )}
                                            onClick={() => handleLanguageChange(lang.value)}
                                        >
                                            <Check
                                                className={cx(
                                                    "mr-3 h-4 w-4 flex-shrink-0",
                                                    node.attrs.language === lang.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="font-medium">{lang.label}</span>
                                        </div>
                                    ))}
                                    {filteredLanguages.length === 0 && (
                                        <div className="px-3 py-2.5 text-sm text-gray-500 text-center">
                                            No languages found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mermaid Preview Toggle Button - only show for Mermaid language */}
                    {node.attrs.language === 'mermaid' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={togglePreviewMode}
                            className={cx(
                                "h-8 px-2 gap-1.5 rounded-md transition-colors",
                                isDarkTheme
                                    ? "text-gray-200 hover:bg-gray-700"
                                    : "text-gray-700 hover:bg-gray-200",
                                "border-0 focus:ring-0 focus:outline-none",
                                isPreviewMode && (isDarkTheme ? "bg-gray-700" : "bg-gray-200")
                            )}
                            aria-label={isPreviewMode ? "Switch to code view" : "Preview diagram"}
                            title={isPreviewMode ? "Switch to code view" : "Preview diagram"}
                        >
                            {isPreviewMode ? (
                                <>
                                    <Code className="w-4 h-4" />
                                    <span className="text-xs">Code</span>
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4" />
                                    <span className="text-xs">Preview</span>
                                </>
                            )}
                        </Button>
                    )}

                    {/* Copy button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className={cx(
                            "h-8 px-2 gap-1.5 rounded-md transition-colors",
                            isDarkTheme
                                ? "text-gray-200 hover:bg-gray-700"
                                : "text-gray-700 hover:bg-gray-200",
                            "border-0 focus:ring-0 focus:outline-none",
                            "focus-visible:ring-0 focus-visible:outline-none"
                        )}
                        aria-label="Copy code to clipboard"
                        title="Copy code"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>
                    </Button>
                </div>
            </div>

            {/* Code content with highlight.js styling or Mermaid preview */}
            <div className={cx(
                "relative rounded-b-lg border border-t-0",
                isDarkTheme
                    ? "bg-gray-900 border-gray-600"
                    : "bg-white border-gray-200"
            )}>
                {/* Mermaid Preview Mode */}
                {node.attrs.language === 'mermaid' && isPreviewMode ? (
                    <div className="p-4">
                        {mermaidError ? (
                            <div className={cx(
                                "mermaid-error p-3 rounded-md text-sm font-mono",
                                isDarkTheme
                                    ? "bg-red-900/20 border border-red-600 text-red-400"
                                    : "bg-red-50 border border-red-300 text-red-700"
                            )}>
                                <div className="font-semibold mb-1">Mermaid Syntax Error:</div>
                                <div>{mermaidError}</div>
                            </div>
                        ) : mermaidSvg ? (
                            <div
                                ref={mermaidRef}
                                className={cx(
                                    "mermaid-preview flex justify-center items-start p-4 rounded-md overflow-auto",
                                    isDarkTheme ? "bg-gray-800" : "bg-gray-50"
                                )}
                                contentEditable={false}
                                style={{ userSelect: 'none' }}
                                dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                            />
                        ) : (
                            <div className={cx(
                                "flex items-center justify-center p-8 text-gray-500 text-sm",
                                isDarkTheme ? "text-gray-400" : "text-gray-600"
                            )}>
                                No diagram content to preview
                            </div>
                        )}
                    </div>
                ) : (
                    /* Code Mode */
                    <pre
                        ref={codeRef}
                        className={cx(
                            "overflow-auto p-4 text-sm leading-relaxed font-mono",
                            `language-${node.attrs.language}`,
                            "hljs", // highlight.js class
                            isDarkTheme ? "hljs-dark" : "hljs-light"
                        )}
                    >
                        <NodeViewContent className={cx(
                            `language-${node.attrs.language}`,
                            "block outline-none min-h-[3rem]"
                        )} />
                    </pre>
                )}
            </div>
        </NodeViewWrapper>
    )
}