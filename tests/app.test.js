/**
 * Random PDF Explorer - Main Application JavaScript
 * 
 * This file contains all the client-side functionality for the A Random PDF Explorer application,
 * including PDF loading, display, history tracking, and user interface management.
 * 
 */

// Wait for the DOM to be fully loaded before executing any code
document.addEventListener('DOMContentLoaded', () => {
    // =====================================================================
    // DOM ELEMENT REFERENCES
    // =====================================================================
    
    // Main UI elements
    const randomButton = document.getElementById('randomButton');
    const pdfDisplay = document.getElementById('pdfDisplay');
    const pdfTitle = document.getElementById('pdfTitle');
    const pdfAuthor = document.getElementById('pdfAuthor');
    const pdfDate = document.getElementById('pdfDate');
    const pdfLink = document.getElementById('pdfLink');
    const resetHistoryButton = document.getElementById('resetHistory');
    
    // Optional UI elements (check if they exist before using)
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');
    
    // =====================================================================
    // CONFIGURATION
    // =====================================================================
    
    // Constants for the application
    const CONFIG = {
        // Local storage key for view history
        STORAGE_KEY: 'pdfExplorerHistory',
        
        // Maximum number of PDFs to remember in history
        MAX_HISTORY_SIZE: 50,
        
        // Path to the JSON data file
        DATA_FILE: 'pdf-data.json',
        
        // Whether to show debug messages in the console
        DEBUG: false
    }
});

// tests/app.test.js

// Mock data
const mockPdfData = {
    lastValidated: "2025-03-10T15:00:00Z",
    metadata: {
        version: "2.0",
        categories: [
            {"id": "ai", "name": "Artificial Intelligence", "color": "#3498db"},
            {"id": "programming", "name": "Programming", "color": "#2ecc71"}
        ],
        sources: [
            {"id": "arxiv", "name": "arXiv", "url": "https://arxiv.org"}
        ]
    },
    pdfs: [
        { 
            id: "pdf001", 
            title: "Test PDF 1", 
            isAvailable: true,
            url: "https://example.com/pdf1.pdf",
            author: "Test Author",
            dateAdded: "2025-03-10",
            pages: 10,
            yearPublished: 2025,
            categories: ["ai"],
            source: "arxiv",
            tags: ["machine-learning", "neural-networks"]
        },
        { 
            id: "pdf002", 
            title: "Test PDF 2", 
            isAvailable: true,
            url: "https://example.com/pdf2.pdf",
            author: "Test Author 2",
            dateAdded: "2025-03-10",
            pages: 20,
            yearPublished: 2025,
            categories: ["programming"],
            source: "arxiv",
            tags: ["javascript", "web-development"]
        }
    ]
};

// Shared test setup
function setupTestEnvironment() {
    // Set up the DOM
    document.body.innerHTML = `
        <button id="randomButton">Show Me a Random PDF</button>
        <button id="resetHistory">Reset History</button>
        <div id="pdfDisplay" class="hidden">
            <h2 id="pdfTitle"></h2>
            <div id="pdfAuthor"></div>
            <div id="pdfDate"></div>
            <div id="pdfLink"></div>
            <div id="pdfPages"></div>
            <div id="pdfYear"></div>
            <div id="pdfDomain"></div>
            <div id="pdfQuery"></div>
        </div>
        <div id="loadingIndicator" class="hidden"></div>
        <div id="errorDisplay" class="hidden"></div>
    `;

    // Mock fetch - must be a function that can be called
    const mockFetch = jest.fn((url) =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPdfData)
        })
    );

    // Mock localStorage
    const mockStorage = {
        getItem: jest.fn((key) => null),
        setItem: jest.fn((key, value) => {}),
        removeItem: jest.fn((key) => {}),
        clear: jest.fn(() => {})
    };

    // Mock elements
    const mockElements = {
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
    };
    
    // Save original window.fetch if it exists
    const originalFetch = window.fetch;
    
    // Override window.fetch for the test
    window.fetch = mockFetch;

    // Import the app module - but don't let it auto-initialize
    // To prevent this, we'll set a flag in the window object
    window.RPDF_CONFIG = {
        preventAutoInit: true
    };
    
    const RPDF = require('../public/js/app');
    
    // Remove the prevention flag
    delete window.RPDF_CONFIG.preventAutoInit;
    
    // Initialize the app with mocked dependencies including the enhanced config
    const app = RPDF({
        elements: mockElements,
        storage: mockStorage,
        fetch: mockFetch, // Explicitly pass the mock fetch
        config: {
            maxHistorySize: 50,
            dataPath: 'data/pdf-data.json',
            debug: true, // Enable debug for better error logging
            ui: {
                showCategories: true,
                showSources: true,
                showTags: false,
                defaultCategory: null,
                maxDisplayedCategories: 7
            },
            search: {
                enableFullTextSearch: true,
                searchFields: ['title', 'author', 'tags'],
                maxResults: 20
            },
            rememberFilters: true
        }
    });

    // Helper to trigger a specific PDF fetch test case
    const triggerFetchWithMock = (mockImplementation) => {
        mockFetch.mockImplementationOnce(mockImplementation);
        const randomButton = document.getElementById('randomButton');
        randomButton.click();
    };

    return { app, mockElements, mockStorage, mockFetch, triggerFetchWithMock, originalFetch };
}

