# A Random PDF Explorer

A web application that provides random links to freely available PDFs across the web.

## Features

- Displays random PDFs from a curated collection
- Avoids showing the same PDF repeatedly
- Validates links to ensure PDFs remain accessible
- Simple, responsive interface

## Quick Start

1. Clone this repository
2. Open `public/index.html` in your browser

## Development

- `npm test` - Run tests
- `npm run validate` - Check PDF availability
- `npm run add-pdf` - Add a new PDF to the collection
- `npm run serve` - Start a local development server

## PDF Discovery

Use the Python scripts in `scripts/python/` to discover new PDFs:

```bash
cd scripts/python
pip install -r requirements.txt
python update_pdf_collection.py --interactive
