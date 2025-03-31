# Random PDF Explorer: Comprehensive Guide

## Table of Contents
1. [User Guide](#user-guide)
2. [PDF Discovery and Collection Management](#pdf-discovery-and-collection-management)
3. [Development and Customization](#development-and-customization)
4. [Deployment](#deployment)
5. [Troubleshooting and FAQ](#troubleshooting-and-faq)

## User Guide

### Getting Started

The Random PDF Explorer is a web application that helps you discover interesting PDFs across various categories. The main interface provides:

- A "Show Me a Random PDF" button to display a random document
<!-- - Filter options to narrow down results by category, tags, or search terms -->
- Display area for the currently selected PDF with metadata

<!-- ### Using the Filter Options

Click the "Filter Options" section to access filtering capabilities:

1. **Search**: Enter keywords to find PDFs with matching titles or descriptions
2. **Categories**: Check boxes for topic categories you're interested in
3. **Tags**: Select specific tags to narrow your results

Each filter displays a checkmark badge when active. You can toggle sections open or closed to save space.

### Tips for Effective Filtering

- Select multiple categories or tags to see a wider range of matching PDFs
- Use the search function to find specific topics not covered by categories
- The "Clear Filters" button at the bottom of the filter options will reset all selections
- Active filters are shown with a count indicator

### URL Parameters

You can use URL parameters to share specific filtered views or bookmark them:

```
?categories=ai,programming      # Show PDFs from multiple categories
?category=security             # Show PDFs from a single category
?tags=javascript,web-development # Show PDFs with specific tags
?search=machine learning       # Show PDFs matching search terms
```

Examples:
- `index.html?categories=ai,programming` - AI and Programming PDFs
- `index.html?tags=security,networking` - Security and Networking PDFs
- `index.html?search=quantum computing` - PDFs about quantum computing -->

## PDF Discovery and Collection Management

The PDF Explorer offers two methods for discovering and adding new PDFs to your collection: JavaScript and Python. Both approaches update the same data file (`public/data/pdf-data.json`).

### Using JavaScript for PDF Discovery

The JavaScript approach is recommended if you don't want to install Python dependencies.

#### Basic Commands

```bash
# View all available options
node scripts/js/update-pdfs.js --help

# Update PDFs in all categories
npm run update-pdfs:all

# Update PDFs in a specific category
npm run update-pdfs:ai
npm run update-pdfs:programming
npm run update-pdfs:security

# Add PDFs from config/urls.json file
npm run update-pdfs:urls
```

#### Advanced Options

```bash
# Run a specific search query with custom limit
node scripts/js/update-pdfs.js --search="quantum computing filetype:pdf" --limit=10

# Add a specific PDF URL to the collection
node scripts/js/update-pdfs.js --url="https://example.com/paper.pdf"

# Force update even if recently updated
node scripts/js/update-pdfs.js --category=ai --force
```

#### Configuration

The JavaScript PDF discovery is configured through `scripts/js/search-config.js`, which defines:
- Categories and their keywords
- Search queries for each topic
- File paths and locations
- Search limits and update settings

You can modify this file to customize the discovery process.

### Using Python for PDF Discovery

The Python approach offers more advanced PDF metadata extraction capabilities.

#### Setup

```bash
# Navigate to the Python scripts directory
cd scripts/python

# Install required dependencies
pip install -r requirements.txt
```

#### Basic Commands

```bash
# Interactive mode (easiest for beginners)
python update_pdf_collection.py --interactive

# Search for PDFs by query
python update_pdf_collection.py --query "machine learning" --methods google,duckduckgo

# Update PDFs for all categories (similar to npm run update-pdfs:all)
python update_pdf_collection.py --all
```

#### Advanced Options

```bash
# Crawl a specific website for PDFs
python update_pdf_collection.py --website "https://example.com" --limit 20

# Skip verification of PDF links (faster but less reliable)
python update_pdf_collection.py --query "topic" --no-verify

# Use development data file
python update_pdf_collection.py --query "topic" --dev
```

### Adding PDFs Manually

#### Using config/urls.json

Create or edit `config/urls.json` in the project with the following format:

```json
[
  {
    "url": "https://example.com/paper.pdf",
    "title": "Example Paper",
    "author": "John Doe",
    "description": "A great paper about examples",
    "categories": ["programming", "education"]
  },
  {
    "url": "https://another-site.com/document.pdf",
    "title": "Another Document",
    "categories": ["ai"]
  }
]
```

Then run:
```bash
npm run update-pdfs:urls
```

### Important: Schema Compatibility Between Methods

The JavaScript and Python methods use different approaches to handling the PDF data schema:

#### Schema Differences

**JavaScript Method (Strict Schema)**
- Uses a standardized schema with specific required fields
- Transforms and removes non-standard fields
- Maintains consistent structure for frontend compatibility

**Python Method (Flexible Schema)**
- Focuses on metadata extraction but doesn't enforce schema structure
- May add non-standard fields like "sourceQuery"
- Doesn't guarantee all required fields exist

#### Ensuring Compatibility

If you use the Python method to add PDFs, you should run the JavaScript standardization script afterward:

```bash
# First add PDFs using Python
python scripts/python/update_pdf_collection.py --query "your query" 

# Then standardize the schema
npm run standardize
```

This two-step process combines Python's metadata extraction with JavaScript's schema standardization to ensure application compatibility.

### Centralized Category System

Both JavaScript and Python methods now use a centralized category configuration stored in `config/categories.json`. This ensures consistency across all files and scripts.

#### Category Configuration Structure

The `config/categories.json` file contains:
- List of all categories with their IDs, names, colors, and keywords
- Metadata like version and last updated timestamp
- Search suffix patterns for generating search queries

```json
{
  "version": "1.0",
  "lastUpdated": "2023-07-05T10:00:00Z",
  "categories": [
    { 
      "id": "ai", 
      "name": "Artificial Intelligence", 
      "keywords": ["machine learning", "neural networks", "AI"], 
      "color": "#3498db" 
    },
    // more categories...
  ],
  "searchSuffixes": ["filetype:pdf", "pdf"]
}
```

#### Syncing Categories Across Files

When you add or modify categories, you should run the sync script to update all files:

```bash
# Sync from JavaScript
npm run sync-categories

# Or sync from Python
npm run sync-categories:py
```

This updates:
- `search-config.js` - JavaScript category configuration
- `config/searches.md` - Search queries file
- `pdf-data.json` - Metadata section with categories

#### Editing Categories

You can edit the categories directly:

```bash
# Open the categories file in VS Code
npm run edit-categories
```

Make your changes, then run the sync command to propagate changes across all files.

## Development and Customization

### Setting Up the Development Environment

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/a-random-pdf.git
   cd a-random-pdf
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run serve
   ```

### Adding New Categories

To add new categories:

1. Edit `scripts/js/search-config.js`
2. Add a new entry to the `categories` array:
   ```javascript
   { 
     id: "your-category-id", 
     name: "Your Category Name", 
     keywords: ["keyword1", "keyword2"], 
     color: "#HEX_COLOR" 
   }
   ```
3. Add search queries to the `searches` array:
   ```javascript
   "your keyword filetype:pdf"
   ```
4. Run the update script:
   ```bash
   node scripts/js/update-pdfs.js --category=your-category-id
   ```

### Customizing the Interface

You can customize the look and feel by editing:

- `public/css/styles.css` - Main styles
- `public/index.html` - Page structure
- `public/js/app.js` - Application behavior

### Running Tests and Validation

```bash
# Run all tests
npm test

# Validate PDF links
npm run validate
```

## Deployment

### Simple Deployment (Static Hosting)

Since this is a static web application, you can deploy it on any static web hosting service:

1. Copy the `public` directory to your web server
2. Make sure the server is configured to serve `index.html` as the default file

### GitHub Pages Deployment

1. Push your repository to GitHub
2. Go to Settings > Pages
3. Set the source to the branch and folder containing your `public` directory
4. GitHub will provide a URL where your site is published

### Automating Updates with GitHub Actions

The repository includes a GitHub Action workflow that can automatically update the PDF collection on a schedule:

1. Set up your GitHub repository
2. Enable GitHub Actions
3. The workflow in `.github/workflows/update-pdfs.yml` will run on the specified schedule

## Troubleshooting and FAQ

### Common Issues

**Q: The PDF doesn't load**  
A: Some PDFs might be blocked by CORS policies. Try opening in a new tab using the provided link.

**Q: How do I reset my view history?**  
A: Click the "Reset Viewed History" link at the bottom of the page.

**Q: How can I contribute to the PDF collection?**  
A: You can fork the repository, add PDFs using the methods described above, and create a pull request.

### Performance Optimization

For large collections (100+ PDFs):
- Consider implementing pagination
- Optimize the data file by removing unnecessary metadata
- Use browser caching for faster loading

### Browser Compatibility

The application works best in modern browsers (Chrome, Firefox, Safari, Edge). Internet Explorer is not supported.

---

This guide should get you started with the Random PDF Explorer. For more detailed information or specific questions, please open an issue on the GitHub repository.