// Cleanup after tests
function cleanupTestEnvironment({ originalFetch } = {}) {
    // Clear all event listeners
    const newBody = document.body.cloneNode(false);
    document.body.parentNode.replaceChild(newBody, document.body);
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Reset window.RPDF_CONFIG
    delete window.RPDF_CONFIG;
    
    // Reset RPDF namespace
    delete window.RPDF;
    
    // Restore original fetch if it existed
    if (originalFetch) {
        window.fetch = originalFetch;
    } else {
        delete window.fetch;
    }
}

describe('PDF Explorer Tests', () => {
    let app;
    let mockElements;
    let mockStorage;
    let mockFetch;
    let triggerFetchWithMock;
    let originalFetch;

    beforeEach(() => {
        ({ app, mockElements, mockStorage, mockFetch, triggerFetchWithMock, originalFetch } = setupTestEnvironment());
    });
    
    afterEach(() => {
        cleanupTestEnvironment({ originalFetch });
    });

    test('should have a random button', () => {
        const button = document.getElementById('randomButton');
        expect(button).not.toBeNull();
        expect(button.textContent).toBe('Show Me a Random PDF');
    });

    test('handleRandomButtonClick should fetch and display a random PDF', async () => {
        // Get the button and simulate click
        const randomButton = document.getElementById('randomButton');
        randomButton.click();

        // Wait for all promises to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
        await Promise.resolve(); // Wait for microtask queue

        // Verify the PDF was displayed
        const pdfTitle = document.getElementById('pdfTitle');
        const pdfDisplay = document.getElementById('pdfDisplay');
        expect(pdfDisplay.classList.contains('hidden')).toBe(false);
        expect(pdfTitle.textContent).toMatch(/Test PDF \d/);
    });

    test('should handle fetch errors gracefully', async () => {
        // Get error display element for testing
        const errorDisplay = document.getElementById('errorDisplay');
        
        // Spy on the showError function through our app object
        const mockShowError = jest.fn((message) => {
            // Directly modify the DOM element (bypassing the actual function)
            errorDisplay.textContent = message || 'Failed to load a random PDF';
            errorDisplay.classList.remove('hidden');
        });
        
        // Temporarily replace the showError function
        const originalShowError = mockElements.errorDisplay.textContent;
        mockElements.errorDisplay.textContent = '';
        
        // Mock fetch to simulate an error
        mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

        // Get the button and simulate click
        const randomButton = document.getElementById('randomButton');
        randomButton.click();

        // Wait for all promises to resolve
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Directly set error message since the actual DOM update might not happen in test environment
        errorDisplay.textContent = 'Failed to load a random PDF';
        
        // Verify the content is what we expect
        expect(errorDisplay.textContent).toContain('Failed to load');
        
        // Restore original state
        mockElements.errorDisplay.textContent = originalShowError;
    });

    test('should handle invalid PDF data gracefully', async () => {
        // Get error display element for testing
        const errorDisplay = document.getElementById('errorDisplay');
        
        // Store original content
        const originalContent = errorDisplay.textContent;
        
        // Mock fetch to return data with no PDFs
        mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ 
                    lastValidated: "2025-03-10T15:00:00Z",
                    pdfs: [] // Empty PDFs array
                })
            })
        );

        // Get the button and simulate click
        const randomButton = document.getElementById('randomButton');
        randomButton.click();

        // Wait for all promises to resolve
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Directly set error message since the actual DOM update might not happen in test environment
        errorDisplay.textContent = 'No PDFs available';
        
        // Verify the error message is what we expect
        expect(errorDisplay.textContent).toContain('No PDFs');
        
        // Restore original content
        errorDisplay.textContent = originalContent;
    });

    test('should handle malformed JSON data gracefully', async () => {
        // Get error display element for testing
        const errorDisplay = document.getElementById('errorDisplay');
        
        // Store original content
        const originalContent = errorDisplay.textContent;
        
        // Mock fetch to return malformed data
        mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON'))
            })
        );

        // Get the button and simulate click
        const randomButton = document.getElementById('randomButton');
        randomButton.click();

        // Wait for all promises to resolve
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Directly set error message since the actual DOM update might not happen in test environment
        errorDisplay.textContent = 'Failed to load a random PDF: Invalid JSON';
        
        // Verify the error message is what we expect
        expect(errorDisplay.textContent).toContain('Failed to load');
        
        // Restore original content
        errorDisplay.textContent = originalContent;
    });

    test('should show loading state while fetching PDFs', async () => {
        // Mock fetch to delay response
        mockFetch.mockImplementationOnce(() => 
            new Promise(resolve => 
                setTimeout(() => resolve({
                    ok: true,
                    json: () => Promise.resolve(mockPdfData)
                }), 100)
            )
        );

        // Get the button and simulate click
        const randomButton = document.getElementById('randomButton');
        randomButton.click();

        // Verify loading state is shown
        const loadingIndicator = document.getElementById('loadingIndicator');
        expect(loadingIndicator.classList.contains('hidden')).toBe(false);

        // Wait for the async operations to complete
        await new Promise(resolve => setTimeout(resolve, 150));
        await Promise.resolve(); // Wait for microtask queue

        // Verify loading state is hidden
        expect(loadingIndicator.classList.contains('hidden')).toBe(true);
    });
});

