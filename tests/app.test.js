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

// tests/app.test.js - Simplified version

// Import functions from the main application file
const { getViewHistory, saveViewHistory, addToHistory, clearHistory } = require('../public/js/app');

// Mock data
const mockPdfData = {
    lastValidated: "2025-03-10T15:00:00Z",
    pdfs: [
        { id: "pdf001", title: "Test PDF 1", isAvailable: true },
        { id: "pdf002", title: "Test PDF 2", isAvailable: true },
        { id: "pdf003", title: "Test PDF 3", isAvailable: true }
    ]
};

// Test suite
describe('PDF Explorer Tests', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <button id="randomButton">Show Me a Random PDF</button>
            <button id="resetHistory">Reset History</button>
            <div id="pdfDisplay" class="hidden">
                <h2 id="pdfTitle"></h2>
            </div>
        `;

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockPdfData)
            })
        );

        const localStorageMock = (() => {
            let store = {};
            return {
                getItem: jest.fn((key) => store[key] || null),
                setItem: jest.fn((key, value) => store[key] = value.toString()),
                removeItem: jest.fn((key) => delete store[key]),
                clear: jest.fn(() => store = {})
            };
        })();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });

    test('should have a random button', () => {
        const button = document.getElementById('randomButton');
        expect(button).not.toBeNull();
        expect(button.textContent).toBe('Show Me a Random PDF');
    });

    test('fetch function should be defined', () => {
        expect(typeof global.fetch).toBe('function');
    });

    test('handleRandomButtonClick should fetch and display a random PDF', async () => {
        const randomButton = document.getElementById('randomButton');
        randomButton.click();

        await new Promise(setImmediate);

        const pdfTitle = document.getElementById('pdfTitle');
        expect(pdfTitle.textContent).toMatch(/Test PDF \d/);
    });

    test('handleResetHistoryClick should clear the view history', () => {
        const resetHistoryButton = document.getElementById('resetHistory');
        localStorage.setItem('pdfExplorerHistory', JSON.stringify(['pdf001', 'pdf002']));
        resetHistoryButton.click();

        expect(localStorage.getItem('pdfExplorerHistory')).toBeNull();
    });

    test('should not repeat the same PDF before going through the entire buffer', async () => {
        const randomButton = document.getElementById('randomButton');
        const seenPdfs = new Set();

        for (let i = 0; i < mockPdfData.pdfs.length; i++) {
            randomButton.click();
            await new Promise(setImmediate);

            const pdfTitle = document.getElementById('pdfTitle').textContent;
            seenPdfs.add(pdfTitle);
        }

        expect(seenPdfs.size).toBe(mockPdfData.pdfs.length);
    });
});

describe('History Management', () => {
    const STORAGE_KEY = 'pdfExplorerHistory';
    const mockHistory = ['pdf1', 'pdf2', 'pdf3'];

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('getViewHistory should return an empty array if no history exists', () => {
        expect(getViewHistory()).toEqual([]);
    });

    test('getViewHistory should return the correct history from localStorage', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockHistory));
        expect(getViewHistory()).toEqual(mockHistory);
    });

    test('saveViewHistory should save the history to localStorage', () => {
        saveViewHistory(mockHistory);
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(mockHistory);
    });

    test('saveViewHistory should not exceed MAX_HISTORY_SIZE', () => {
        const largeHistory = Array.from({ length: 60 }, (_, i) => `pdf${i + 1}`);
        saveViewHistory(largeHistory);
        const savedHistory = JSON.parse(localStorage.getItem(STORAGE_KEY));
        expect(savedHistory.length).toBe(50);
        expect(savedHistory).toEqual(largeHistory.slice(10));
    });

    test('addToHistory should add a new PDF ID to the history', () => {
        addToHistory('pdf4');
        expect(getViewHistory()).toEqual(['pdf4']);
    });

    test('addToHistory should append to existing history', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockHistory));
        addToHistory('pdf4');
        expect(getViewHistory()).toEqual([...mockHistory, 'pdf4']);
    });

    test('clearHistory should remove the history from localStorage', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockHistory));
        clearHistory();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
});



