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

    // Get configuration from the window object or use defaults
    const CONFIG = {
        // Local storage key for view history
        STORAGE_KEY: 'rpdfExplorerHistory',
        
        // Maximum number of PDFs to remember in history
        MAX_HISTORY_SIZE: window.RPDF_CONFIG?.maxHistorySize || 50,
        
        // Path to the JSON data file
        DATA_FILE: window.RPDF_CONFIG?.dataPath || 'data/pdf-data.json',
        
        // Whether to show debug messages in the console
        DEBUG: window.RPDF_CONFIG?.debug || false
    };

    // =====================================================================
    // HISTORY MANAGEMENT
    // =====================================================================

    /**
     * Load PDF view history from localStorage
     * @returns {Array} Array of PDF IDs the user has already seen
     */
    function getViewHistory() {
        try {
            const historyJson = localStorage.getItem(CONFIG.STORAGE_KEY);
            return historyJson ? JSON.parse(historyJson) : [];
        } catch (error) {
            console.error('Error loading view history:', error);
            return [];
        }
    }

    /**
     * Save history to localStorage, keeping it within size limits
     * @param {Array} history - Array of PDF IDs to save
     */
    function saveViewHistory(history) {
        try {
            // Keep history from growing too large by removing oldest entries
            if (history.length > CONFIG.MAX_HISTORY_SIZE) {
                history = history.slice(history.length - CONFIG.MAX_HISTORY_SIZE);
            }
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
            
            if (CONFIG.DEBUG) {
                console.log(`Saved history with ${history.length} items`);
            }
        } catch (error) {
            console.error('Error saving view history:', error);
        }
    }

    /**
     * Add a PDF ID to the view history
     * @param {string} pdfId - ID of the PDF to add to history
     */
    function addToHistory(pdfId) {
        const history = getViewHistory();
        history.push(pdfId);
        saveViewHistory(history);
        
        if (CONFIG.DEBUG) {
            console.log(`Added ${pdfId} to history. History size: ${history.length}`);
        }
    }

    /**
     * Clear the user's view history
     */
    function clearHistory() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
            if (CONFIG.DEBUG) {
                console.log('History cleared');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    // =====================================================================
    // DATA LOADING AND PROCESSING
    // =====================================================================
    
    /**
     * Fetch the PDF data from the JSON file
     * @returns {Promise<Array>} Promise resolving to an array of PDF objects
     */
    async function fetchPDFData() {
        try {
            const response = await fetch(CONFIG.DATA_FILE);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF data (Status: ${response.status})`);
            }
            
            const data = await response.json();
            
            if (CONFIG.DEBUG) {
                console.log(`Loaded ${data.pdfs ? data.pdfs.length : 0} PDFs from data file`);
                console.log(`Last validated: ${data.lastValidated}`);
            }
            
            // Filter out unavailable PDFs
            return data.pdfs ? data.pdfs.filter(pdf => pdf.isAvailable === true) : [];
        } catch (error) {
            console.error('Error fetching PDF data:', error);
            return [];
        }
    }
    
    /**
     * Select a random PDF while avoiding recently viewed ones
     * @param {Array} pdfList - Array of available PDFs
     * @returns {Object|null} A randomly selected PDF object or null if none available
     */
    function getRandomPDF(pdfList) {
        if (!pdfList || pdfList.length === 0) return null;
        
        const viewHistory = getViewHistory();
        
        // If we've seen all PDFs or have no history, just pick completely random
        if (viewHistory.length >= pdfList.length || viewHistory.length === 0) {
            const randomIndex = Math.floor(Math.random() * pdfList.length);
            return pdfList[randomIndex];
        }
        
        // Filter out PDFs we've seen recently
        const unseenPDFs = pdfList.filter(pdf => !viewHistory.includes(pdf.id));
        
        // If there are unseen PDFs, pick from those
        if (unseenPDFs.length > 0) {
            const randomIndex = Math.floor(Math.random() * unseenPDFs.length);
            return unseenPDFs[randomIndex];
        } else {
            // Fallback to completely random if something went wrong
            const randomIndex = Math.floor(Math.random() * pdfList.length);
            return pdfList[randomIndex];
        }
    }
    
    // =====================================================================
    // UI MANAGEMENT
    // =====================================================================
    
    // Initialize the app when DOM is loaded
    function initApp() {
        // DOM elements
        const elements = {
            randomButton: document.getElementById('randomButton'),
            pdfDisplay: document.getElementById('pdfDisplay'),
            pdfTitle: document.getElementById('pdfTitle'),
            pdfAuthor: document.getElementById('pdfAuthor'),
            pdfDate: document.getElementById('pdfDate'),
            pdfPages: document.getElementById('pdfPages'),
            pdfYear: document.getElementById('pdfYear'),
            pdfLink: document.getElementById('pdfLink'),
            pdfDomain: document.getElementById('pdfDomain'),
            pdfQuery: document.getElementById('pdfQuery'),
            resetHistoryButton: document.getElementById('resetHistory'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            errorDisplay: document.getElementById('errorDisplay'),
            reportButton: document.getElementById('reportButton'),
            reportForm: document.getElementById('reportForm'),
            closeReportButton: document.getElementById('closeReport'),
            issueReportForm: document.getElementById('issueReportForm')
        };
        
        // Application state
        let currentPdfId = null;
        let cachedPDFs = null;
        
        /**
         * Display a PDF's information in the UI
         * @param {Object} pdf - The PDF object to display
         */
        function displayPDF(pdf) {
            if (!pdf) {
                showError('No PDF available to display.');
                return;
            }
            
            // Hide any previous errors
            hideError();
            
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

            elements.pdfQuery.textContent =  pdf.sourceQuery ? `Tags: ${pdf.sourceQuery}` : '';
        
            // Set up link
            if (elements.pdfLink) {
                elements.pdfLink.href = pdf.url;
                elements.pdfLink.textContent = 'View PDF';
                elements.pdfDomain.textContent = new URL(pdf.url).hostname;
            }
            
            // Add a report button if needed
            if (document.getElementById('reportPdfId') && document.getElementById('reportPdfTitle')) {
                document.getElementById('reportPdfId').value = pdf.id;
                document.getElementById('reportPdfTitle').value = pdf.title;
                
                if (elements.reportButton) {
                    elements.reportButton.classList.remove('hidden');
                }
            }
            
            // Show the PDF display area
            elements.pdfDisplay.classList.remove('hidden');
            
            // Remember this PDF in the history
            addToHistory(pdf.id);
            
            // Store current PDF ID for reference 
            currentPdfId = pdf.id;
        }
        
        /**
         * Show the loading state in the UI
         */
        function showLoading() {
            if (elements.randomButton) {
                elements.randomButton.disabled = true;
                elements.randomButton.textContent = 'Loading...';
            }
            
            if (elements.loadingIndicator) {
                elements.loadingIndicator.classList.remove('hidden');
            }
        }
        
        /**
         * Hide the loading state in the UI
         */
        function hideLoading() {
            if (elements.randomButton) {
                elements.randomButton.disabled = false;
                elements.randomButton.textContent = elements.pdfDisplay && !elements.pdfDisplay.classList.contains('hidden') ? 
                    'Show Another Random PDF' : 
                    'Show Me a Random PDF';
            }
            
            if (elements.loadingIndicator) {
                elements.loadingIndicator.classList.add('hidden');
            }
        }
        
        /**
         * Display an error message in the UI
         * @param {string} message - The error message to display
         */
        function showError(message) {
            if (elements.errorDisplay) {
                elements.errorDisplay.textContent = message;
                elements.errorDisplay.classList.remove('hidden');
            } else {
                console.error(message);
            }
        }
        
        /**
         * Hide the error message in the UI
         */
        function hideError() {
            if (elements.errorDisplay) {
                elements.errorDisplay.classList.add('hidden');
            }
        }
        
        /**
         * Handle click on the random button
         */
        async function handleRandomButtonClick() {
            // Hide any previous errors
            hideError();
            
            // Show loading state
            showLoading();
            
            try {
                // Always fetch fresh data to ensure we have the latest
                const pdfList = await fetchPDFData();
                cachedPDFs = pdfList;
                
                if (pdfList && pdfList.length > 0) {
                    // Get a random PDF and display it
                    const randomPDF = getRandomPDF(pdfList);
                    displayPDF(randomPDF);
                } else {
                    showError('No PDFs available at the moment. Please try again later.');
                }
            } catch (error) {
                console.error('Error loading random PDF:', error);
                showError('Something went wrong when loading a PDF. Please try again.');
            } finally {
                // Hide loading state
                hideLoading();
            }
        }
        
        /**
         * Handle click on the reset history button
         */
        function handleResetHistoryClick() {
            clearHistory();
            alert('Your viewing history has been reset.');
        }
        
        /**
         * Handle click on the report button
         */
        function handleReportButtonClick() {
            if (elements.reportForm) {
                elements.reportForm.classList.remove('hidden');
            }
        }
        
        /**
         * Handle closing the report form
         */
        function handleCloseReportClick() {
            if (elements.reportForm) {
                elements.reportForm.classList.add('hidden');
            }
        }
        
        /**
         * Handle submission of the report form
         * @param {Event} event - The form submission event
         */
        function handleReportSubmit(event) {
            event.preventDefault();
            
            // In a production environment, this would send the report to a server
            // For now, we'll just log it and show a confirmation
            const formData = new FormData(elements.issueReportForm);
            const reportData = Object.fromEntries(formData.entries());
            
            if (CONFIG.DEBUG) {
                console.log('Report submitted:', reportData);
            }
            
            // Reset and hide the form
            elements.issueReportForm.reset();
            elements.reportForm.classList.add('hidden');
            
            // Show confirmation to user
            alert('Thank you for your report. We will review it soon.');
        }
        
        // Attach event listeners
        if (elements.randomButton) {
            elements.randomButton.addEventListener('click', handleRandomButtonClick);
        }
        
        if (elements.resetHistoryButton) {
            elements.resetHistoryButton.addEventListener('click', handleResetHistoryClick);
        }
        
        if (elements.reportButton) {
            elements.reportButton.addEventListener('click', handleReportButtonClick);
        }
        
        if (elements.closeReportButton) {
            elements.closeReportButton.addEventListener('click', handleCloseReportClick);
        }
        
        if (elements.issueReportForm) {
            elements.issueReportForm.addEventListener('submit', handleReportSubmit);
        }
        
        // Enable keyboard navigation with spacebar for next PDF
        document.addEventListener('keydown', (event) => {
            // Check if it's the spacebar and we're not in an input field
            if (event.key === ' ' && 
                !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                event.preventDefault();
                if (elements.randomButton && !elements.randomButton.disabled) {
                    handleRandomButtonClick();
                }
            }
        });
        
        // Initialize the application
        async function initialize() {
            try {
                const pdfs = await fetchPDFData();
                cachedPDFs = pdfs;
                
                if (CONFIG.DEBUG) {
                    console.log('PDF Explorer initialized with', pdfs.length, 'PDFs');
                }
                
                // Remove loading state if present on initial page load
                if (elements.loadingIndicator) {
                    elements.loadingIndicator.classList.add('hidden');
                }
                
                // Check if autoplay is requested via URL parameter
                if (window.location.search.includes('autoplay=true')) {
                    // Delay slightly to ensure DOM is fully ready
                    setTimeout(() => {
                        handleRandomButtonClick();
                    }, 500);
                }
            } catch (error) {
                console.error('Error during initialization:', error);
                showError('Unable to initialize the application. Please refresh the page.');
            }
        }
        
        // Start the application
        initialize();
    }
    
    // Return public methods and properties
    return {
        init: initApp,
        getHistory: getViewHistory,
        clearHistory: clearHistory
    };
})();

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', RPDF.init);