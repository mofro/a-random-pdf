# A Random PDF Explorer

A web application that provides random links to freely available PDFs across the web.

## Features

- Displays random PDFs from a curated collection
- Avoids showing the same PDF repeatedly
- Validates links to ensure PDFs remain accessible
- Simple, responsive interface
- Multi-category and tag-based filtering with URL parameters

## Quick Start

1. Clone this repository
2. Open `public/index.html` in your browser

## Documentation

For complete usage instructions, PDF discovery options, and development guides, see:

[**→ Comprehensive Guide**](docs/start.md)

## Development

- `npm test` - Run tests
- `npm run validate` - Check PDF availability
- `npm run add-pdf` - Add a new PDF to the collection
- `npm run serve` - Start a local development server

## PDF Discovery

The application offers two methods for discovering and adding PDFs:

### JavaScript Method (Recommended)
```bash
# Update PDFs in all categories
npm run update-pdfs:all

# Update a specific category
npm run update-pdfs:ai
```

### Python Method
```bash
cd scripts/python
pip install -r requirements.txt
python update_pdf_collection.py --interactive
```

See the [Comprehensive Guide](docs/start.md) for detailed instructions on both methods.
