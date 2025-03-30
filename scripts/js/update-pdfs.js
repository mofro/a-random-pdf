#!/usr/bin/env node

/**
 * PDF Update Script
 * 
 * This script updates the PDF data file with new search results and
 * adds category information to existing PDFs.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('./search-config');

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all') || args.includes('-a'),
  force: args.includes('--force') || args.includes('-f'),
  category: args.find(arg => arg.startsWith('--category='))?.split('=')[1],
  search: args.find(arg => arg.startsWith('--search='))?.split('=')[1],
  url: args.find(arg => arg.startsWith('--url='))?.split('=')[1],
  urls: args.includes('--urls'),
  limit: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || config.limits.maxPerSearch),
  showHelp: args.includes('--help') || args.includes('-h')
};

// Show help and exit if requested
if (options.showHelp) {
  console.log(`
PDF Update Script

Usage:
  node update-pdfs.js [options]

Options:
  --all, -a                Update all categories
  --force, -f              Force update even if recently updated
  --category=CATEGORY_ID   Update only the specified category
  --search=SEARCH_QUERY    Run a specific search query
  --url=URL                Add a specific PDF URL
  --urls                   Process URLs from urls.json file
  --limit=NUMBER           Limit number of results per search (default: ${config.limits.maxPerSearch})
  --help, -h               Show this help message

Examples:
  node update-pdfs.js --all
  node update-pdfs.js --category=ai --force
  node update-pdfs.js --search="quantum computing filetype:pdf" --limit=10
  node update-pdfs.js --url="https://example.com/paper.pdf"
  node update-pdfs.js --urls
  `);
  process.exit(0);
}

// Main function
async function main() {
  console.log('PDF Update Script');
  console.log('=================');
  
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(config.paths.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Load existing data or create empty structure
    let pdfData = loadExistingData();
    
    // Create backup of existing data
    if (pdfData && pdfData.pdfs && pdfData.pdfs.length > 0) {
      backupData(pdfData);
    }
    
    // Initialize metadata if needed
    if (!pdfData.metadata) {
      pdfData.metadata = {
        version: '2.0',
        categories: config.categories.map(cat => ({ 
          id: cat.id, 
          name: cat.name, 
          color: cat.color 
        })),
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Handle specific URL if provided
    if (options.url) {
      console.log(`\nProcessing specific URL: ${options.url}`);
      
      const newPdf = processUrlTarget({
        url: options.url,
        title: options.url.split('/').pop() || 'Untitled PDF',
        categories: options.category ? [options.category] : []
      });
      
      // Add to PDF data
      mergePdfData(pdfData, [newPdf]);
      console.log(`Added/updated URL: ${options.url}`);
    }
    
    // Handle URLs from urls.json file
    if (options.urls || (options.all && config.update.includeUrlTargets)) {
      console.log('\nProcessing URL targets from urls.json');
      
      const targetUrls = loadUrlTargets();
      if (targetUrls && targetUrls.length > 0) {
        console.log(`Found ${targetUrls.length} URL targets`);
        
        // Filter by category if specified
        let filteredUrls = targetUrls;
        if (options.category) {
          filteredUrls = targetUrls.filter(url => 
            url.categories && url.categories.includes(options.category));
          console.log(`Filtered to ${filteredUrls.length} URL targets in category "${options.category}"`);
        }
        
        // Process and add URLs
        const newPdfs = filteredUrls.map(processUrlTarget);
        mergePdfData(pdfData, newPdfs);
        console.log(`Added/updated ${newPdfs.length} PDFs from URL targets`);
      } else {
        console.log('No URL targets found');
      }
    }
    
    // Determine which searches to run
    let searchesToRun = [];
    
    if (options.search) {
      // Single specific search
      searchesToRun.push({
        query: options.search,
        category: options.category || detectCategory(options.search)
      });
    } else if (options.category && !options.url && !options.urls) {
      // Searches for a specific category
      const category = config.categories.find(cat => cat.id === options.category);
      if (category) {
        const categorySearches = category.keywords.map(keyword => ({
          query: `${keyword} filetype:pdf`,
          category: category.id
        }));
        searchesToRun.push(...categorySearches);
      } else {
        console.error(`Category with ID "${options.category}" not found`);
      }
    } else if (options.all) {
      // All predefined searches
      searchesToRun = config.searches.map(query => ({
        query,
        category: detectCategory(query)
      }));
    } else if (!options.url && !options.urls) {
      // Default: run searches from searches.md file
      const searches = loadSearchesFromFile();
      searchesToRun = searches.map(query => ({
        query,
        category: detectCategory(query)
      }));
    }
    
    if (searchesToRun.length > 0) {
      console.log(`\nRunning ${searchesToRun.length} searches...`);
      
      // Run each search and collect results
      for (const search of searchesToRun) {
        console.log(`\nRunning search: ${search.query}`);
        
        try {
          const results = runSearchCommand(search.query, options.limit);
          
          if (results && results.length > 0) {
            console.log(`Found ${results.length} results`);
            
            // Process and add new results
            const newPdfs = results.map(result => processPdfResult(result, search.category));
            
            // Merge with existing data, avoiding duplicates
            mergePdfData(pdfData, newPdfs);
            
            console.log(`Added/updated ${newPdfs.length} PDFs in category "${search.category || 'uncategorized'}"`);
          } else {
            console.log('No results found');
          }
        } catch (error) {
          console.error(`Error running search "${search.query}": ${error.message}`);
        }
      }
    }
    
    // Update categories for existing PDFs that might be missing them
    if (config.update.addCategories) {
      console.log('\nUpdating categories for existing PDFs...');
      updateCategories(pdfData);
    }
    
    // Update lastValidated timestamp
    pdfData.lastValidated = new Date().toISOString();
    
    // Save updated data
    saveData(pdfData);
    
    console.log('\nUpdate completed successfully!');
    console.log(`Total PDFs: ${pdfData.pdfs.length}`);
    
    // Print category statistics
    console.log('\nCategory statistics:');
    const categoryStats = getCategoryStats(pdfData);
    for (const [category, count] of Object.entries(categoryStats)) {
      console.log(`- ${category}: ${count} PDFs`);
    }
    
  } catch (error) {
    console.error(`Error updating PDFs: ${error.message}`);
    process.exit(1);
  }
}

// Load existing PDF data
function loadExistingData() {
  try {
    if (fs.existsSync(config.paths.dataFile)) {
      const data = fs.readFileSync(config.paths.dataFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading existing data: ${error.message}`);
  }
  
  // Return empty structure if file doesn't exist or has errors
  return {
    lastValidated: new Date().toISOString(),
    metadata: {
      version: '2.0',
      categories: config.categories.map(cat => ({ 
        id: cat.id, 
        name: cat.name, 
        color: cat.color 
      }))
    },
    pdfs: []
  };
}

// Create a backup of the data
function backupData(data) {
  try {
    fs.writeFileSync(config.paths.backupFile, JSON.stringify(data, null, 2));
    console.log(`Backup created at ${config.paths.backupFile}`);
  } catch (error) {
    console.error(`Error creating backup: ${error.message}`);
  }
}

// Load searches from the searches.md file
function loadSearchesFromFile() {
  try {
    if (fs.existsSync(config.paths.searchesFile)) {
      const content = fs.readFileSync(config.paths.searchesFile, 'utf8');
      return content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.trim());
    }
  } catch (error) {
    console.error(`Error loading searches from file: ${error.message}`);
  }
  
  return [];
}

// Run a search command and return results
function runSearchCommand(query, limit) {
  // This is a placeholder. In a real implementation, you might:
  // 1. Call a search API directly
  // 2. Use a web scraping tool like puppeteer
  // 3. Execute an external script that does the searching
  
  // For this example, we'll simulate results
  console.log(`Simulating search results for "${query}" (limit: ${limit})`);
  
  // Generate some fake results based on the query
  const results = [];
  const keywords = query.replace('filetype:pdf', '').trim().split(/\s+/);
  
  for (let i = 0; i < Math.min(limit, 10); i++) {
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    results.push({
      id: `pdf_${Date.now()}_${i}`,
      title: `Guide to ${keyword} (Sample ${i + 1})`,
      url: `https://example.com/${keyword.toLowerCase().replace(/[^a-z0-9]/g, '-')}-guide-${i + 1}.pdf`,
      author: `Sample Author ${i + 1}`,
      sourceQuery: query
    });
  }
  
  return results;
}

// Process a PDF result and add category information
function processPdfResult(result, category) {
  // Convert result to our standard PDF format
  const pdf = {
    id: result.id,
    title: result.title,
    isAvailable: true,
    url: result.url,
    author: result.author || 'Unknown',
    sourceQuery: result.sourceQuery
  };
  
  // Add date if configured
  if (config.update.addDateAdded) {
    pdf.dateAdded = new Date().toISOString().split('T')[0];
  }
  
  // Add category if available
  if (category) {
    pdf.categories = [category];
  } else {
    // Detect category from title and source query
    const detectedCategory = detectCategory(`${pdf.title} ${pdf.sourceQuery}`);
    if (detectedCategory) {
      pdf.categories = [detectedCategory];
    }
  }
  
  return pdf;
}

// Merge new PDFs with existing data, avoiding duplicates
function mergePdfData(pdfData, newPdfs) {
  // Map existing PDFs by URL for quick lookup
  const existingPdfsByUrl = new Map();
  const existingPdfsById = new Map();
  
  pdfData.pdfs.forEach(pdf => {
    if (pdf.url) {
      existingPdfsByUrl.set(pdf.url, pdf);
    }
    existingPdfsById.set(pdf.id, pdf);
  });
  
  // Process each new PDF
  newPdfs.forEach(newPdf => {
    // Check if PDF with same URL already exists
    if (newPdf.url && existingPdfsByUrl.has(newPdf.url)) {
      const existingPdf = existingPdfsByUrl.get(newPdf.url);
      
      // Update categories if needed
      if (newPdf.categories && newPdf.categories.length > 0) {
        if (!existingPdf.categories) {
          existingPdf.categories = [];
        }
        
        // Add new categories
        newPdf.categories.forEach(category => {
          if (!existingPdf.categories.includes(category)) {
            existingPdf.categories.push(category);
          }
        });
      }
      
      // Update other fields if they're missing in the existing PDF
      Object.keys(newPdf).forEach(key => {
        if (key !== 'id' && key !== 'categories' && !existingPdf[key]) {
          existingPdf[key] = newPdf[key];
        }
      });
    }
    // Check if PDF with same ID already exists
    else if (existingPdfsById.has(newPdf.id)) {
      const existingPdf = existingPdfsById.get(newPdf.id);
      
      // Update the same fields as above
      if (newPdf.categories && newPdf.categories.length > 0) {
        if (!existingPdf.categories) {
          existingPdf.categories = [];
        }
        
        newPdf.categories.forEach(category => {
          if (!existingPdf.categories.includes(category)) {
            existingPdf.categories.push(category);
          }
        });
      }
      
      Object.keys(newPdf).forEach(key => {
        if (key !== 'id' && key !== 'categories' && !existingPdf[key]) {
          existingPdf[key] = newPdf[key];
        }
      });
    }
    // This is a completely new PDF
    else {
      pdfData.pdfs.push(newPdf);
    }
  });
  
  // Limit total number of PDFs if needed
  if (pdfData.pdfs.length > config.limits.maxResults) {
    pdfData.pdfs = pdfData.pdfs.slice(-config.limits.maxResults);
  }
}

// Update categories for existing PDFs
function updateCategories(pdfData) {
  let updatedCount = 0;
  
  pdfData.pdfs.forEach(pdf => {
    if (!pdf.categories || pdf.categories.length === 0) {
      // Try to detect category from title and source query
      const textToCheck = [pdf.title, pdf.sourceQuery, pdf.author].filter(Boolean).join(' ');
      const category = detectCategory(textToCheck);
      
      if (category) {
        pdf.categories = [category];
        updatedCount++;
      }
    }
  });
  
  console.log(`Updated categories for ${updatedCount} PDFs`);
}

// Detect category from text
function detectCategory(text) {
  if (!text) return null;
  
  const textLower = text.toLowerCase();
  
  // Check each category
  for (const category of config.categories) {
    // Look for category keywords in the text
    for (const keyword of category.keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }
  
  return null;
}

// Save updated data to the JSON file
function saveData(data) {
  try {
    fs.writeFileSync(config.paths.dataFile, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${config.paths.dataFile}`);
  } catch (error) {
    console.error(`Error saving data: ${error.message}`);
    throw error;
  }
}

// Get statistics for each category
function getCategoryStats(pdfData) {
  const stats = {
    'uncategorized': 0
  };
  
  // Initialize stats for each category
  config.categories.forEach(category => {
    stats[category.name] = 0;
  });
  
  // Count PDFs in each category
  pdfData.pdfs.forEach(pdf => {
    if (pdf.categories && pdf.categories.length > 0) {
      pdf.categories.forEach(categoryId => {
        const category = config.categories.find(c => c.id === categoryId);
        if (category) {
          stats[category.name] = (stats[category.name] || 0) + 1;
        }
      });
    } else {
      stats['uncategorized']++;
    }
  });
  
  return stats;
}

// Load URL targets from urls.json
function loadUrlTargets() {
  try {
    const urlsFilePath = path.resolve(config.paths.urlsFile);
    if (fs.existsSync(urlsFilePath)) {
      const data = fs.readFileSync(urlsFilePath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.urls || [];
    }
  } catch (error) {
    console.error(`Error loading URL targets: ${error.message}`);
  }
  
  return [];
}

// Process a URL target into a PDF object
function processUrlTarget(urlTarget) {
  const pdf = {
    id: urlTarget.id || `url_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title: urlTarget.title || urlTarget.url.split('/').pop() || 'Untitled PDF',
    isAvailable: true,
    url: urlTarget.url,
    author: urlTarget.author || 'Unknown',
    sourceType: 'manual',
    tags: urlTarget.tags || []
  };
  
  // Add date if configured
  if (config.update.addDateAdded && !urlTarget.dateAdded) {
    pdf.dateAdded = new Date().toISOString().split('T')[0];
  } else if (urlTarget.dateAdded) {
    pdf.dateAdded = urlTarget.dateAdded;
  }
  
  // Add categories
  if (urlTarget.categories && urlTarget.categories.length > 0) {
    pdf.categories = urlTarget.categories;
  } else {
    // Try to detect category from title and URL
    const textToCheck = [pdf.title, pdf.url].filter(Boolean).join(' ');
    const category = detectCategory(textToCheck);
    if (category) {
      pdf.categories = [category];
    }
  }
  
  return pdf;
}

// Run the main function
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 