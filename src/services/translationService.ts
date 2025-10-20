/**
 * Translation Service
 * 
 * This service provides text translation functionality using Google Cloud Translate API.
 * For client-side usage, we'll use a proxy through our backend to keep API keys secure.
 */

export interface TranslationOptions {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string; // Auto-detect if not provided
}

export interface TranslationResult {
    translatedText: string;
    detectedSourceLanguage?: string;
}

// Supported languages
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
];

class TranslationService {
    private apiEndpoint = '/api/translate'; // Backend proxy endpoint

    /**
     * Translate text to target language
     */
    async translateText(options: TranslationOptions): Promise<TranslationResult> {
        try {
            // For now, use a simple client-side implementation
            // In production, this should call your backend API which uses Google Cloud Translate
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                throw new Error(`Translation failed: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Translation error:', error);
            
            // Fallback: return original text with error indicator
            return {
                translatedText: `[Translation unavailable] ${options.text}`,
                detectedSourceLanguage: options.sourceLanguage || 'unknown',
            };
        }
    }

    /**
     * Translate HTML content while preserving formatting
     */
    async translateHTML(html: string, targetLanguage: string): Promise<string> {
        try {
            // Extract text nodes while preserving HTML structure
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Get all text nodes
            const textNodes: { node: Text; text: string }[] = [];
            const walkTextNodes = (node: Node) => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                    textNodes.push({
                        node: node as Text,
                        text: node.textContent.trim(),
                    });
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    node.childNodes.forEach(walkTextNodes);
                }
            };
            doc.body.childNodes.forEach(walkTextNodes);

            // Translate all text nodes
            const translations = await Promise.all(
                textNodes.map(({ text }) =>
                    this.translateText({ text, targetLanguage })
                )
            );

            // Replace text nodes with translations
            textNodes.forEach(({ node }, index) => {
                node.textContent = translations[index].translatedText;
            });

            return doc.body.innerHTML;
        } catch (error) {
            console.error('HTML translation error:', error);
            return `<p>[Translation failed]</p>${html}`;
        }
    }

    /**
     * Get language name from code
     */
    getLanguageName(code: string): string {
        const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
        return lang?.name || code;
    }
}

export const translationService = new TranslationService();
export default translationService;
