#!/usr/bin/env node

/**
 * Standardize PDF Schema Script
 * 
 * This script updates all PDF entries in the pdf-data.json file to ensure
 * they match the standard schema format exemplified by pdf001.
 * It also removes PDFs where isAvailable is false, processes sourceQuery fields,
 * and saves to an optional output file.
 */

const fs = require('fs');
const path = require('path');
const config = require('./search-config');

// Main function
async function main() {
  console.log('PDF Schema Standardization');
  console.log('=========================');
  
  // Parse command line arguments for optional output file
  const args = process.argv.slice(2);
  let outputFile = 'pdf-data-refactored.json';
  
  if (args.length > 0) {
    outputFile = args[0];
  }

  console.log(`Output will be saved to: ${outputFile}`);
  
  try {
    // Load the PDF data file
    const dataFilePath = path.resolve(
      __dirname, 
      '../../', 
      config.paths.dataFile
    );
    console.log(`Loading PDF data from ${dataFilePath}`);
    
    if (!fs.existsSync(dataFilePath)) {
      console.error(`Error: Data file not found at ${dataFilePath}`);
      process.exit(1);
    }
    
    // Read and parse the data file
    const dataFileContent = fs.readFileSync(dataFilePath, 'utf8');
    
    // Check for and fix JSON syntax errors
    let pdfData;
    try {
      // Try to parse as is
      pdfData = JSON.parse(dataFileContent);
    } catch (error) {
      console.error(`JSON parsing error: ${error.message}`);
      console.log('Attempting to fix JSON format issues...');
      
      // Fix common JSON issues - remove extra opening braces and invalid comments
      let fixedContent = dataFileContent;
      
      // Remove any comments (lines starting with //)
      fixedContent = fixedContent.replace(/^\s*\/\/.*$/gm, '');
      
      // Remove any duplicate JSON opening structures
      if (fixedContent.indexOf('{') !== fixedContent.lastIndexOf('{')) {
        const firstBrace = fixedContent.indexOf('{');
        const secondBrace = fixedContent.indexOf('{', firstBrace + 1);
        
        // Check if we have a duplicate JSON structure
        if (secondBrace - firstBrace < 20) {
          fixedContent = fixedContent.substring(secondBrace);
        }
      }
      
      // Try parsing again
      try {
        pdfData = JSON.parse(fixedContent);
        console.log('Successfully fixed JSON format issues');
      } catch (retryError) {
        console.error(`Failed to fix JSON format: ${retryError.message}`);
        process.exit(1);
      }
    }
    
    // Create a backup of the original file
    const backupFilePath = `${dataFilePath}.backup-${Date.now()}`;
    fs.writeFileSync(backupFilePath, dataFileContent);
    console.log(`Created backup at ${backupFilePath}`);
    
    // Get the reference schema from pdf001
    const referencePdf = pdfData.pdfs.find(pdf => pdf.id === 'pdf001');
    
    if (!referencePdf) {
      console.error('Error: Reference PDF with id "pdf001" not found');
      process.exit(1);
    }
    
    console.log(`Found reference PDF schema: ${referencePdf.id} - ${referencePdf.title}`);
    
    // Get all fields from the reference PDF
    const referenceFields = Object.keys(referencePdf);
    console.log(`Reference schema fields: ${referenceFields.join(', ')}`);
    
    // Filter out unavailable PDFs and update all remaining PDFs to match the reference schema
    let updatedCount = 0;
    let unchangedCount = 0;
    let removedCount = 0;
    
    // Filter PDFs where isAvailable is true
    const availablePdfs = pdfData.pdfs.filter(pdf => {
      if (pdf.isAvailable === false) {
        removedCount++;
        return false;
      }
      return true;
    });
    
    // Standardize the remaining PDFs
    const standardizedPdfs = availablePdfs.map(pdf => {
      // Skip the reference PDF
      if (pdf.id === 'pdf001') {
        unchangedCount++;
        return pdf;
      }
      
      // Create a standardized PDF object based on the reference
      const standardizedPdf = { ...pdf };
      
      // Process sourceQuery field if it exists
      if (pdf.sourceQuery) {
        if (typeof pdf.sourceQuery === 'string' && (pdf.sourceQuery.startsWith('http') || pdf.sourceQuery.includes('://'))) {
          // If sourceQuery is a URL, use it for the source field
          standardizedPdf.source = detectSource(pdf.sourceQuery);
        } else if (Array.isArray(pdf.sourceQuery) || typeof pdf.sourceQuery === 'string') {
          // If sourceQuery is an array or string, use it for tags
          const tags = Array.isArray(pdf.sourceQuery) ? 
            pdf.sourceQuery : pdf.sourceQuery.split(/[,\s]+/).filter(tag => tag.trim().length > 0);
          standardizedPdf.tags = tags;
        }
        
        // Remove the sourceQuery field as it's not in the reference schema
        delete standardizedPdf.sourceQuery;
      }
      
      // Add any missing fields with default values
      let isUpdated = false;
      
      referenceFields.forEach(field => {
        if (standardizedPdf[field] === undefined) {
          isUpdated = true;
          
          // Use appropriate default values based on field name
          switch (field) {
            case 'author':
              standardizedPdf.author = extractAuthorFromTitle(pdf.title) || 'Unknown';
              break;
            case 'categories':
              standardizedPdf.categories = [];  // Empty array as per requirements
              break;
            case 'source':
              standardizedPdf.source = detectSource(pdf.url);
              break;
            case 'yearPublished':
              // Try to extract year from the existing yearPublished field or set to null
              standardizedPdf.yearPublished = pdf.yearPublished ? 
                parseInt(pdf.yearPublished, 10) : extractYearFromUrl(pdf.url);
              break;
            case 'tags':
              if (!standardizedPdf.tags) {
                standardizedPdf.tags = [];  // Empty array as per requirements
              }
              break;
            case 'isAvailable':
              // Set to true since we've filtered out the false ones
              standardizedPdf.isAvailable = true;
              break;
            default:
              // For other fields, use null
              standardizedPdf[field] = null;
          }
        }
      });
      
      // Remove any fields that are not in the reference schema
      Object.keys(standardizedPdf).forEach(field => {
        if (!referenceFields.includes(field)) {
          delete standardizedPdf[field];
          isUpdated = true;
        }
      });
      
      if (isUpdated) {
        updatedCount++;
      } else {
        unchangedCount++;
      }
      
      return standardizedPdf;
    });
    
    // Update the PDFs array
    pdfData.pdfs = standardizedPdfs;
    
    // Update the lastValidated timestamp
    pdfData.lastValidated = new Date().toISOString();
    
    // Save the output file (either to specified path or default)
    const outputFilePath = path.resolve(__dirname, '../../', outputFile);
    fs.writeFileSync(outputFilePath, JSON.stringify(pdfData, null, 2));
    
    console.log(`\nSchema standardization complete:`);
    console.log(`- Total PDFs: ${pdfData.pdfs.length}`);
    console.log(`- Updated PDFs: ${updatedCount}`);
    console.log(`- Unchanged PDFs: ${unchangedCount}`);
    console.log(`- Removed PDFs (unavailable): ${removedCount}`);
    console.log(`\nPDF data has been saved to: ${outputFilePath}`);
    
  } catch (error) {
    console.error(`Error standardizing schema: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Helper function to extract author from title
function extractAuthorFromTitle(title) {
  if (!title) return null;
  
  // Look for patterns like "Author Name - Title" or "Title by Author Name"
  const dashPattern = /^(.*?)\s+-\s+(.*)$/;
  const byPattern = /^(.*?)\s+by\s+(.*)$/i;
  
  let match = title.match(dashPattern);
  if (match) {
    // If the first part is shorter, it's likely the author
    const [, firstPart, secondPart] = match;
    return firstPart.length < secondPart.length ? firstPart : null;
  }
  
  match = title.match(byPattern);
  if (match) {
    // The second part is the author
    return match[2];
  }
  
  return null;
}

// Helper function to detect source based on URL
function detectSource(url) {
  if (!url) return 'unknown';
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check for common academic sources
    if (hostname.includes('arxiv')) return 'arxiv';
    if (hostname.includes('acm.org')) return 'acm';
    if (hostname.includes('ieee')) return 'ieee';
    if (hostname.includes('researchgate')) return 'researchgate';
    if (hostname.includes('springer')) return 'springer';
    if (hostname.includes('sciencedirect')) return 'sciencedirect';
    if (hostname.includes('nature.com')) return 'nature';
    if (hostname.includes('scholar.google')) return 'google-scholar';
    
    // Extract domain name as a fallback source
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      return domainParts[domainParts.length - 2];
    }
    
    return hostname;
  } catch (e) {
    // For invalid URLs, return 'unknown'
    return 'unknown';
  }
}

// Helper function to extract year from URL
function extractYearFromUrl(url) {
  if (!url) return null;
  
  // Look for 4-digit years in the URL
  const yearMatch = url.match(/\/?(19|20)\d{2}\/?/);
  if (yearMatch) {
    return parseInt(yearMatch[0].replace(/\//g, ''), 10);
  }
  
  return null;
}

// Run the main function
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 