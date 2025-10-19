import React from 'react';
import { Loader2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  details?: string;
}

interface AIGenerationProgressModalProps {
  isOpen: boolean;
  repositoryName: string;
  steps: GenerationStep[];
  currentStep?: string;
  onCancel?: () => void;
}

const AIGenerationProgressModal: React.FC<AIGenerationProgressModalProps> = ({
  isOpen,
  repositoryName,
  steps,
  currentStep,
  onCancel
}) => {
  if (!isOpen) return null;

  const getStepIcon = (step: GenerationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStepTextColor = (step: GenerationStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-700';
      case 'in-progress':
        return 'text-blue-700 font-medium';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Loader2 className="w-6 h-6 animate-spin" />
              <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Document Generation</h3>
              <p className="text-sm text-blue-100">Analyzing {repositoryName}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-6 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start space-x-3">
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${getStepTextColor(step)}`}>
                    {step.label}
                  </div>
                  
                  {/* Step Details */}
                  {step.details && step.status === 'in-progress' && (
                    <div className="mt-1 text-xs text-gray-500 animate-pulse">
                      {step.details}
                    </div>
                  )}
                  
                  {step.details && step.status === 'completed' && (
                    <div className="mt-1 text-xs text-gray-500">
                      {step.details}
                    </div>
                  )}

                  {/* Progress Bar for In-Progress Step */}
                  {step.status === 'in-progress' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full animate-pulse-progress"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Thinking Animation */}
          {currentStep && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-blue-700 font-medium">
                  AI is thinking...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              This may take 10-30 seconds depending on repository size
            </p>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for progress bar animation */}
      <style>{`
        @keyframes pulse-progress {
          0%, 100% {
            width: 30%;
            transform: translateX(0);
          }
          50% {
            width: 70%;
            transform: translateX(100%);
          }
        }
        
        .animate-pulse-progress {
          animation: pulse-progress 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AIGenerationProgressModal;
