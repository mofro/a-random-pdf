/**
 * Category Utilities
 * 
 * Utilities for working with the centralized category configuration.
 * This is used by both the JavaScript and Python scripts to ensure consistency.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load the categories from the central configuration file
 * 
 * @returns {Object} The categories configuration
 */
function loadCategoriesConfig() {
  const configPath = path.resolve(__dirname, '../../config/categories.json');
  
  try {
    if (!fs.existsSync(configPath)) {
      console.error(`Error: Categories configuration file not found at ${configPath}`);
      return createDefaultConfig();
    }
    
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error(`Error loading categories configuration: ${error.message}`);
    return createDefaultConfig();
  }
}

/**
 * Create a default configuration if the config file doesn't exist
 * 
 * @returns {Object} Default configuration
 */
function createDefaultConfig() {
  return {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    categories: [
      { id: "ai", name: "Artificial Intelligence", keywords: ["machine learning", "AI"], color: "#3498db" },
      { id: "programming", name: "Programming", keywords: ["javascript", "python"], color: "#2ecc71" }
    ],
    searchSuffixes: ["filetype:pdf"]
  };
}

/**
 * Update the categories configuration file
 * 
 * @param {Object} config The new configuration to save
 * @returns {boolean} Whether the update was successful
 */
function updateCategoriesConfig(config) {
  const configPath = path.resolve(__dirname, '../../config/categories.json');
  
  try {
    // Ensure directory exists
    const dirPath = path.dirname(configPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Update lastUpdated timestamp
    config.lastUpdated = new Date().toISOString();
    
    // Write the file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(`Error updating categories configuration: ${error.message}`);
    return false;
  }
}

/**
 * Detect category IDs based on text content
 * 
 * @param {string} text Text to analyze for category keywords
 * @returns {string[]} Array of category IDs matching the text
 */
function detectCategories(text) {
  const config = loadCategoriesConfig();
  const textLower = text.toLowerCase();
  const matches = [];
  
  for (const category of config.categories) {
    for (const keyword of category.keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        if (!matches.includes(category.id)) {
          matches.push(category.id);
        }
        break;
      }
    }
  }
  
  return matches;
}

/**
 * Generate search queries for a category based on the configuration
 * 
 * @param {string} categoryId The category ID to generate queries for
 * @returns {string[]} Array of search queries
 */
function generateSearchQueries(categoryId) {
  const config = loadCategoriesConfig();
  const category = config.categories.find(cat => cat.id === categoryId);
  
  if (!category) {
    return [];
  }
  
  // Generate search queries by combining keywords with suffixes
  const queries = [];
  
  for (const keyword of category.keywords) {
    for (const suffix of config.searchSuffixes) {
      queries.push(`${keyword} ${suffix}`);
    }
  }
  
  return queries;
}

/**
 * Get the category list in the format expected by the JavaScript crawler
 * 
 * @returns {Array} Array of category objects
 */
function getJavaScriptCategories() {
  const config = loadCategoriesConfig();
  return config.categories;
}

/**
 * Update the search-config.js file to use the central categories
 */
function updateSearchConfig() {
  const config = loadCategoriesConfig();
  const searchConfigPath = path.resolve(__dirname, './search-config.js');
  
  try {
    // Read the current search-config.js
    const currentConfig = fs.readFileSync(searchConfigPath, 'utf8');
    
    // Split out the categories section
    const categoriesStart = currentConfig.indexOf('categories: [');
    const categoriesEnd = currentConfig.indexOf('],', categoriesStart) + 1;
    
    // Generate the new categories section
    const categoriesSection = `categories: ${JSON.stringify(config.categories, null, 2)}`;
    
    // Replace the section in the file
    const updatedConfig = 
      currentConfig.substring(0, categoriesStart) + 
      categoriesSection + 
      currentConfig.substring(categoriesEnd);
    
    // Write the updated config
    fs.writeFileSync(searchConfigPath, updatedConfig);
    
    console.log('Updated search-config.js with centralized categories');
    return true;
  } catch (error) {
    console.error(`Error updating search-config.js: ${error.message}`);
    return false;
  }
}

/**
 * Update the searches.md file to match the centralized categories
 */
function updateSearchesFile() {
  const config = loadCategoriesConfig();
  const searchesFilePath = path.resolve(__dirname, '../../config/searches.md');
  
  try {
    // Generate the new content
    let content = '# PDF Search Queries\n\n';
    
    for (const category of config.categories) {
      content += `# ${category.name}\n`;
      
      // Generate 5 search queries for each category
      const queries = generateSearchQueries(category.id).slice(0, 5);
      for (const query of queries) {
        content += `${query}\n`;
      }
      
      content += '\n';
    }
    
    // Write the file
    fs.writeFileSync(searchesFilePath, content);
    
    console.log('Updated searches.md with centralized categories');
    return true;
  } catch (error) {
    console.error(`Error updating searches.md: ${error.message}`);
    return false;
  }
}

module.exports = {
  loadCategoriesConfig,
  updateCategoriesConfig,
  detectCategories,
  generateSearchQueries,
  getJavaScriptCategories,
  updateSearchConfig,
  updateSearchesFile
}; 