import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as lucideReact from "lucide-react";

interface DocsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DocsHelp({ isOpen, onClose }: DocsHelpProps) {
    const [activeTab, setActiveTab] = useState("basics");

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[74vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Document Editor Help</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basics">Basics</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-2 ">
                        {/* Basics Tab */}
                        <TabsContent value="basics" className="space-y-6 mt-0">
                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.FileText className="w-5 h-5 mr-2 text-blue-600" />
                                    Getting Started
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Creating Documents:</strong> Click on "New Document" from the dashboard to start a new document. Your work is automatically saved every few seconds.
                                    </p>
                                    <p>
                                        <strong>Document Title:</strong> Click on the document title at the top to rename it. Press Enter or click outside to save the new name.
                                    </p>
                                    <p>
                                        <strong>Auto-Save:</strong> All changes are automatically saved to the cloud. Look for the "Synced" indicator in the header.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.Search className="w-5 h-5 mr-2 text-blue-600" />
                                    Search & Navigate
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Search:</strong> Click the search icon or press <kbd className="px-2 py-1 bg-gray-100 rounded border">Ctrl+F</kbd> to search for text in your document.
                                    </p>
                                    <p>
                                        <strong>Find & Replace:</strong> Use the replace field in the search bar to replace text. Press Enter or click "Replace" to replace one instance, or "Replace All" to replace all instances.
                                    </p>
                                    <p>
                                        <strong>Navigation Pane:</strong> Enable the Navigation Pane from Tools menu to see a list of all headings and quickly jump to any section.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.Save className="w-5 h-5 mr-2 text-blue-600" />
                                    Import & Export
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Import Markdown:</strong> Click File → Import to import Markdown (.md) files into your document.
                                    </p>
                                    <p>
                                        <strong>Export:</strong> Click File → Export to save your document as Markdown (.md) or PDF (.pdf).
                                    </p>
                                    <p>
                                        <strong>Print:</strong> Use the Print button or press <kbd className="px-2 py-1 bg-gray-100 rounded border">Ctrl+P</kbd> to print your document.
                                    </p>
                                </div>
                            </section>
                        </TabsContent>

                        {/* Advanced Tab */}
                        <TabsContent value="advanced" className="space-y-6 mt-0">
                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.Table className="w-5 h-5 mr-2 text-blue-600" />
                                    Tables
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Insert Table:</strong> Click the table button in the toolbar to insert a new table. Choose the number of rows and columns.
                                    </p>
                                    <p>
                                        <strong>Modify Table:</strong> Right-click on a table cell to add/delete rows or columns, merge cells, or change cell backgrounds.
                                    </p>
                                    <p>
                                        <strong>Table Navigation:</strong> Use Tab to move to the next cell, Shift+Tab to move to the previous cell.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.Link className="w-5 h-5 mr-2 text-blue-600" />
                                    Links
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Add Link:</strong> Select text and press <kbd className="px-2 py-1 bg-gray-100 rounded border">Ctrl+K</kbd> or click the link button. Enter the URL and click OK.
                                    </p>
                                    <p>
                                        <strong>Edit Link:</strong> Click on a link and use the link toolbar to edit or remove it.
                                    </p>
                                    <p>
                                        <strong>Link Preview:</strong> Hover over a link to see a preview of the destination page.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.Code className="w-5 h-5 mr-2 text-blue-600" />
                                    Code & Diagrams
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Inline Code:</strong> Wrap text in backticks or use the inline code button for short code snippets.
                                    </p>
                                    <p>
                                        <strong>Code Blocks:</strong> Click the code block button to insert a multi-line code block with syntax highlighting.
                                    </p>
                                    <p>
                                        <strong>Mermaid Diagrams:</strong> Create flowcharts, sequence diagrams, and more using Mermaid syntax in code blocks.
                                    </p>
                                </div>
                            </section>


                        </TabsContent>

                        {/* Collaboration Tab */}
                        <TabsContent value="collaboration" className="space-y-6 mt-0">
                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.Share2 className="w-5 h-5 mr-2 text-blue-600" />
                                    Sharing & Collaboration
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Share Document:</strong> Click the Share button in the header to generate a shareable link.
                                    </p>
                                    <p>
                                        <strong>Version History:</strong> Click the History tab to view and restore previous versions of your document.
                                    </p>
                                    <p>
                                        <strong>Templates:</strong> Save frequently used document structures as templates using "Save as Template" from the More Options menu.
                                    </p>
                                    <p>
                                        <strong>Make a Copy:</strong> Create a duplicate of your document using "Make a Copy" from the More Options menu.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <lucideReact.FileText className="w-5 h-5 mr-2 text-blue-600" />
                                    AI Assistant
                                </h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <p>
                                        <strong>Open AI Chat:</strong> Click the purple AI button in the bottom-right corner to open the AI assistant.
                                    </p>
                                    <p>
                                        <strong>Content Generation:</strong> Ask the AI to write, improve, or expand sections of your document.
                                    </p>
                                    <p>
                                        <strong>Review Changes:</strong> When AI makes changes, review them and click Accept, Reject, or Regenerate.
                                    </p>
                                    <p>
                                        <strong>Context-Aware:</strong> The AI understands your document content and can help with writing, editing, and formatting.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold mb-3">Tips & Best Practices</h3>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Use headings to create a clear document structure</li>
                                        <li>Save important documents as templates for reuse</li>
                                        <li>Enable the Navigation Pane for long documents</li>
                                        <li>Use keyboard shortcuts to work faster</li>
                                        <li>Check version history before making major changes</li>
                                        <li>Use the AI assistant to overcome writer's block</li>
                                    </ul>
                                </div>
                            </section>
                        </TabsContent>
                    </div>
                </Tabs>


            </DialogContent>
        </Dialog>
    );
}
