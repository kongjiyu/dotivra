import React, { useState, useCallback, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Copy, ChevronDown, Eye, Code } from "lucide-react";
import { cx } from "class-variance-authority";
import mermaid from "mermaid";

const PROGRAMMING_LANGUAGES = [
    { value: "plaintext", label: "Plain Text" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
    { value: "csharp", label: "C#" },
    { value: "php", label: "PHP" },
    { value: "ruby", label: "Ruby" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "swift", label: "Swift" },
    { value: "kotlin", label: "Kotlin" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "scss", label: "SCSS" },
    { value: "json", label: "JSON" },
    { value: "xml", label: "XML" },
    { value: "yaml", label: "YAML" },
    { value: "markdown", label: "Markdown" },
    { value: "mermaid", label: "Mermaid" },
    { value: "bash", label: "Bash" },
    { value: "shell", label: "Shell" },
    { value: "sql", label: "SQL" },
    { value: "docker", label: "Dockerfile" },
];

export const CodeBlockNodeView: React.FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
    editor,
    getPos,
}) => {
    const [copied, setCopied] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [isPreviewMode, setIsPreviewMode] = useState(
        node.attrs.language === "mermaid"
    );
    const [mermaidError, setMermaidError] = useState<string | null>(null);
    const [mermaidSvg, setMermaidSvg] = useState<string>("");

    const codeRef = useRef<HTMLPreElement>(null);
    const mermaidRef = useRef<HTMLDivElement>(null);

    // Theme handling
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => setIsDarkTheme(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: isDarkTheme ? "dark" : "default",
            securityLevel: "loose",
            fontFamily: "monospace",
        });
    }, [isDarkTheme]);

    const handleLanguageChange = useCallback(
        (language: string) => {
            updateAttributes({ language });
            setOpen(false);
            setSearchValue("");
            setIsPreviewMode(language === "mermaid");
        },
        [updateAttributes]
    );

    const handleCopy = useCallback(async () => {
        try {
            const codeText = node.textContent || "";
            if (codeText.trim()) {
                await navigator.clipboard.writeText(codeText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (err) {
            console.error("Failed to copy code:", err);
        }
    }, [node]);

    const renderMermaid = useCallback(async () => {
        if (node.attrs.language !== "mermaid") return;
        try {
            const code = node.textContent || "";
            if (!code.trim()) {
                setMermaidSvg("");
                setMermaidError(null);
                return;
            }
            const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setMermaidError(null);
            const { svg } = await mermaid.render(id, code);
            setMermaidSvg(svg);
        } catch (error) {
            console.error("Mermaid render error:", error);
            setMermaidError(
                error instanceof Error ? error.message : "Failed to render diagram"
            );
            setMermaidSvg("");
        }
    }, [node.textContent, node.attrs.language]);

    const togglePreview = useCallback(async () => {
        if (!isPreviewMode) await renderMermaid();
        setIsPreviewMode(!isPreviewMode);
    }, [isPreviewMode, renderMermaid]);

    // Watch for content updates when previewing Mermaid
    useEffect(() => {
        if (isPreviewMode && node.attrs.language === "mermaid") {
            const timer = setTimeout(() => renderMermaid(), 200);
            return () => clearTimeout(timer);
        }
    }, [isPreviewMode, node.textContent, renderMermaid]);

    const filtered = PROGRAMMING_LANGUAGES.filter((l) =>
        l.label.toLowerCase().includes(searchValue.toLowerCase())
    );
    const currentLang =
        PROGRAMMING_LANGUAGES.find((l) => l.value === node.attrs.language)
            ?.label || "Select language";

    return (
        <NodeViewWrapper
            className={cx(
                "code-block-wrapper relative rounded-md overflow-hidden",
                selected ? "ring-2 ring-blue-500/40" : ""
            )}
            data-language={node.attrs.language}
        >
            {/* Toolbar (non-editable) */}
            <div
                className={cx(
                    "flex items-center justify-between px-3 py-2 border-b text-sm",
                    isDarkTheme
                        ? "bg-gray-800 border-gray-700 text-gray-200"
                        : "bg-gray-100 border-gray-300 text-gray-800"
                )}
                contentEditable={false}
            >
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cx(
                                "w-40 justify-between h-8",
                                isDarkTheme
                                    ? "bg-gray-700 border-gray-600 text-gray-200"
                                    : "bg-white border-gray-300 text-gray-800"
                            )}
                        >
                            {currentLang}
                            <ChevronDown className="w-4 h-4 opacity-60" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className={cx(
                            "w-[220px] p-0",
                            isDarkTheme ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
                        )}
                    >
                        <div className="p-3">
                            <Input
                                placeholder="Search..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                className={cx(
                                    "mb-2 h-8 text-sm",
                                    isDarkTheme
                                        ? "bg-gray-700 border-gray-600 text-gray-200"
                                        : "bg-white border-gray-300 text-gray-900"
                                )}
                            />
                            <div className="max-h-56 overflow-y-auto">
                                {filtered.map((lang) => (
                                    <div
                                        key={lang.value}
                                        className={cx(
                                            "px-3 py-2 text-sm cursor-pointer rounded-md",
                                            node.attrs.language === lang.value
                                                ? "bg-blue-600 text-white"
                                                : isDarkTheme
                                                    ? "text-gray-200 hover:bg-gray-700"
                                                    : "text-gray-800 hover:bg-gray-100"
                                        )}
                                        onClick={() => handleLanguageChange(lang.value)}
                                    >
                                        <span>{lang.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="flex items-center gap-2">
                    {node.attrs.language === "mermaid" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={togglePreview}
                            className={cx(
                                "h-8 px-2 gap-1 text-xs",
                                isDarkTheme
                                    ? "text-gray-200 hover:bg-gray-700"
                                    : "text-gray-700 hover:bg-gray-200"
                            )}
                            contentEditable={false}
                        >
                            {isPreviewMode ? (
                                <>
                                    <Code className="w-4 h-4" /> Code
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4" /> Preview
                                </>
                            )}
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className={cx(
                            "h-8 px-2 gap-1 text-xs",
                            isDarkTheme
                                ? "text-gray-200 hover:bg-gray-700"
                                : "text-gray-700 hover:bg-gray-200"
                        )}
                        contentEditable={false}
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied!" : "Copy"}
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
                                "mermaid-error p-4 rounded-md text-sm",
                                isDarkTheme
                                    ? "bg-red-900/20 border border-red-600 text-red-400"
                                    : "bg-red-50 border border-red-300 text-red-700"
                            )}>
                                <div className="flex items-start gap-2 mb-2">
                                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div className="flex-1" contentEditable={false}>
                                        <div className="font-semibold mb-1">Mermaid Syntax Error</div>
                                        <div className="font-mono text-xs mb-3 opacity-90">{mermaidError}</div>
                                        <div className="text-xs opacity-75 space-y-1">
                                            <p><strong>Common fixes:</strong></p>
                                            <ul className="list-disc list-inside ml-2 space-y-0.5">
                                                <li>Check for typos in diagram type (flowchart, sequenceDiagram, etc.)</li>
                                                <li>Verify all node IDs and connections are valid</li>
                                                <li>Ensure proper syntax for your diagram type</li>
                                                <li>Switch to Code view to edit the diagram</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
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
    );
};
