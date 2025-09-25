import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AIActionContainer from '@/components/document/AIActionContainer';

type OperationType = 'addition' | 'editing' | 'removal' | 'replacement';

export default function AIEditingDemo() {
    const [showAI, setShowAI] = useState(false);
    const [operationType, setOperationType] = useState<OperationType>('addition');
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleAccept = () => {
        console.log('AI operation accepted:', operationType);
        setShowAI(false);
    };

    const handleReject = () => {
        console.log('AI operation rejected:', operationType);
        setShowAI(false);
    };

    const handleRegenerate = () => {
        setIsRegenerating(true);
        setTimeout(() => setIsRegenerating(false), 2000);
    };

    const triggerAIOperation = (type: OperationType) => {
        setOperationType(type);
        setShowAI(true);
    };

    const getContentSummary = (type: OperationType) => {
        switch (type) {
            case 'addition':
                return 'Adding new paragraph about AI capabilities';
            case 'editing':
                return 'Editing existing content for clarity';
            case 'removal':
                return 'Removing outdated information';
            case 'replacement':
                return 'Replacing section with updated content';
            default:
                return '';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-6">
            <Card className="p-6">
                <h1 className="text-2xl font-bold mb-4">Enhanced AI Editing Demo</h1>
                <p className="text-gray-600 mb-6">
                    Test the enhanced AI editing functionality with different operation types and visual feedback.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Button
                        onClick={() => triggerAIOperation('addition')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        Test Addition
                    </Button>
                    <Button
                        onClick={() => triggerAIOperation('editing')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Test Editing
                    </Button>
                    <Button
                        onClick={() => triggerAIOperation('removal')}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        Test Removal
                    </Button>
                    <Button
                        onClick={() => triggerAIOperation('replacement')}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        Test Replacement
                    </Button>
                </div>

                {/* Demo Content Area */}
                <div className="border rounded-lg p-6 bg-gray-50 min-h-[200px]">
                    <h3 className="text-lg font-semibold mb-4">Sample Document Content</h3>

                    <div className="space-y-4">
                        <p className="ai-addition-content">
                            This is an example of <strong>AI-added content</strong> with green highlighting.
                            It shows how new content appears with distinct visual feedback.
                        </p>

                        <p className="ai-editing-content">
                            This is an example of <strong>AI-edited content</strong> with blue highlighting.
                            It demonstrates how modified content is visually distinguished.
                        </p>

                        <p className="ai-removal-content">
                            This is an example of <strong>AI-removed content</strong> with red highlighting.
                            It shows content that has been marked for deletion.
                        </p>

                        <p className="ai-replacement-content">
                            This is an example of <strong>AI-replaced content</strong> with orange highlighting.
                            It demonstrates content that has been completely replaced.
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-sm text-gray-500">
                    <h4 className="font-semibold mb-2">Features Demonstrated:</h4>
                    <ul className="space-y-1">
                        <li>• Operation-specific color coding and messaging</li>
                        <li>• Accept/Reject controls with keyboard shortcuts</li>
                        <li>• Visual feedback for different content modification types</li>
                        <li>• Responsive UI positioning and animation</li>
                        <li>• Content summary descriptions for user context</li>
                    </ul>
                </div>
            </Card>

            {/* AI Action Container */}
            <AIActionContainer
                show={showAI}
                onAccept={handleAccept}
                onReject={handleReject}
                onRegenerate={handleRegenerate}
                isRegenerating={isRegenerating}
                chatSidebarOpen={false}
                operationType={operationType}
                affectedContentSummary={getContentSummary(operationType)}
            />
        </div>
    );
}