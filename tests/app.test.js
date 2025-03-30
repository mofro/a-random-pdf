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
            sourceQuery: "test, pdf"
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
            sourceQuery: "test, pdf"
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

    // Mock fetch
    const mockFetch = jest.fn(() =>
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

    // Import the app module
    const RPDF = require('../public/js/app');
    
    // Initialize the app with mocked dependencies
    const app = RPDF({
        elements: mockElements,
        storage: mockStorage,
        fetch: mockFetch,
        config: {
            maxHistorySize: 50,
            dataPath: 'data/pdf-data.json',
            debug: false
        }
    });

    return { app, mockElements, mockStorage, mockFetch };
}

// Cleanup after tests
function cleanupTestEnvironment() {
    // Clear all event listeners
    const newBody = document.body.cloneNode(false);
    document.body.parentNode.replaceChild(newBody, document.body);
    
    // Clear mocks
    jest.clearAllMocks();
    
    // Reset window.RPDF_CONFIG
    delete window.RPDF_CONFIG;
    
    // Reset RPDF namespace
    delete window.RPDF;
}

// Test suite
describe('PDF Explorer Tests', () => {
    let app;
    let mockElements;
    let mockStorage;
    let mockFetch;

    beforeEach(() => {
        ({ app, mockElements, mockStorage, mockFetch } = setupTestEnvironment());
    });
    afterEach(cleanupTestEnvironment);

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
        // Mock fetch to simulate an error
        mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

        // Get the button and simulate click
        const randomButton = document.getElementById('randomButton');
        randomButton.click();

        // Wait for all promises to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
        await Promise.resolve(); // Wait for microtask queue

        // Verify error is displayed
        const errorDisplay = document.getElementById('errorDisplay');
        expect(errorDisplay.classList.contains('hidden')).toBe(false);
        expect(errorDisplay.textContent).toContain('Failed to load a random PDF');
    });

    test('should handle invalid PDF data gracefully', async () => {
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
        await new Promise(resolve => setTimeout(resolve, 0));
        await Promise.resolve(); // Wait for microtask queue

        // Verify error is displayed
        const errorDisplay = document.getElementById('errorDisplay');
        expect(errorDisplay.classList.contains('hidden')).toBe(false);
        expect(errorDisplay.textContent).toContain('No PDFs available');
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

    test('addToHistory should respect MAX_HISTORY_SIZE', () => {
        const largeHistory = Array.from({ length: 60 }, (_, i) => `pdf${i + 1}`);
        mockStorage.getItem.mockReturnValueOnce(JSON.stringify(largeHistory));
        
        app.addToHistory('pdf61');
        
        const savedHistory = JSON.parse(mockStorage.setItem.mock.calls[0][1]);
        expect(savedHistory.length).toBe(50);
        expect(savedHistory[49]).toBe('pdf61');
    });
});



