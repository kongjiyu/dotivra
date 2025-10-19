/**
 * Utility functions for managing document tools preferences in cookies
 */

interface ToolsPreferences {
    showToolbar: boolean;
    showWordCount: boolean;
    showNavigationPane: boolean;
    toolbarPosition?: { x: number; y: number } | null;
    wordCountPosition?: { x: number; y: number } | null;
}

const COOKIE_NAME = 'dotivra_document_tools_prefs';
const COOKIE_EXPIRY_DAYS = 365;

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Set a cookie with name, value, and expiry days
 */
function setCookie(name: string, value: string, days: number) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

/**
 * Load tools preferences from cookies
 */
export function loadToolsPreferences(): ToolsPreferences {
    const defaultPrefs: ToolsPreferences = {
        showToolbar: true,
        showWordCount: false,
        showNavigationPane: false,
        toolbarPosition: null,
        wordCountPosition: null,
    };

    try {
        const cookieValue = getCookie(COOKIE_NAME);
        if (!cookieValue) return defaultPrefs;

        const prefs = JSON.parse(decodeURIComponent(cookieValue));
        return {
            ...defaultPrefs,
            ...prefs,
        };
    } catch (error) {
        console.error('Error loading tools preferences:', error);
        return defaultPrefs;
    }
}

/**
 * Save tools preferences to cookies
 */
export function saveToolsPreferences(prefs: Partial<ToolsPreferences>) {
    try {
        const currentPrefs = loadToolsPreferences();
        const updatedPrefs = {
            ...currentPrefs,
            ...prefs,
        };

        const cookieValue = encodeURIComponent(JSON.stringify(updatedPrefs));
        setCookie(COOKIE_NAME, cookieValue, COOKIE_EXPIRY_DAYS);
    } catch (error) {
        console.error('Error saving tools preferences:', error);
    }
}

/**
 * Update a single preference
 */
export function updateToolPreference<K extends keyof ToolsPreferences>(
    key: K,
    value: ToolsPreferences[K]
) {
    saveToolsPreferences({ [key]: value });
}

/**
 * Clear all preferences
 */
export function clearToolsPreferences() {
    setCookie(COOKIE_NAME, '', -1);
}
