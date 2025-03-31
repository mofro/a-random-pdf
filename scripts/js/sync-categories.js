#!/usr/bin/env node

/**
 * Sync Categories
 * 
 * This script synchronizes all configuration files with the centralized
 * category configuration. It updates search-config.js, searches.md,
 * and other files to ensure consistent category definitions.
 */

const fs = require('fs');
const path = require('path');
const categoryUtils = require('./category-utils');

// Main function
async function main() {
  console.log('Category Synchronization');
  console.log('=======================');
  
  // Load the centralized configuration
  const config = categoryUtils.loadCategoriesConfig();
  console.log(`Loaded ${config.categories.length} categories from central configuration`);
  
  // Update search-config.js
  if (categoryUtils.updateSearchConfig()) {
    console.log('✓ Updated search-config.js');
  } else {
    console.error('✗ Failed to update search-config.js');
  }
  
  // Update searches.md
  if (categoryUtils.updateSearchesFile()) {
    console.log('✓ Updated searches.md');
  } else {
    console.error('✗ Failed to update searches.md');
  }
  
  // Update PDF-data.json metadata
  updateMetadataInPdfData(config);
  
  console.log('\nSync completed!');
}

/**
 * Update the metadata section in pdf-data.json
 */
function updateMetadataInPdfData(config) {
  const dataFilePath = path.resolve(__dirname, '../../', 'public/data/pdf-data.json');
  
  if (!fs.existsSync(dataFilePath)) {
    console.error(`✗ Error: pdf-data.json not found at ${dataFilePath}`);
    return false;
  }
  
  try {
    // Read the data file
    const pdfData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    
    // Update the metadata section
    if (!pdfData.metadata) {
      pdfData.metadata = {};
    }
    
    // Update categories in metadata
    pdfData.metadata.categories = config.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color
    }));
    
    // Update lastUpdated
    pdfData.metadata.lastUpdated = new Date().toISOString();
    
    // Ensure version is set
    pdfData.metadata.version = pdfData.metadata.version || "2.0";
    
    // Write the updated file
    fs.writeFileSync(dataFilePath, JSON.stringify(pdfData, null, 2));
    console.log('✓ Updated pdf-data.json metadata');
    
    return true;
  } catch (error) {
    console.error(`✗ Error updating pdf-data.json: ${error.message}`);
    return false;
  }
}

// Run the main function
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}); 