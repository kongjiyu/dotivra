import { buildApiUrl } from '@/lib/apiConfig';

interface LinkMetadata {
    title?: string;
    description?: string;
    favicon?: string;
    url: string;
    image?: string;
    siteName?: string;
    error?: string;
}

class LinkPreviewService {
    private cache = new Map<string, LinkMetadata>();
    private pendingRequests = new Map<string, Promise<LinkMetadata>>();

    /**
     * Fetch metadata for a given URL
     */
    async fetchMetadata(url: string): Promise<LinkMetadata> {
        // Check cache first
        if (this.cache.has(url)) {
            return this.cache.get(url)!;
        }

        // Check if request is already in progress
        if (this.pendingRequests.has(url)) {
            return this.pendingRequests.get(url)!;
        }

        // Create new request
        const request = this.fetchMetadataFromServer(url);
        this.pendingRequests.set(url, request);

        try {
            const metadata = await request;
            this.cache.set(url, metadata);
            return metadata;
        } finally {
            this.pendingRequests.delete(url);
        }
    }

    /**
     * Fetch metadata from server/proxy endpoint
     */
    private async fetchMetadataFromServer(url: string): Promise<LinkMetadata> {
        try {
            // First try the server endpoint with timeout using AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(buildApiUrl(`api/link-preview?url=${encodeURIComponent(url)}`), {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const metadata = await response.json();
            
            // Validate response has meaningful data
            if (!metadata.title || metadata.title === url) {
                throw new Error('No meaningful metadata received');
            }

            return {
                ...metadata,
                url,
                favicon: metadata.favicon || this.generateFaviconUrl(url)
            };
        } catch (error) {
            // Generate rich client-side fallback
            const domain = this.extractDomainFromUrl(url);
            
            return {
                url,
                title: this.getWebsiteDisplayName(domain),
                description: `Visit ${this.getWebsiteDisplayName(domain)} to explore their content`,
                siteName: this.getWebsiteDisplayName(domain),
                favicon: this.generateFaviconUrl(url)
            };
        }
    }

    /**
     * Get a more user-friendly website name
     */
    private getWebsiteDisplayName(domain: string): string {
        const cleanDomain = domain.replace(/^www\./, '');
        
        // Common website mappings for better display names
        const knownSites: { [key: string]: string } = {
            'github.com': 'GitHub',
            'stackoverflow.com': 'Stack Overflow',
            'youtube.com': 'YouTube',
            'linkedin.com': 'LinkedIn',
            'twitter.com': 'Twitter',
            'medium.com': 'Medium',
            'reddit.com': 'Reddit',
            'facebook.com': 'Facebook',
            'instagram.com': 'Instagram',
            'wikipedia.org': 'Wikipedia',
            'google.com': 'Google',
            'microsoft.com': 'Microsoft',
            'apple.com': 'Apple',
            'amazon.com': 'Amazon',
            'netflix.com': 'Netflix'
        };

        return knownSites[cleanDomain] || this.capitalizeFirst(cleanDomain);
    }

    /**
     * Capitalize first letter of each word
     */
    private capitalizeFirst(str: string): string {
        return str.split('.')[0] // Take only the domain name part
            .split('-').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' ');
    }

    /**
     * Extract domain from URL for fallback title
     */
    private extractDomainFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }

    /**
     * Generate favicon URL from domain
     */
    private generateFaviconUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
        } catch {
            return '/favicon.ico'; // Fallback to generic favicon
        }
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        this.pendingRequests.clear();
    }

    /**
     * Get cache size for debugging
     */
    getCacheSize(): number {
        return this.cache.size;
    }
}

// Export singleton instance
export const linkPreviewService = new LinkPreviewService();
export default linkPreviewService;