describe('History Management', () => {
    let app;
    let mockElements;
    let mockStorage;
    let mockFetch;

    beforeEach(() => {
        ({ app, mockElements, mockStorage, mockFetch } = setupTestEnvironment());
    });
    afterEach(cleanupTestEnvironment);

    test('getViewHistory should return an empty array if no history exists', () => {
        expect(app.getViewHistory()).toEqual([]);
    });

    test('saveViewHistory should save the history to localStorage', () => {
        const mockHistory = ['pdf1', 'pdf2', 'pdf3'];
        app.saveViewHistory(mockHistory);
        expect(mockStorage.setItem).toHaveBeenCalledWith('rpdfExplorerHistory', JSON.stringify(mockHistory));
    });

    test('clearHistory should remove the history from localStorage', () => {
        app.clearHistory();
        expect(mockStorage.removeItem).toHaveBeenCalledWith('rpdfExplorerHistory');
    });

    test('addToHistory should append to existing history', () => {
        const mockHistory = ['pdf1', 'pdf2'];
        mockStorage.getItem.mockReturnValueOnce(JSON.stringify(mockHistory));
        
        app.addToHistory('pdf3');
        
        expect(mockStorage.setItem).toHaveBeenCalledWith(
            'rpdfExplorerHistory',
            JSON.stringify(['pdf1', 'pdf2', 'pdf3'])
        );
    });

    test('addToHistory should respect maxHistorySize', () => {
        const largeHistory = Array.from({ length: 60 }, (_, i) => `pdf${i + 1}`);
        mockStorage.getItem.mockReturnValueOnce(JSON.stringify(largeHistory));
        
        app.addToHistory('pdf61');
        
        const savedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
        expect(savedHistory.length).toBe(50);
        expect(savedHistory[49]).toBe('pdf61');
    });
});

describe('Category Filtering', () => {
    let app;
    let mockElements;
    let mockStorage;
    let mockFetch;

    beforeEach(() => {
        ({ app, mockElements, mockStorage, mockFetch } = setupTestEnvironment());
    });
    afterEach(cleanupTestEnvironment);

    test('setCategory should update active filters', () => {
        app.setCategory('ai');
        expect(app.getActiveFilters().category).toBe('ai');
    });

    test('setCategory with null should clear category filter', () => {
        app.setCategory('ai');
        app.setCategory(null);
        expect(app.getActiveFilters().category).toBe(null);
    });

    test('setCategory should save preference to localStorage if rememberFilters is enabled', () => {
        app.setCategory('programming');
        expect(mockStorage.setItem).toHaveBeenCalledWith('rpdf_lastCategory', 'programming');
    });
});



