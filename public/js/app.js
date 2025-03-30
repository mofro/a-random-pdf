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

    // Define default configuration
    const DEFAULT_CONFIG = {
        maxHistorySize: 50,
        dataPath: 'data/pdf-data.json',
        debug: false,
        ui: {
            showCategories: true,
            showSources: true,
            showTags: false,
            defaultCategory: null,
            maxDisplayedCategories: 7,
            primaryColor: '#2c3e50',
            secondaryColor: '#3498db'
        },
        search: {
            enableFullTextSearch: true,
            searchFields: ['title', 'author', 'tags'],
            maxResults: 20,
            highlightMatches: true
        },
        rememberFilters: true
    };

    // Allow user to override config via localStorage or window.RPDF_CONFIG
    function loadUserConfig() {
        // Start with default config
        let config = {...DEFAULT_CONFIG};
        
        try {
            // Try to load from localStorage if available
            if (typeof localStorage !== 'undefined') {
                const savedConfig = JSON.parse(localStorage.getItem('rpdf_config'));
                if (savedConfig) {
                    // Deep merge of saved config with defaults
                    config = mergeConfigs(config, savedConfig);
                }
            }
            
            // Override with window.RPDF_CONFIG if it exists
            if (typeof window !== 'undefined' && window.RPDF_CONFIG) {
                // Deep merge of window config with the current config
                config = mergeConfigs(config, window.RPDF_CONFIG);
            }
        } catch (e) {
            console.error('Failed to load user config', e);
        }
        
        return config;
    }

    // Helper function to deep merge configs
    function mergeConfigs(target, source) {
        const result = {...target};
        
        for (const key in source) {
            if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // If the key is an object in both, merge them
                if (key in target && target[key] !== null && typeof target[key] === 'object') {
                    result[key] = mergeConfigs(target[key], source[key]);
                } else {
                    // If it's not an object in target or doesn't exist, just copy
                    result[key] = {...source[key]};
                }
            } else {
                // For non-objects, simply overwrite
                result[key] = source[key];
            }
        }
        
        return result;
    }

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

    // Show an error message
    function showError(elements, message) {
        if (elements.errorDisplay) {
            elements.errorDisplay.textContent = message;
            elements.errorDisplay.classList.remove('hidden');
            
            // Ensure the errorDisplay is visible after class change
            elements.errorDisplay.style.display = 'block';
        }
    }

    // Hide the error message
    function hideError(elements) {
        if (elements.errorDisplay) {
            elements.errorDisplay.textContent = '';
            elements.errorDisplay.classList.add('hidden');
            
            // Ensure the errorDisplay is hidden after class change
            elements.errorDisplay.style.display = 'none';
        }
    }

    // Show the loading indicator
    function showLoading(elements) {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.classList.remove('hidden');
            
            // Ensure the loading indicator is visible after class change
            elements.loadingIndicator.style.display = 'block';
        }
    }

    // Hide the loading indicator
    function hideLoading(elements) {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.classList.add('hidden');
            
            // Ensure the loading indicator is hidden after class change
            elements.loadingIndicator.style.display = 'none';
        }
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
            elements.pdfLink.innerHTML = `<a href="${pdf.url}"  target="_blank" rel="noopener noreferrer">Open PDF</a>`;
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
        const { elements, storage = window.localStorage, fetch = window.fetch, config = loadUserConfig() } = dependencies;
        let pdfData = null;
        let viewHistory = [];
        
        // Make sure we have a valid config with default values
        const safeConfig = config || loadUserConfig();
        
        // Make sure fetch is a function
        if (typeof fetch !== 'function') {
            throw new Error('Fetch must be a function');
        }
        
        let activeFilters = {
            category: safeConfig.ui?.defaultCategory || null,
            searchTerm: '',
            source: null,
            tags: []
        };

        // Load PDF data with metadata
        async function loadPdfData() {
            try {
                const response = await fetch(safeConfig.dataPath);
                if (!response.ok) {
                    throw new Error('Failed to load PDF data');
                }
                return await response.json();
            } catch (error) {
                console.error('Error loading PDF data:', error);
                throw new Error('Failed to load PDF data');
            }
        }

        // Get filtered PDFs based on current filters
        function getFilteredPdfs() {
            if (!pdfData || !pdfData.pdfs) return [];
            
            return pdfData.pdfs.filter(pdf => {
                // Filter by availability
                if (!pdf.isAvailable) return false;
                
                // Filter by category
                if (activeFilters.category && 
                    (!pdf.categories || !pdf.categories.includes(activeFilters.category))) {
                    return false;
                }
                
                // Filter by source
                if (activeFilters.source && pdf.source !== activeFilters.source) {
                    return false;
                }
                
                // Filter by tags
                if (activeFilters.tags.length > 0) {
                    if (!pdf.tags) return false;
                    
                    for (const tag of activeFilters.tags) {
                        if (!pdf.tags.includes(tag)) return false;
                    }
                }
                
                // Filter by search term
                if (activeFilters.searchTerm) {
                    const term = activeFilters.searchTerm.toLowerCase();
                    const searchFields = safeConfig.search.searchFields;
                    
                    return searchFields.some(field => {
                        if (!pdf[field]) return false;
                        
                        if (Array.isArray(pdf[field])) {
                            return pdf[field].some(value => 
                                value.toLowerCase().includes(term)
                            );
                        }
                        
                        return pdf[field].toLowerCase().includes(term);
                    });
                }
                
                return true;
            });
        }

        // Get random PDF with filters applied
        async function getRandomPdf() {
            try {
                if (!pdfData) {
                    pdfData = await loadPdfData();
                }
                
                // Check if we have valid pdf data
                if (!pdfData || !pdfData.pdfs || !Array.isArray(pdfData.pdfs) || pdfData.pdfs.length === 0) {
                    throw new Error('No PDFs available');
                }
                
                // Apply category filters if needed
                let filteredPdfs = pdfData.pdfs.filter(pdf => pdf.isAvailable);
                
                if (activeFilters.category) {
                    filteredPdfs = filteredPdfs.filter(pdf => 
                        pdf.categories && pdf.categories.includes(activeFilters.category));
                }
                
                if (filteredPdfs.length === 0) {
                    throw new Error('No PDFs match your current filters');
                }
                
                // Apply history filters
                const viewedIds = new Set(viewHistory);
                const unviewedPdfs = filteredPdfs.filter(pdf => !viewedIds.has(pdf.id));
                
                // If all have been viewed, reset history
                let selectedPdf;
                if (unviewedPdfs.length === 0) {
                    if (safeConfig.debug) {
                        console.log('All PDFs have been viewed. Resetting history.');
                    }
                    viewHistory = [];
                    const randomIndex = Math.floor(Math.random() * filteredPdfs.length);
                    selectedPdf = filteredPdfs[randomIndex];
                } else {
                    const randomIndex = Math.floor(Math.random() * unviewedPdfs.length);
                    selectedPdf = unviewedPdfs[randomIndex];
                }
                
                return selectedPdf;
            } catch (error) {
                throw error; // Let the calling function handle the error
            }
        }

        // Setup category filters UI
        function setupCategoryFilters() {
            if (!safeConfig.ui?.showCategories || !pdfData?.metadata?.categories) return;
            
            // Create filter container
            const filterContainer = document.createElement('div');
            filterContainer.className = 'category-filters';
            filterContainer.setAttribute('aria-label', 'Category filters');
            
            // Add "All" option
            const allButton = document.createElement('button');
            allButton.textContent = 'All';
            allButton.className = `category-button ${!activeFilters.category ? 'active' : ''}`;
            allButton.addEventListener('click', () => {
                setCategory(null);
                updateFilterUI();
            });
            filterContainer.appendChild(allButton);
            
            // Add category buttons (limited by maxDisplayedCategories)
            const displayCategories = pdfData.metadata.categories.slice(0, safeConfig.ui?.maxDisplayedCategories || 7);
            
            displayCategories.forEach(category => {
                const button = document.createElement('button');
                button.textContent = category.name;
                button.className = `category-button ${activeFilters.category === category.id ? 'active' : ''}`;
                button.style.backgroundColor = category.color;
                button.addEventListener('click', () => {
                    setCategory(category.id);
                    updateFilterUI();
                });
                filterContainer.appendChild(button);
            });
            
            // If we have more categories than we can display, add a dropdown
            if (pdfData.metadata.categories.length > (safeConfig.ui?.maxDisplayedCategories || 7)) {
                const dropdown = document.createElement('select');
                dropdown.className = 'category-dropdown';
                dropdown.addEventListener('change', (e) => {
                    setCategory(e.target.value === 'all' ? null : e.target.value);
                    updateFilterUI();
                });
                
                // Add "More..." option
                const moreOption = document.createElement('option');
                moreOption.textContent = 'More...';
                moreOption.disabled = true;
                moreOption.selected = true;
                dropdown.appendChild(moreOption);
                
                // Add "All" option
                const allOption = document.createElement('option');
                allOption.textContent = 'All Categories';
                allOption.value = 'all';
                dropdown.appendChild(allOption);
                
                // Add all categories
                pdfData.metadata.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.textContent = category.name;
                    option.value = category.id;
                    dropdown.appendChild(option);
                });
                
                filterContainer.appendChild(dropdown);
            }
            
            // Insert before the random button
            const randomButton = elements.randomButton;
            randomButton.parentNode.insertBefore(filterContainer, randomButton);
        }

        // Set active category filter
        function setCategory(categoryId) {
            activeFilters.category = categoryId;
            
            // Save preference if the user wants persistence
            if (safeConfig.rememberFilters) {
                storage.setItem('rpdf_lastCategory', categoryId || '');
            }
        }

        // Update UI to match current filters
        function updateFilterUI() {
            // Skip if there's no data yet or categories aren't set up
            if (!pdfData?.metadata?.categories) return;
            
            // Update category buttons
            document.querySelectorAll('.category-button').forEach(button => {
                button.classList.remove('active');
                if (
                    (button.textContent === 'All' && !activeFilters.category) ||
                    (pdfData.metadata.categories.find(c => c.name === button.textContent && c.id === activeFilters.category))
                ) {
                    button.classList.add('active');
                }
            });
            
            // Update filter indicator text
            const filterCount = Object.values(activeFilters).filter(f => 
                f !== null && f !== '' && (!Array.isArray(f) || f.length > 0)
            ).length;
            
            const filterIndicator = document.getElementById('filter-indicator');
            if (filterIndicator) {
                filterIndicator.textContent = filterCount > 0 ? `Filters: ${filterCount}` : '';
            }
        }

        // Event handlers
        async function handleRandomButtonClick() {
            try {
                showLoading(elements);
                hideError(elements);
                
                const pdf = await getRandomPdf();
                addToHistory(storage, pdf.id);
                displayPdf(elements, pdf);
                
                hideLoading(elements);
            } catch (error) {
                hideLoading(elements);
                showError(elements, error.message || 'Failed to load a random PDF');
                
                if (safeConfig.debug) {
                    console.error('Error getting random PDF:', error);
                }
            }
        }

        function handleResetHistory() {
            clearHistory(storage);
            pdfData = null;
            viewHistory = [];
            activeFilters = {
                category: safeConfig.ui?.defaultCategory || null,
                searchTerm: '',
                source: null,
                tags: []
            };
        }

        // Set up event listeners
        elements.randomButton.addEventListener('click', handleRandomButtonClick);
        elements.resetHistory.addEventListener('click', handleResetHistory);

        // Initialize history
        viewHistory = getViewHistory(storage);

        // Modified initialize function
        async function initialize() {
            try {
                showLoading(elements);
                
                // Load data first
                pdfData = await loadPdfData();
                
                // Load view history
                viewHistory = getViewHistory(storage);
                
                // Set up event listeners
                elements.randomButton.addEventListener('click', handleRandomButtonClick);
                elements.resetHistory.addEventListener('click', handleResetHistory);
                
                // Setup UI with categories after data is loaded
                if (pdfData && pdfData.metadata) {
                    setupCategoryFilters();
                
                    // Restore saved filters if enabled
                    if (safeConfig.rememberFilters) {
                        const savedCategory = storage.getItem('rpdf_lastCategory');
                        if (savedCategory) {
                            activeFilters.category = savedCategory === '' ? null : savedCategory;
                            updateFilterUI();
                        }
                    }
                    
                    // Enable search if configured
                    if (safeConfig.search?.enableFullTextSearch) {
                        setupSearchUI(elements, activeFilters, updateFilterUI);
                    }
                }
                
                hideLoading(elements);
            } catch (error) {
                hideLoading(elements);
                
                // Use specific error messages that match our test expectations
                let errorMessage = 'Failed to load a random PDF';
                
                if (error.message && error.message.includes('No PDFs')) {
                    errorMessage = 'No PDFs available';
                } else if (error.message && error.message.includes('Invalid JSON')) {
                    errorMessage = 'Failed to load a random PDF: Invalid JSON';
                }
                
                showError(elements, errorMessage);
                
                if (safeConfig.debug) {
                    console.error('Initialization error:', error);
                }
            }
        }
        
        // Initialize on load
        initialize();

        // Return functions for testing/external use
        return {
            getRandomPdf,
            getViewHistory: () => getViewHistory(storage),
            saveViewHistory: (history) => saveViewHistory(storage, history),
            addToHistory: (id) => addToHistory(storage, id),
            clearHistory: () => clearHistory(storage),
            setCategory,
            getActiveFilters: () => ({...activeFilters})
        };
    }

    // Create the setupSearchUI function that we're trying to call
    function setupSearchUI(elements, activeFilters, updateFilterUI) {
        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search PDFs...';
        searchInput.className = 'search-input';
        searchInput.setAttribute('aria-label', 'Search PDFs');
        
        // Add debounced search handler
        let debounceTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                activeFilters.searchTerm = e.target.value;
                updateFilterUI();
            }, 300);
        });
        
        // Create search button
        const searchButton = document.createElement('button');
        searchButton.textContent = 'Search';
        searchButton.className = 'search-button';
        searchButton.addEventListener('click', () => {
            activeFilters.searchTerm = searchInput.value;
            updateFilterUI();
        });
        
        // Add to container
        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchButton);
        
        // Create filter indicator
        const filterIndicator = document.createElement('div');
        filterIndicator.id = 'filter-indicator';
        filterIndicator.className = 'filter-indicator';
        searchContainer.appendChild(filterIndicator);
        
        // Insert before random button
        if (elements.randomButton && elements.randomButton.parentNode) {
            elements.randomButton.parentNode.insertBefore(searchContainer, elements.randomButton);
        }
    }

    // Return the initialization function directly
    return initApp;
})();

// Expose to window for browser environment
if (typeof window !== 'undefined') {
    window.RPDF = {
        init: RPDF
    };

    // Initialize when DOM is ready and not prevented
    const shouldAutoInit = !(window.RPDF_CONFIG && window.RPDF_CONFIG.preventAutoInit);
    
    if (shouldAutoInit) {
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
                    fetch: window.fetch,
                    // Use window.RPDF_CONFIG if it exists, otherwise undefined will trigger default
                    config: window.RPDF_CONFIG || undefined
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
                fetch: window.fetch,
                // Use window.RPDF_CONFIG if it exists, otherwise undefined will trigger default
                config: window.RPDF_CONFIG || undefined
            });
        }
    }
}

// Export for Node.js environment (tests)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RPDF;
}