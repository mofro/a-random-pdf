/**
 * validate-links.js - Script to check PDF links and update availability status
 * Contributors: Maurice Gaston, Claude https://claude.ai
 * Last Updated: March 2025
 * 
 * Usage: node validate-links.js
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

// Configuration
const CONFIG = {
    // Default path for production environment
    DATA_FILE: path.join(__dirname, '../../public/data/pdf-data.json'),
    
    // Timeout for HTTP requests in milliseconds
    TIMEOUT_MS: 10000, 
    
    // Number of simultaneous requests
    CONCURRENCY_LIMIT: 5,
    
    // Delay between batches in milliseconds
    BATCH_DELAY_MS: 500,
    
    // Environment detection (can be overridden by env variables)
    IS_DEV: process.env.NODE_ENV === 'development',
    
    // Debug mode
    DEBUG: process.env.DEBUG === 'true' || false
};

// Adjust path for development environment
if (CONFIG.IS_DEV) {
    CONFIG.DATA_FILE = path.join(__dirname, '../../dev/data/pdf-data.json');
}

// Override with command line arguments if provided
process.argv.forEach((arg, index) => {
    if (arg === '--data-file' && process.argv[index + 1]) {
        CONFIG.DATA_FILE = process.argv[index + 1];
    } else if (arg === '--timeout' && process.argv[index + 1]) {
        CONFIG.TIMEOUT_MS = parseInt(process.argv[index + 1], 10);
    } else if (arg === '--concurrency' && process.argv[index + 1]) {
        CONFIG.CONCURRENCY_LIMIT = parseInt(process.argv[index + 1], 10);
    } else if (arg === '--debug') {
        CONFIG.DEBUG = true;
    }
});

/**
 * Check if a URL is accessible and returns valid content
 * @param {string} url - The URL to check
 * @returns {Promise<Object>} Result of the check including availability and status
 */
function checkUrl(url) {
    return new Promise((resolve) => {
        // Determine protocol based on URL
        const protocol = url.startsWith('https') ? https : http;
        
        if (CONFIG.DEBUG) {
            console.log(`Checking URL: ${url}`);
        }
        
        const request = protocol.get(url, { timeout: CONFIG.TIMEOUT_MS }, (response) => {
            // Check if response is successful (200-299) or a redirect
            const isSuccess = response.statusCode >= 200 && response.statusCode < 300;
            const isRedirect = response.statusCode >= 300 && response.statusCode < 400;
            
            if (isSuccess) {
                // For PDFs, we could check Content-Type, but some servers misconfigure this
                // So we'll just trust the URL and status code
                resolve({ available: true, status: response.statusCode });
            } else if (isRedirect) {
                // Follow one level of redirect manually
                const newUrl = response.headers.location;
                if (newUrl) {
                    console.log(`Following redirect: ${url} → ${newUrl}`);
                    // Recursively check the new URL
                    checkUrl(newUrl)
                        .then(result => resolve(result))
                        .catch(() => resolve({ available: false, status: 'Redirect failed' }));
                } else {
                    resolve({ available: false, status: 'Invalid redirect' });
                }
            } else {
                resolve({ available: false, status: response.statusCode });
            }
            
            // Consume response data to free up memory
            response.resume();
        });
        
        request.on('error', (err) => {
            resolve({ available: false, status: err.message });
        });
        
        request.on('timeout', () => {
            request.destroy();
            resolve({ available: false, status: 'Timeout' });
        });
    });
}

/**
 * Validate PDF links and update their status in the data file
 */
async function validateLinks() {
    try {
        console.log(`Using data file: ${CONFIG.DATA_FILE}`);
        
        // Ensure the data file exists
        if (!fs.existsSync(CONFIG.DATA_FILE)) {
            throw new Error(`Data file not found: ${CONFIG.DATA_FILE}`);
        }
        
        // Read the data file
        const rawData = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);
        
        console.log(`Found ${data.pdfs.length} PDFs to validate`);
        
        // Track changes for reporting
        let unavailableCount = 0;
        let changedCount = 0;
        let checkedCount = 0;
        
        // Process PDFs in batches to limit concurrency
        for (let i = 0; i < data.pdfs.length; i += CONFIG.CONCURRENCY_LIMIT) {
            const batch = data.pdfs.slice(i, i + CONFIG.CONCURRENCY_LIMIT);
            const batchPromises = batch.map(async (pdf) => {
                checkedCount++;
                console.log(`[${checkedCount}/${data.pdfs.length}] Checking [${pdf.id}]: ${pdf.title}`);
                
                const result = await checkUrl(pdf.url);
                const wasAvailable = pdf.isAvailable;
                
                // Update PDF data
                pdf.isAvailable = result.available;
                pdf.lastChecked = new Date().toISOString().split('T')[0];
                pdf.lastStatus = result.status;
                
                // Track changes
                if (!result.available) {
                    unavailableCount++;
                }
                
                if (wasAvailable !== result.available) {
                    changedCount++;
                    console.log(`Status changed for [${pdf.id}]: ${pdf.title} - Now ${result.available ? 'Available' : 'Unavailable'} (${result.status})`);
                }
                
                return pdf;
            });
            
            // Wait for all PDFs in this batch to be checked
            await Promise.all(batchPromises);
            
            // Add a small delay between batches to avoid hammering servers
            await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY_MS));
            
            // Optional: Save progress periodically
            if (CONFIG.DEBUG && i > 0 && i % 50 === 0) {
                const tempData = { ...data, lastValidated: new Date().toISOString() };
                fs.writeFileSync(CONFIG.DATA_FILE + '.temp', JSON.stringify(tempData, null, 2), 'utf8');
                console.log(`Saved progress at ${i}/${data.pdfs.length} PDFs`);
            }
        }
        
        // Update the last validated timestamp
        data.lastValidated = new Date().toISOString();
        
        // Write the updated data back to the file
        fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        
        console.log('|Validation completed:');
        console.log(`- ${data.pdfs.length} PDFs checked`);
        console.log(`- ${unavailableCount} PDFs currently unavailable`);
        console.log(`- ${changedCount} PDFs changed status`);
        console.log(`- Results saved to ${CONFIG.DATA_FILE}`);
        console.log(`- Last validated: ${data.lastValidated}`);
        
        // Clean up any temporary files
        if (fs.existsSync(CONFIG.DATA_FILE + '.temp')) {
            fs.unlinkSync(CONFIG.DATA_FILE + '.temp');
        }
        
    } catch (error) {
        console.error('Error validating links:', error);
        process.exit(1);
    }
}

// Run the validation if this script is executed directly
if (require.main === module) {
    validateLinks();
}

// Export for potential use in other scripts
module.exports = { validateLinks, checkUrl };