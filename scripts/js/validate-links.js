// validate-links.js - Script to check PDF links and update availability status
// Run with Node.js: node validate-links.js

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

// Configuration
const DATA_FILE = path.join(__dirname, '../../public/data/pdf-data.json');
const TIMEOUT_MS = 10000; // 10 seconds timeout for each request
const CONCURRENCY_LIMIT = 5; // Number of simultaneous requests

// Function to check if a URL is accessible
function checkUrl(url) {
    return new Promise((resolve) => {
        // Determine protocol
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, { timeout: TIMEOUT_MS }, (response) => {
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

// Main function
async function validateLinks() {
    try {
        // Read the data file
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);
        
        console.log(`Found ${data.pdfs.length} PDFs to validate`);
        
        // Track changes for reporting
        let unavailableCount = 0;
        let changedCount = 0;
        
        // Process PDFs in batches to limit concurrency
        for (let i = 0; i < data.pdfs.length; i += CONCURRENCY_LIMIT) {
            const batch = data.pdfs.slice(i, i + CONCURRENCY_LIMIT);
            const batchPromises = batch.map(async (pdf) => {
                console.log(`Checking [${pdf.id}]: ${pdf.title}`);
                
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
            
            // Optional: add a small delay between batches to avoid hammering servers
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Update the last validated timestamp
        data.lastValidated = new Date().toISOString();
        
        // Write the updated data back to the file
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        
        console.log('\nValidation completed:');
        console.log(`- ${data.pdfs.length} PDFs checked`);
        console.log(`- ${unavailableCount} PDFs currently unavailable`);
        console.log(`- ${changedCount} PDFs changed status`);
        
    } catch (error) {
        console.error('Error validating links:', error);
    }
}

// Run the validation
validateLinks();