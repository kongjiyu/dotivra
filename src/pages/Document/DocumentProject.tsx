import DocumentLayout from "./DocumentLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Download } from "lucide-react";
import { useDocument } from "@/context/DocumentContext";
import SimpleShare from "@/components/Document/SimpleShare";
import ImportModal from "@/components/Document/ImportModal";

export default function DocumentProject() {
    const { documentTitle, setDocumentContent } = useDocument();

    const handleProjectImport = (content: string, title: string) => {
        setDocumentContent(content);
        console.log(`Document "${title}" imported to project`);
    };

    return (
        <DocumentLayout showDocumentMenu={false}>
            <div className="h-full flex flex-col space-y-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Project: Aurora Analytics
                        </CardTitle>
                        <CardDescription>All documents and resources for the Aurora Analytics initiative</CardDescription>
                    </CardHeader>
                </Card>

                <Card className="flex-1 overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg">Documents</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                New Document
                            </Button>
                            <ImportModal onImport={handleProjectImport} />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-3">
                        <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-blue-900">{documentTitle}</h4>
                                    <p className="text-sm text-blue-700">Currently editing  Last saved 2 mins ago</p>
                                </div>
                                <div className="flex gap-2">
                                    <SimpleShare
                                        documentTitle={documentTitle}
                                        documentId="current-doc-123"
                                    />
                                    <Button variant="ghost" size="sm" title="Export document">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">Market Research Notes</h4>
                                    <p className="text-sm text-gray-600">Updated 3 days ago</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">Release Plan v1.2</h4>
                                    <p className="text-sm text-gray-600">Updated 1 week ago</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DocumentLayout>
    );
}
