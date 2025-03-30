/**
 * Random PDF Explorer - Main Application JavaScript
 * 
 * Contributors: Maurice Gaston, Claude https://claude.ai
 * Last Updated: March 2025
 * 
 * This file contains all the client-side functionality for the Random PDF Explorer application,
 * including PDF loading, display, history tracking, and user interface management.
 */

// Create a namespace for our application to avoid global scope pollution
const RPDF = (function() {
    // =====================================================================
    // CONFIGURATION
    // =====================================================================

    // Default configuration
    const DEFAULT_CONFIG = {
        maxHistorySize: 50,
        dataPath: 'data/pdf-data.json',
        debug: false
    };

    // =====================================================================
    // PRIVATE FUNCTIONS
    // =====================================================================

    /**
     * Load PDF view history from storage
     * @param {Object} storage - Storage interface (e.g., localStorage)
     * @returns {Array} Array of PDF IDs the user has already seen
     */
    function getViewHistory(storage) {
        try {
            const historyJson = storage.getItem('rpdfExplorerHistory');
            return historyJson ? JSON.parse(historyJson) : [];
        } catch (error) {
            console.error('Error loading view history:', error);
            return [];
        }
    }

    /**
     * Save history to storage, keeping it within size limits
     * @param {Object} storage - Storage interface (e.g., localStorage)
     * @param {Array} history - Array of PDF IDs to save
     */
    function saveViewHistory(storage, history) {
        try {
            // Keep history from growing too large by removing oldest entries
            if (history.length > DEFAULT_CONFIG.maxHistorySize) {
                history = history.slice(history.length - DEFAULT_CONFIG.maxHistorySize);
            }
            storage.setItem('rpdfExplorerHistory', JSON.stringify(history));
            
            if (DEFAULT_CONFIG.debug) {
                console.log(`Saved history with ${history.length} items`);
            }
        } catch (error) {
            console.error('Error saving view history:', error);
        }
    }

    /**
     * Add a PDF ID to the view history
     * @param {Object} storage - Storage interface (e.g., localStorage)
     * @param {string} pdfId - ID of the PDF to add to history
     */
    function addToHistory(storage, pdfId) {
        const history = getViewHistory(storage);
        history.push(pdfId);
        saveViewHistory(storage, history);
        
        if (DEFAULT_CONFIG.debug) {
            console.log(`Added ${pdfId} to history. History size: ${history.length}`);
        }
    }

    /**
     * Clear the user's view history
     * @param {Object} storage - Storage interface (e.g., localStorage)
     */
    function clearHistory(storage) {
        try {
            storage.removeItem('rpdfExplorerHistory');
            if (DEFAULT_CONFIG.debug) {
                console.log('History cleared');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    /**
     * Display an error message in the UI
     * @param {Object} elements - DOM elements
     * @param {string} message - Error message to display
     */
    function showError(elements, message) {
        elements.errorDisplay.textContent = message;
        elements.errorDisplay.classList.remove('hidden');
        elements.pdfDisplay.classList.add('hidden');
    }

    /**
     * Show the loading indicator
     * @param {Object} elements - DOM elements
     */
    function showLoading(elements) {
        elements.loadingIndicator.classList.remove('hidden');
    }

    /**
     * Hide the loading indicator
     * @param {Object} elements - DOM elements
     */
    function hideLoading(elements) {
        elements.loadingIndicator.classList.add('hidden');
    }

    /**
     * Display a PDF's information in the UI
     * @param {Object} elements - DOM elements
     * @param {Object} pdf - The PDF object to display
     */
    function displayPdf(elements, pdf) {
        if (!pdf || !elements) {
            showError(elements, 'No PDF available to display.');
            return;
        }
        
        // Hide any previous errors
        elements.errorDisplay.classList.add('hidden');
        
        // Update UI elements
        elements.pdfTitle.textContent = pdf.title || 'Untitled PDF';
        elements.pdfAuthor.textContent = pdf.author ? `Author: ${pdf.author}` : '';
        elements.pdfDate.textContent = `Added: ${pdf.dateAdded || 'Unknown date'}`;
        
        // Optional metadata display
        if (pdf.pages && elements.pdfPages) {
            elements.pdfPages.textContent = `Pages: ${pdf.pages}`;
        } else if (elements.pdfPages) {
            elements.pdfPages.textContent = '';
        }
        
        if (pdf.yearPublished && elements.pdfYear) {
            elements.pdfYear.textContent = `Published: ${pdf.yearPublished}`;
        } else if (elements.pdfYear) {
            elements.pdfYear.textContent = '';
        }

        elements.pdfQuery.textContent = pdf.sourceQuery ? `Tags: ${pdf.sourceQuery}` : '';
    
        // Set up link
        if (elements.pdfLink) {
            elements.pdfLink.innerHTML = `<a href="${pdf.url}" target="_blank">Open PDF</a>`;
            elements.pdfDomain.textContent = new URL(pdf.url).hostname;
        }
        
        // Show the PDF display area
        elements.pdfDisplay.classList.remove('hidden');
    }

    /**
     * Fetch a random PDF from the data source
     * @param {Function} fetch - Fetch function to use
     * @param {Object} config - Configuration object
     * @returns {Promise<Object>} A randomly selected PDF object
     */
    async function fetchRandomPdf(fetch, config) {
        try {
            const response = await fetch(config.dataPath);
            if (!response.ok) {
                throw new Error('Failed to load a random PDF');
            }
            const data = await response.json();
            
            // Validate data structure
            if (!data || !Array.isArray(data.pdfs) || data.pdfs.length === 0) {
                throw new Error('No PDFs available');
            }
            
            // Filter available PDFs
            const availablePdfs = data.pdfs.filter(pdf => pdf.isAvailable);
            if (availablePdfs.length === 0) {
                throw new Error('No PDFs available');
            }
            
            // Get random PDF
            const randomIndex = Math.floor(Math.random() * availablePdfs.length);
            return availablePdfs[randomIndex];
        } catch (error) {
            if (error.message === 'No PDFs available') {
                throw error;
            }
            throw new Error('Failed to load a random PDF');
        }
    }

    // =====================================================================
    // PUBLIC API
    // =====================================================================

    /**
     * Initialize the application with provided dependencies
     * @param {Object} dependencies - Application dependencies
     * @param {Object} dependencies.elements - DOM elements
     * @param {Object} dependencies.storage - Storage interface
     * @param {Function} dependencies.fetch - Fetch function
     * @param {Object} dependencies.config - Configuration object
     * @returns {Object} Public API methods
     */
    function initApp(dependencies) {
        const {
            elements,
            storage,
            fetch = window.fetch,
            config = {}
        } = dependencies;

        // Merge config with defaults
        const appConfig = { ...DEFAULT_CONFIG, ...config };

        // Initialize state
        let pdfBuffer = [];
        let currentPdfIndex = -1;

        // Event handlers
        async function handleRandomButtonClick() {
            try {
                showLoading(elements);
                const pdf = await fetchRandomPdf(fetch, appConfig);
                displayPdf(elements, pdf);
                addToHistory(storage, pdf.id);
            } catch (error) {
                showError(elements, error.message);
            } finally {
                hideLoading(elements);
            }
        }

        function handleResetHistory() {
            clearHistory(storage);
            pdfBuffer = [];
            currentPdfIndex = -1;
        }

        // Set up event listeners
        elements.randomButton.addEventListener('click', handleRandomButtonClick);
        elements.resetHistory.addEventListener('click', handleResetHistory);

        // Initialize history
        const history = getViewHistory(storage);
        if (history.length > 0) {
            pdfBuffer = history;
            currentPdfIndex = history.length - 1;
        }

        // Return public API
        return {
            handleRandomButtonClick,
            handleResetHistory,
            getViewHistory: () => getViewHistory(storage),
            saveViewHistory: (history) => saveViewHistory(storage, history),
            clearHistory: () => clearHistory(storage),
            addToHistory: (pdfId) => addToHistory(storage, pdfId),
            showError: (message) => showError(elements, message),
            showLoading: () => showLoading(elements),
            hideLoading: () => hideLoading(elements),
            displayPdf: (pdf) => displayPdf(elements, pdf),
            fetchRandomPdf: () => fetchRandomPdf(fetch, appConfig)
        };
    }

    // Return the initialization function directly
    return initApp;
})();

// Expose to window for browser environment
if (typeof window !== 'undefined') {
    window.RPDF = {
        init: RPDF
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const app = RPDF({
                elements: {
                    randomButton: document.getElementById('randomButton'),
                    resetHistory: document.getElementById('resetHistory'),
                    pdfDisplay: document.getElementById('pdfDisplay'),
                    pdfTitle: document.getElementById('pdfTitle'),
                    pdfAuthor: document.getElementById('pdfAuthor'),
                    pdfDate: document.getElementById('pdfDate'),
                    pdfLink: document.getElementById('pdfLink'),
                    pdfPages: document.getElementById('pdfPages'),
                    pdfYear: document.getElementById('pdfYear'),
                    pdfDomain: document.getElementById('pdfDomain'),
                    pdfQuery: document.getElementById('pdfQuery'),
                    loadingIndicator: document.getElementById('loadingIndicator'),
                    errorDisplay: document.getElementById('errorDisplay')
                },
                storage: window.localStorage,
                config: window.RPDF_CONFIG
            });
        });
    } else {
        const app = RPDF({
            elements: {
                randomButton: document.getElementById('randomButton'),
                resetHistory: document.getElementById('resetHistory'),
                pdfDisplay: document.getElementById('pdfDisplay'),
                pdfTitle: document.getElementById('pdfTitle'),
                pdfAuthor: document.getElementById('pdfAuthor'),
                pdfDate: document.getElementById('pdfDate'),
                pdfLink: document.getElementById('pdfLink'),
                pdfPages: document.getElementById('pdfPages'),
                pdfYear: document.getElementById('pdfYear'),
                pdfDomain: document.getElementById('pdfDomain'),
                pdfQuery: document.getElementById('pdfQuery'),
                loadingIndicator: document.getElementById('loadingIndicator'),
                errorDisplay: document.getElementById('errorDisplay')
            },
            storage: window.localStorage,
            config: window.RPDF_CONFIG
        });
    }
}

// Export for Node.js environment (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RPDF;
}