#!/usr/bin/env node

/**
 * Add URL Script
 * 
 * This script adds a specific PDF URL to the urls.json file.
 */

const fs = require('fs');
const path = require('path');
const config = require('./search-config');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  url: args.find(arg => arg.startsWith('--url='))?.split('=')[1],
  title: args.find(arg => arg.startsWith('--title='))?.split('=')[1],
  author: args.find(arg => arg.startsWith('--author='))?.split('=')[1],
  category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
  tags: args.find(arg => arg.startsWith('--tags='))?.split('=')[1]?.split(','),
  interactive: args.includes('--interactive') || args.includes('-i'),
  showHelp: args.includes('--help') || args.includes('-h')
};

// Add simple ID generator function
function generateId(prefix = 'url') {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}${randomStr}`;
}

// Show help and exit if requested
if (options.showHelp) {
  console.log(`
Add URL Script

This script adds a specific PDF URL to the urls.json file.

Usage:
  node add-url.js [options]

Options:
  --url=URL                The URL of the PDF to add
  --title=TITLE            The title of the PDF
  --author=AUTHOR          The author of the PDF
  --category=CATEGORY      The category of the PDF (${config.categories.map(c => c.id).join(', ')})
  --tags=TAG1,TAG2         Comma-separated list of tags
  --interactive, -i        Run in interactive mode to prompt for missing fields
  --help, -h               Show this help message

Examples:
  node add-url.js --url="https://example.com/paper.pdf" --title="Example Paper" --category=ai
  node add-url.js --interactive
  `);
  process.exit(0);
}

// Create readline interface for interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask a question and return the answer
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

// Main function
async function main() {
  console.log('Add URL to PDF Library');
  console.log('======================');
  
  try {
    // Load existing URLs file or create empty structure
    let urlsData = loadUrlsData();
    
    // Get URL details (either from command line or interactively)
    const urlDetails = await getUrlDetails();
    
    // Validate URL details
    if (!urlDetails.url) {
      console.error('URL is required');
      process.exit(1);
    }
    
    // Check if URL already exists
    const existingUrl = urlsData.urls.find(u => u.url === urlDetails.url);
    if (existingUrl) {
      console.log(`URL already exists: ${urlDetails.url}`);
      
      // Update existing URL with new details
      Object.keys(urlDetails).forEach(key => {
        if (urlDetails[key] && key !== 'url') {
          existingUrl[key] = urlDetails[key];
        }
      });
      
      console.log('Updated existing URL entry');
    } else {
      // Add new URL - replace uuid with our custom ID generator
      urlsData.urls.push({
        id: generateId(),
        url: urlDetails.url,
        title: urlDetails.title || urlDetails.url.split('/').pop() || 'Untitled PDF',
        author: urlDetails.author || 'Unknown',
        categories: urlDetails.categories || [],
        tags: urlDetails.tags || [],
        dateAdded: new Date().toISOString().split('T')[0]
      });
      
      console.log('Added new URL entry');
    }
    
    // Save updated URLs file
    saveUrlsData(urlsData);
    
    console.log('\nURL details:');
    console.log(`URL: ${urlDetails.url}`);
    console.log(`Title: ${urlDetails.title}`);
    console.log(`Author: ${urlDetails.author}`);
    console.log(`Categories: ${urlDetails.categories?.join(', ') || 'None'}`);
    console.log(`Tags: ${urlDetails.tags?.join(', ') || 'None'}`);
    
    console.log('\nURL added successfully! To update the PDF data with this URL, run:');
    console.log('npm run update:urls');
    
  } catch (error) {
    console.error(`Error adding URL: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Load existing URLs data
function loadUrlsData() {
  try {
    const urlsFilePath = path.resolve(config.paths.urlsFile);
    if (fs.existsSync(urlsFilePath)) {
      const data = fs.readFileSync(urlsFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading URLs data: ${error.message}`);
  }
  
  return { urls: [] };
}

// Save URLs data
function saveUrlsData(data) {
  try {
    const urlsFilePath = path.resolve(config.paths.urlsFile);
    fs.writeFileSync(urlsFilePath, JSON.stringify(data, null, 2));
    console.log(`URLs data saved to ${urlsFilePath}`);
  } catch (error) {
    console.error(`Error saving URLs data: ${error.message}`);
    throw error;
  }
}

// Get URL details either from command line or interactively
async function getUrlDetails() {
  const details = {
    url: options.url,
    title: options.title,
    author: options.author,
    categories: options.category ? [options.category] : [],
    tags: options.tags || []
  };
  
  // If interactive mode or missing required fields, prompt for them
  if (options.interactive || !details.url) {
    console.log('\nPlease provide the following details:');
    
    // Prompt for URL if not provided
    if (!details.url) {
      details.url = await askQuestion('URL: ');
    }
    
    // Prompt for title if not provided
    if (!details.title) {
      const defaultTitle = details.url.split('/').pop() || 'Untitled PDF';
      const title = await askQuestion(`Title [${defaultTitle}]: `);
      details.title = title || defaultTitle;
    }
    
    // Prompt for author if not provided
    if (!details.author) {
      const author = await askQuestion('Author [Unknown]: ');
      details.author = author || 'Unknown';
    }
    
    // Prompt for category if not provided
    if (!details.categories || details.categories.length === 0) {
      console.log('\nAvailable categories:');
      config.categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name} (${cat.id})`);
      });
      
      const categoryInput = await askQuestion('Category (enter number or ID, leave empty for none): ');
      
      if (categoryInput) {
        if (/^\d+$/.test(categoryInput)) {
          // Input is a number - use as index
          const index = parseInt(categoryInput) - 1;
          if (index >= 0 && index < config.categories.length) {
            details.categories = [config.categories[index].id];
          }
        } else {
          // Input is a category ID
          const category = config.categories.find(cat => cat.id === categoryInput);
          if (category) {
            details.categories = [category.id];
          }
        }
      }
    }
    
    // Prompt for tags if not provided
    if (!details.tags || details.tags.length === 0) {
      const tagsInput = await askQuestion('Tags (comma-separated): ');
      if (tagsInput) {
        details.tags = tagsInput.split(',').map(tag => tag.trim());
      }
    }
  }
  
  return details;
}

// Run the main function
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 