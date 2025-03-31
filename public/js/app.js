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
        rememberFilters: true,
        enableUrlParameters: true // New config option for URL parameters
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
            categories: [], // New array for multi-selection
            searchTerm: '',
            source: null,
            tags: []
        };

        // NEW: Parse URL parameters and apply to active filters
        function parseUrlParameters() {
            if (!safeConfig.enableUrlParameters) return;
            
            try {
                const urlParams = new URLSearchParams(window.location.search);
                
                // Parse category parameter
                if (urlParams.has('category')) {
                    const categoryParam = urlParams.get('category');
                    
                    // Check if multiple categories are provided (comma-separated)
                    if (categoryParam.includes(',')) {
                        activeFilters.categories = categoryParam.split(',').filter(Boolean);
                        activeFilters.category = null; // Clear single category
                    } else {
                        activeFilters.category = categoryParam || null;
                        activeFilters.categories = categoryParam ? [categoryParam] : [];
                    }
                }
                
                // Parse categories parameter (explicit multi-selection support)
                if (urlParams.has('categories')) {
                    const categoriesParam = urlParams.get('categories');
                    activeFilters.categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : [];
                    activeFilters.category = null; // Clear single category when using explicit multi-selection
                }
                
                // Parse search parameter
                if (urlParams.has('search')) {
                    activeFilters.searchTerm = urlParams.get('search') || '';
                }
                
                // Parse source parameter
                if (urlParams.has('source')) {
                    activeFilters.source = urlParams.get('source') || null;
                }
                
                // Parse tags parameter (comma-separated list)
                if (urlParams.has('tags')) {
                    const tagsParam = urlParams.get('tags');
                    activeFilters.tags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
                }
                
                if (safeConfig.debug) {
                    console.log('Filters from URL parameters:', activeFilters);
                }
            } catch (error) {
                console.error('Error parsing URL parameters:', error);
            }
        }
        
        // NEW: Update URL with current filters without page reload
        function updateUrlWithFilters() {
            if (!safeConfig.enableUrlParameters) return;
            
            try {
                const url = new URL(window.location);
                
                // Update category/categories parameter
                if (activeFilters.categories && activeFilters.categories.length > 0) {
                    // Use 'categories' parameter for multiple categories
                    url.searchParams.delete('category');
                    url.searchParams.set('categories', activeFilters.categories.join(','));
                } else if (activeFilters.category) {
                    // Use 'category' parameter for single category (backward compatibility)
                    url.searchParams.set('category', activeFilters.category);
                    url.searchParams.delete('categories');
                } else {
                    // No categories selected
                    url.searchParams.delete('category');
                    url.searchParams.delete('categories');
                }
                
                // Update search parameter
                if (activeFilters.searchTerm) {
                    url.searchParams.set('search', activeFilters.searchTerm);
                } else {
                    url.searchParams.delete('search');
                }
                
                // Update source parameter
                if (activeFilters.source) {
                    url.searchParams.set('source', activeFilters.source);
                } else {
                    url.searchParams.delete('source');
                }
                
                // Update tags parameter
                if (activeFilters.tags && activeFilters.tags.length > 0) {
                    url.searchParams.set('tags', activeFilters.tags.join(','));
                } else {
                    url.searchParams.delete('tags');
                }
                
                // Update URL without page reload
                window.history.pushState({}, '', url);
                
                if (safeConfig.debug) {
                    console.log('Updated URL with filters:', url.toString());
                }
            } catch (error) {
                console.error('Error updating URL with filters:', error);
            }
        }
        
        // MODIFIED: Set category and update URL
        function setCategory(categoryId) {
            activeFilters.category = categoryId;
            
            // Update URL parameters
            updateUrlWithFilters();
            
            // If configured to remember filters, save to localStorage
            if (safeConfig.rememberFilters) {
                storage.setItem('rpdf_lastCategory', categoryId || '');
            }
        }
        
        // NEW: Set tags and update URL
        function setTags(tags) {
            activeFilters.tags = Array.isArray(tags) ? tags : [];
            
            // Update URL parameters
            updateUrlWithFilters();
            
            // If configured to remember filters, save to localStorage
            if (safeConfig.rememberFilters) {
                storage.setItem('rpdf_lastTags', JSON.stringify(activeFilters.tags));
            }
        }
        
        // NEW: Set search term and update URL
        function setSearchTerm(term) {
            activeFilters.searchTerm = term || '';
            
            // Update URL parameters
            updateUrlWithFilters();
            
            // If configured to remember filters, save to localStorage
            if (safeConfig.rememberFilters) {
                storage.setItem('rpdf_lastSearchTerm', activeFilters.searchTerm);
            }
        }
        
        // NEW: Set source and update URL
        function setSource(sourceId) {
            activeFilters.source = sourceId;
            
            // Update URL parameters
            updateUrlWithFilters();
            
            // If configured to remember filters, save to localStorage
            if (safeConfig.rememberFilters) {
                storage.setItem('rpdf_lastSource', sourceId || '');
            }
        }

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
                
                // Filter by single category (backward compatibility)
                if (activeFilters.category && 
                    (!pdf.categories || !pdf.categories.includes(activeFilters.category))) {
                    return false;
                }
                
                // Filter by multiple categories
                if (activeFilters.categories && activeFilters.categories.length > 0) {
                    if (!pdf.categories || pdf.categories.length === 0) return false;
                    
                    // Check if the PDF has any of the selected categories
                    const hasMatchingCategory = pdf.categories.some(cat => 
                        activeFilters.categories.includes(cat)
                    );
                    
                    if (!hasMatchingCategory) return false;
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
                
                // Apply filters to get filtered PDFs
                const filteredPdfs = getFilteredPdfs();
                
                if (filteredPdfs.length === 0) {
                    throw new Error('No PDFs match your current filters');
                }
                
                // Apply history filters
                const viewedIds = new Set(viewHistory);
                const unviewedPdfs = filteredPdfs.filter(pdf => !viewedIds.has(pdf.id));
                
                // If all have been viewed, reset history and select from all filtered PDFs
                let selectedPdf;
                if (unviewedPdfs.length === 0) {
                    if (safeConfig.debug) {
                        console.log('All PDFs in the current filter have been viewed. Resetting history.');
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

        // MODIFIED: Setup category filters UI with selection box
        function setupCategoryFilters(accordionGroup) {
            if (!safeConfig.ui?.showCategories || !pdfData?.metadata?.categories) return;
            
            // Create accordion container
            const accordionContainer = document.createElement('div');
            accordionContainer.className = 'rpdf-accordion-container';
            
            // Create details element for accordion behavior
            const detailsElement = document.createElement('details');
            detailsElement.className = 'rpdf-filter-details';
            // Open by default if filters are active
            detailsElement.open = activeFilters.category || activeFilters.categories.length > 0;
            
            // Create summary element (header)
            const summaryElement = document.createElement('summary');
            summaryElement.className = 'rpdf-filter-summary';
            summaryElement.textContent = 'Categories';
            detailsElement.appendChild(summaryElement);
            
            // Create filter container inside the details
            const filterContainer = document.createElement('div');
            filterContainer.className = 'category-filters';
            filterContainer.setAttribute('aria-label', 'Category filters');
            
            // Create label
            const filterLabel = document.createElement('label');
            filterLabel.textContent = 'Select categories:';
            filterLabel.className = 'filter-label';
            filterContainer.appendChild(filterLabel);
            
            // Create selection box container
            const selectionBox = document.createElement('div');
            selectionBox.className = 'select-box tags-select';
            selectionBox.setAttribute('aria-label', 'Select categories');
            
            // Add "All Categories" option
            const allOption = document.createElement('div');
            allOption.className = 'tag-option' + (!activeFilters.categories || activeFilters.categories.length === 0 ? ' selected' : '');
            allOption.setAttribute('data-value', '');
            
            const allCheckbox = document.createElement('input');
            allCheckbox.type = 'checkbox';
            allCheckbox.checked = !activeFilters.categories || activeFilters.categories.length === 0;
            allCheckbox.id = 'category-all';
            
            const allLabel = document.createElement('label');
            allLabel.setAttribute('for', 'category-all');
            allLabel.textContent = 'All Categories';
            
            allOption.appendChild(allCheckbox);
            allOption.appendChild(allLabel);
            selectionBox.appendChild(allOption);
            
            // Add category options
            pdfData.metadata.categories.forEach(category => {
                const option = document.createElement('div');
                option.className = 'tag-option' + (activeFilters.categories && activeFilters.categories.includes(category.id) ? ' selected' : '');
                option.setAttribute('data-value', category.id);
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = activeFilters.categories && activeFilters.categories.includes(category.id);
                checkbox.id = 'category-' + category.id;
                
                const label = document.createElement('label');
                label.setAttribute('for', 'category-' + category.id);
                label.textContent = category.name;
                
                if (category.color) {
                    const colorIndicator = document.createElement('span');
                    colorIndicator.style.display = 'inline-block';
                    colorIndicator.style.width = '12px';
                    colorIndicator.style.height = '12px';
                    colorIndicator.style.backgroundColor = category.color;
                    colorIndicator.style.marginRight = '5px';
                    colorIndicator.style.borderRadius = '3px';
                    label.prepend(colorIndicator);
                }
                
                option.appendChild(checkbox);
                option.appendChild(label);
                selectionBox.appendChild(option);
                
                // Add click event to the entire option div
                option.addEventListener('click', (e) => {
                    // Ignore clicks on checkbox (it handles its own state)
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                    }
                    
                    updateCategorySelections();
                });
            });
            
            // Add click event to "All Categories" option
            allOption.addEventListener('click', (e) => {
                // Ignore clicks on checkbox (it handles its own state)
                if (e.target !== allCheckbox) {
                    allCheckbox.checked = !allCheckbox.checked;
                }
                
                if (allCheckbox.checked) {
                    // Uncheck all other categories
                    const checkboxes = selectionBox.querySelectorAll('input[type="checkbox"]:not(#category-all)');
                    checkboxes.forEach(cb => cb.checked = false);
                }
                
                updateCategorySelections();
            });
            
            // Function to update activeFilters based on checkbox selections
            function updateCategorySelections() {
                const allSelected = document.getElementById('category-all').checked;
                
                if (allSelected) {
                    // Clear category filters
                    activeFilters.category = null;
                    activeFilters.categories = [];
                } else {
                    // Get all checked categories
                    const checked = Array.from(selectionBox.querySelectorAll('input[type="checkbox"]:checked:not(#category-all)'));
                    const selectedValues = checked.map(cb => cb.id.replace('category-', ''));
                    
                    if (selectedValues.length === 0) {
                        // If none selected, default to all
                        document.getElementById('category-all').checked = true;
                        activeFilters.category = null;
                        activeFilters.categories = [];
                    } else {
                        // Update with selected values
                        activeFilters.categories = selectedValues;
                        activeFilters.category = null; // Clear single category
                    }
                }
                
                // Update UI and URL
                    updateFilterUI();
            }
            
            filterContainer.appendChild(selectionBox);
            
            // Create helper text
            const helperText = document.createElement('div');
            helperText.className = 'filter-helper-text';
            helperText.textContent = 'Click on a category to select/deselect';
            filterContainer.appendChild(helperText);
            
            // Add the filter container to the details element
            detailsElement.appendChild(filterContainer);
            
            // Add the details to the accordion container
            accordionContainer.appendChild(detailsElement);
            
            // Add the accordion container to the accordion group
            accordionGroup.appendChild(accordionContainer);
            
            // Create filter status badge for the summary to show count
            updateCategoryFilterBadge();
        }

        // MODIFIED: Set up tags filter UI with selection box
        function setupTagsFilter(accordionGroup) {
            if (!safeConfig.ui?.showTags) return;
            
            // Get all unique tags
            const allTags = new Set();
            if (pdfData && pdfData.pdfs) {
                pdfData.pdfs.forEach(pdf => {
                    if (pdf.tags && Array.isArray(pdf.tags)) {
                        pdf.tags.forEach(tag => allTags.add(tag));
                    }
                });
            }
            
            // Sort tags alphabetically
            const sortedTags = Array.from(allTags).sort();
            
            if (sortedTags.length > 0) {
                // Create accordion container
                const accordionContainer = document.createElement('div');
                accordionContainer.className = 'rpdf-accordion-container';
                
                // Create details element for accordion behavior
                const detailsElement = document.createElement('details');
                detailsElement.className = 'rpdf-filter-details';
                // Open by default if tags are active
                detailsElement.open = activeFilters.tags && activeFilters.tags.length > 0;
                
                // Create summary element (header)
                const summaryElement = document.createElement('summary');
                summaryElement.className = 'rpdf-filter-summary';
                summaryElement.textContent = 'Tags';
                detailsElement.appendChild(summaryElement);
                
                // Create tags container inside the details
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'tags-filter-container';
                
                const tagsTitle = document.createElement('div');
                tagsTitle.className = 'filter-label';
                tagsTitle.textContent = 'Select tags:';
                tagsContainer.appendChild(tagsTitle);
                
                // Create selection box container
                const selectionBox = document.createElement('div');
                selectionBox.className = 'select-box tags-select';
                selectionBox.setAttribute('aria-label', 'Select tags');
                
                // Add tags as options
                sortedTags.forEach(tag => {
                    const option = document.createElement('div');
                    option.className = 'tag-option' + (activeFilters.tags.includes(tag) ? ' selected' : '');
                    option.setAttribute('data-value', tag);
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = activeFilters.tags.includes(tag);
                    checkbox.id = 'tag-' + tag.replace(/\s+/g, '-').toLowerCase();
                    
                    const label = document.createElement('label');
                    label.setAttribute('for', 'tag-' + tag.replace(/\s+/g, '-').toLowerCase());
                    label.textContent = tag;
                    
                    option.appendChild(checkbox);
                    option.appendChild(label);
                    selectionBox.appendChild(option);
                    
                    // Add click event to the entire option div
                    option.addEventListener('click', (e) => {
                        // Ignore clicks on checkbox (it handles its own state)
                        if (e.target !== checkbox) {
                            checkbox.checked = !checkbox.checked;
                        }
                        
                        updateTagSelections();
                    });
                });
                
                // Function to update activeFilters based on checkbox selections
                function updateTagSelections() {
                    const checked = Array.from(selectionBox.querySelectorAll('input[type="checkbox"]:checked'));
                    const selectedTags = checked.map(cb => cb.parentNode.getAttribute('data-value'));
                    
                    // Update active filters
                    setTags(selectedTags);
                    updateFilterUI();
                    
                    // Update the tag filter badge
                    updateTagFilterBadge();
                }
                
                tagsContainer.appendChild(selectionBox);
                
                // Create helper text
                const helperText = document.createElement('div');
                helperText.className = 'filter-helper-text';
                helperText.textContent = 'Click on a tag to select/deselect';
                tagsContainer.appendChild(helperText);
                
                // Add the tags container to the details element
                detailsElement.appendChild(tagsContainer);
                
                // Add the details to the accordion container
                accordionContainer.appendChild(detailsElement);
                
                // Add the accordion container to the accordion group
                accordionGroup.appendChild(accordionContainer);
                
                // Create filter status badge for the summary to show count
                updateTagFilterBadge();
            }
        }
        
        // NEW: Update category filter badge
        function updateCategoryFilterBadge() {
            const summary = document.querySelector('.rpdf-filter-details:first-of-type .rpdf-filter-summary');
            if (!summary) return;
            
            // Remove existing badge
            const existingBadge = summary.querySelector('.filter-badge');
            if (existingBadge) {
                summary.removeChild(existingBadge);
            }
            
            // Add badge if categories are selected
            if (activeFilters.categories.length > 0 || activeFilters.category) {
                const badge = document.createElement('span');
                badge.className = 'filter-badge';
                
                const count = activeFilters.categories.length || (activeFilters.category ? 1 : 0);
                badge.textContent = count;
                
                summary.appendChild(badge);
            }
        }
        
        // NEW: Update tag filter badge
        function updateTagFilterBadge() {
            const summary = document.querySelector('.rpdf-filter-details:nth-of-type(2) .rpdf-filter-summary');
            if (!summary) return;
            
            // Remove existing badge
            const existingBadge = summary.querySelector('.filter-badge');
            if (existingBadge) {
                summary.removeChild(existingBadge);
            }
            
            // Add badge if tags are selected
            if (activeFilters.tags.length > 0) {
                const badge = document.createElement('span');
                badge.className = 'filter-badge';
                badge.textContent = activeFilters.tags.length;
                
                summary.appendChild(badge);
            }
        }

        // MODIFIED: Update filter UI to reflect active filters and update all badges
        function updateFilterUI() {
            // Update URL parameters
            const params = new URLSearchParams(window.location.search);
            
            // Handle categories (plural for multiple, singular for backward compatibility)
            if (activeFilters.categories && activeFilters.categories.length > 0) {
                params.set('categories', activeFilters.categories.join(','));
                // Also keep the singular version for backward compatibility
                if (activeFilters.categories.length === 1) {
                    params.set('category', activeFilters.categories[0]);
                } else {
                    params.delete('category');
                }
            } else {
                params.delete('categories');
                params.delete('category');
            }
            
            // Handle tags
            if (activeFilters.tags && activeFilters.tags.length > 0) {
                params.set('tags', activeFilters.tags.join(','));
            } else {
                params.delete('tags');
            }
            
            // Handle search
            if (activeFilters.searchTerm && activeFilters.searchTerm.trim() !== '') {
                params.set('search', activeFilters.searchTerm.trim());
            } else {
                params.delete('search');
            }
            
            // Handle source
            if (activeFilters.source && activeFilters.source.trim() !== '') {
                params.set('source', activeFilters.source.trim());
            } else {
                params.delete('source');
            }
            
            // Update URL without refreshing
            const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
            window.history.pushState({ path: newUrl }, '', newUrl);
            
            // Update UI elements to reflect active filters
            updateUIElements();
            
            // Update filter indicators
            const filterIndicator = document.getElementById('filter-indicator');
            if (filterIndicator) {
                const activeFiltersCount = 
                    (activeFilters.categories?.length || 0) + 
                    (activeFilters.tags?.length || 0) + 
                    (activeFilters.searchTerm ? 1 : 0) + 
                    (activeFilters.source ? 1 : 0);
                
                if (activeFiltersCount > 0) {
                    filterIndicator.textContent = `Active filters: ${activeFiltersCount}`;
                    filterIndicator.style.display = 'block';
                } else {
                    filterIndicator.style.display = 'none';
                }
            }
            
            // Update all filter badges
            updateCategoryFilterBadge();
            updateTagFilterBadge();
            updateSearchFilterBadge();
            
            // Check if any filters are active
            const hasActiveFilters = 
                activeFilters.categories.length > 0 ||
                activeFilters.searchTerm || 
                (activeFilters.tags && activeFilters.tags.length > 0) ||
                activeFilters.source;
            
            // Add or remove clear filters button
            addOrRemoveClearFiltersButton(hasActiveFilters);
            
            // Apply filters to PDFs
            filterPDFs();
        }
        
        // NEW: Update UI elements to reflect active filters
        function updateUIElements() {
            // Update category checkboxes if they exist
            const categoryOptions = document.querySelectorAll('.category-filters .tag-option');
            if (categoryOptions.length > 0) {
                // Update "All Categories" option
                const allOption = document.getElementById('category-all');
                if (allOption) {
                    allOption.checked = activeFilters.categories.length === 0;
                    allOption.parentElement.classList.toggle('selected', activeFilters.categories.length === 0);
                }
                
                // Update category options
                categoryOptions.forEach(option => {
                    const value = option.getAttribute('data-value');
                    if (value) { // Skip "All Categories" option
                        const checkbox = option.querySelector('input[type="checkbox"]');
                        const isSelected = activeFilters.categories.includes(value);
                        if (checkbox) checkbox.checked = isSelected;
                        option.classList.toggle('selected', isSelected);
                    }
                });
            }
            
            // Update tag checkboxes
            const tagOptions = document.querySelectorAll('.tags-filter-container .tag-option');
            tagOptions.forEach(option => {
                const value = option.getAttribute('data-value');
                const checkbox = option.querySelector('input[type="checkbox"]');
                const isSelected = activeFilters.tags.includes(value);
                if (checkbox) checkbox.checked = isSelected;
                option.classList.toggle('selected', isSelected);
            });
            
            // Update search input if exists
            const searchInput = document.querySelector('.search-input');
            if (searchInput && searchInput.value !== activeFilters.searchTerm) {
                searchInput.value = activeFilters.searchTerm || '';
            }
            
            // Find the accordion sections by looking at their summaries
            const summaries = document.querySelectorAll('.rpdf-filter-summary');
            
            // Open accordions if they have active filters
            summaries.forEach(summary => {
                const text = summary.textContent || '';
                const details = summary.closest('.rpdf-filter-details');
                
                if (!details) return;
                
                if (text.includes('Categories') && activeFilters.categories.length > 0) {
                    details.open = true;
                } else if (text.includes('Tags') && activeFilters.tags.length > 0) {
                    details.open = true;
                } else if (text.includes('Search') && activeFilters.searchTerm) {
                    details.open = true;
                }
            });
        }

        // NEW: Add or remove clear filters button
        function addOrRemoveClearFiltersButton(hasActiveFilters) {
            // Remove existing button if it exists
            const existingButton = document.getElementById('clear-filters-button');
            if (existingButton) {
                existingButton.parentNode.removeChild(existingButton);
            }
            
            // If filters are active, add a clear filters button
            if (hasActiveFilters) {
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'clear-filters-container';
                
                const clearButton = document.createElement('button');
                clearButton.id = 'clear-filters-button';
                clearButton.className = 'clear-filters-button';
                clearButton.textContent = 'Clear Filters';
                clearButton.setAttribute('aria-label', 'Clear all active filters');
                
                clearButton.addEventListener('click', () => {
                    // Reset filters but not history
                    activeFilters = {
                        category: null,
                        categories: [],
                        searchTerm: '',
                        source: null,
                        tags: []
                    };
                    
                    // Update URL
                    updateUrlWithFilters();
                    
                    // Update UI
                    updateFilterUI();
                });
                
                buttonContainer.appendChild(clearButton);
                
                // Insert after the last accordion but inside the accordion group
                const accordionGroup = document.getElementById('filters-group');
                if (accordionGroup) {
                    // Position after all accordion containers but before any other content
                    accordionGroup.appendChild(buttonContainer);
                } else if (elements.randomButton && elements.randomButton.parentNode) {
                    // Fallback to original behavior if accordion group not found
                    elements.randomButton.parentNode.insertBefore(buttonContainer, elements.randomButton);
                }
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
                
                // More specific error messages
                let errorMessage = 'Failed to load a random PDF';
                
                if (error.message && error.message.includes('No PDFs match your current filters')) {
                    if (activeFilters.category) {
                        const categoryName = pdfData?.metadata?.categories.find(c => c.id === activeFilters.category)?.name || activeFilters.category;
                        errorMessage = `No PDFs found in the "${categoryName}" category`;
                        
                        // Add additional filter information if multiple filters are active
                        if (activeFilters.tags && activeFilters.tags.length > 0) {
                            errorMessage += ` with the selected tags`;
                        }
                        if (activeFilters.searchTerm) {
                            errorMessage += ` matching "${activeFilters.searchTerm}"`;
                        }
                    } else if (activeFilters.tags && activeFilters.tags.length > 0) {
                        errorMessage = `No PDFs found with the selected tags`;
                        if (activeFilters.searchTerm) {
                            errorMessage += ` matching "${activeFilters.searchTerm}"`;
                        }
                    } else if (activeFilters.searchTerm) {
                        errorMessage = `No PDFs found matching "${activeFilters.searchTerm}"`;
                    } else {
                        errorMessage = 'No PDFs match your current filters';
                    }
                    
                    // Suggest resetting filters
                    errorMessage += '. Try removing some filters.';
                } else if (error.message && error.message.includes('No PDFs available')) {
                    errorMessage = 'No PDFs available';
                }
                
                showError(elements, errorMessage);
                
                if (safeConfig.debug) {
                    console.error('Error getting random PDF:', error);
                }
            }
        }

        // MODIFIED: Handle reset functionality to clear categories array
        function handleResetHistory() {
            clearHistory(storage);
            pdfData = null;
            viewHistory = [];
            
            // Reset filters
            activeFilters = {
                category: safeConfig.ui?.defaultCategory || null,
                categories: [],
                searchTerm: '',
                source: null,
                tags: []
            };
            
            // Update URL
            updateUrlWithFilters();
            
            // Clear localStorage filters if enabled
            if (safeConfig.rememberFilters) {
                storage.removeItem('rpdf_lastCategory');
                storage.removeItem('rpdf_lastCategories');
                storage.removeItem('rpdf_lastTags');
                storage.removeItem('rpdf_lastSearchTerm');
                storage.removeItem('rpdf_lastSource');
            }
            
            // Update UI
            updateFilterUI();
        }

        // MODIFIED: Initialize function with connected accordion group
        async function initialize() {
            try {
                showLoading(elements);
                
                // Load data first
                pdfData = await loadPdfData();
                
                // Load view history
                viewHistory = getViewHistory(storage);
                
                // Parse URL parameters (if enabled)
                if (safeConfig.enableUrlParameters) {
                    parseUrlParameters();
                }
                
                // Set up event listeners
                elements.randomButton.addEventListener('click', handleRandomButtonClick);
                elements.resetHistory.addEventListener('click', handleResetHistory);
                
                // Handle browser back/forward navigation
                window.addEventListener('popstate', () => {
                    parseUrlParameters();
                    updateFilterUI();
                });
                
                // Create accordion group container for all filters
                const accordionGroup = document.createElement('div');
                accordionGroup.className = 'rpdf-accordion-group';
                accordionGroup.id = 'filters-group';
                
                // Add a heading to match help section style
                const filtersHeading = document.createElement('h2');
                filtersHeading.className = 'rpdf-filters-heading';
                filtersHeading.textContent = 'Filter Options';
                accordionGroup.appendChild(filtersHeading);
                
                // Insert accordion group before the help section instead of the random button
                const helpSection = document.querySelector('.help-section');
                if (helpSection) {
                    helpSection.parentNode.insertBefore(accordionGroup, helpSection);
                } else if (elements.randomButton && elements.randomButton.parentNode) {
                    // Fallback to the old position if help section not found
                    elements.randomButton.parentNode.insertBefore(accordionGroup, elements.randomButton);
                }
                
                // Setup UI components after data is loaded
                if (pdfData && pdfData.metadata) {
                    // Enable search if configured
                    if (safeConfig.search?.enableFullTextSearch) {
                        setupSearchUI(elements, activeFilters, updateFilterUI, setSearchTerm, accordionGroup);
                    }
                    
                    // Set up category filters
                    setupCategoryFilters(accordionGroup);
                    
                    // Set up tag filters
                    setupTagsFilter(accordionGroup);
                
                    // Restore saved filters if enabled and not already set by URL
                    if (safeConfig.rememberFilters && !safeConfig.enableUrlParameters) {
                        const savedCategory = storage.getItem('rpdf_lastCategory');
                        if (savedCategory) {
                            activeFilters.category = savedCategory === '' ? null : savedCategory;
                        }
                        
                        const savedTags = storage.getItem('rpdf_lastTags');
                        if (savedTags) {
                            try {
                                activeFilters.tags = JSON.parse(savedTags) || [];
                            } catch (e) {
                                activeFilters.tags = [];
                            }
                        }
                        
                        const savedSearchTerm = storage.getItem('rpdf_lastSearchTerm');
                        if (savedSearchTerm) {
                            activeFilters.searchTerm = savedSearchTerm;
                        }
                    }
                    
                    updateFilterUI();
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
            setTags,
            setSearchTerm,
            setSource,
            getActiveFilters: () => ({...activeFilters}),
            updateUrlWithFilters,
            parseUrlParameters
        };
    }

    // MODIFIED: Setup search UI with accordion style
    function setupSearchUI(elements, activeFilters, updateFilterUI, setSearchTerm, accordionGroup) {
        // Create accordion container
        const accordionContainer = document.createElement('div');
        accordionContainer.className = 'rpdf-accordion-container';
        
        // Create details element for accordion behavior
        const detailsElement = document.createElement('details');
        detailsElement.className = 'rpdf-filter-details';
        // Open by default if search is active
        detailsElement.open = activeFilters.searchTerm && activeFilters.searchTerm.length > 0;
        
        // Create summary element (header)
        const summaryElement = document.createElement('summary');
        summaryElement.className = 'rpdf-filter-summary';
        summaryElement.textContent = 'Search';
        detailsElement.appendChild(summaryElement);
        
        // Create search container inside the details
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        // Add label for consistency with other filters
        const searchLabel = document.createElement('div');
        searchLabel.className = 'filter-label';
        searchLabel.textContent = 'Search for PDFs:';
        searchContainer.appendChild(searchLabel);
        
        // Create search input wrapper for better styling
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'search-input-wrapper';
        
        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Enter search terms...';
        searchInput.className = 'search-input';
        searchInput.setAttribute('aria-label', 'Search PDFs');
        searchInput.value = activeFilters.searchTerm || '';
        
        // Add debounced search handler
        let debounceTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                setSearchTerm(e.target.value);
                updateFilterUI();
                updateSearchFilterBadge();
            }, 300);
        });
        
        // Create search button
        const searchButton = document.createElement('button');
        searchButton.textContent = 'Search';
        searchButton.className = 'search-button';
        searchButton.addEventListener('click', () => {
            setSearchTerm(searchInput.value);
            updateFilterUI();
            updateSearchFilterBadge();
        });
        
        // Add to input wrapper
        inputWrapper.appendChild(searchInput);
        inputWrapper.appendChild(searchButton);
        searchContainer.appendChild(inputWrapper);
        
        // Create filter indicator
        const filterIndicator = document.createElement('div');
        filterIndicator.id = 'filter-indicator';
        filterIndicator.className = 'filter-indicator';
        searchContainer.appendChild(filterIndicator);
        
        // Add the search container to the details element
        detailsElement.appendChild(searchContainer);
        
        // Add the details to the accordion container
        accordionContainer.appendChild(detailsElement);
        
        // Add the accordion container to the accordion group
        accordionGroup.appendChild(accordionContainer);
        
        // Create filter status badge for the summary to show active search
        updateSearchFilterBadge();
    }
    
    // NEW: Update search filter badge
    function updateSearchFilterBadge() {
        const summary = document.querySelector('.rpdf-filter-details:first-of-type .rpdf-filter-summary');
        if (!summary || summary.textContent !== 'Search') return;
        
        // Remove existing badge
        const existingBadge = summary.querySelector('.filter-badge');
        if (existingBadge) {
            summary.removeChild(existingBadge);
        }
        
        // Add badge if search is active
        if (activeFilters.searchTerm && activeFilters.searchTerm.length > 0) {
            const badge = document.createElement('span');
            badge.className = 'filter-badge';
            badge.textContent = '✓';
            
            summary.appendChild(badge);
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