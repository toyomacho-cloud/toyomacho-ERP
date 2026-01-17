/**
 * Label Configuration Management
 * Handles saving/loading label design configuration
 */

const DEFAULT_CONFIG = {
    version: '1.0',
    elements: {
        logo: { visible: true, fontSize: 8 },
        provider: { visible: true, fontSize: 6, bold: true },
        reference: { visible: true, fontSize: 14, bold: true },
        description: { visible: true, fontSize: 8, bold: false },
        location: { visible: true, fontSize: 6, bold: true },
        contact: { visible: true, fontSize: 5, bold: false },
        price: { visible: true, fontSize: 8, bold: true }
    },
    layout: {
        width: 5.6,
        height: 3.3
    }
};

/**
 * Get default configuration
 */
export function getDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/**
 * Save configuration to localStorage
 */
export function saveConfig(config) {
    try {
        localStorage.setItem('labelConfig', JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
}

/**
 * Load configuration from localStorage
 */
export function loadConfig() {
    try {
        const saved = localStorage.getItem('labelConfig');
        if (saved) {
            const config = JSON.parse(saved);
            // Merge with defaults to ensure all properties exist
            return {
                ...DEFAULT_CONFIG,
                ...config,
                elements: {
                    ...DEFAULT_CONFIG.elements,
                    ...(config.elements || {})
                }
            };
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
    return getDefaultConfig();
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
    try {
        localStorage.removeItem('labelConfig');
        return getDefaultConfig();
    } catch (error) {
        console.error('Error resetting config:', error);
        return getDefaultConfig();
    }
}
