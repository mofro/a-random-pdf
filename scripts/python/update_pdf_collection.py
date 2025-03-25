#!/usr/bin/env python3
"""
Update PDF Collection Script

This script adds new PDFs to the collection by searching the web or crawling specific websites.
It maintains the existing collection structure and avoids duplicates.

Contributors: Maurice Gaston, Claude https://claude.ai
Last Updated: March 2025

Usage:
    python update_pdf_collection.py --query "topic" --methods google,duckduckgo
    python update_pdf_collection.py --website "https://example.com" --limit 20
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

# Import the PDF finder module
try:
    from pdf_finder import PDFFinder
except ImportError:
    # Try to find the module in the same directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.exists(os.path.join(script_dir, 'pdf_finder.py')):
        sys.path.append(script_dir)
        from pdf_finder import PDFFinder
    else:
        print("Error: Could not import pdf_finder.py. Make sure it's in the same directory.")
        sys.exit(1)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Update the PDF collection with new entries.')
    
    # Main parameters
    parser.add_argument('--query', type=str, help='Search query for finding PDFs')
    parser.add_argument('--website', type=str, help='Website URL to search for PDFs')
    parser.add_argument('--limit', type=int, default=10,
                        help='Maximum number of results per search method')
    
    # File paths
    parser.add_argument('--output', type=str, default=None,
                        help='Output JSON file path (default: same as existing)')
    parser.add_argument('--existing', type=str, default=None,
                        help='Existing JSON file to update')
    
    # Search configuration
    parser.add_argument('--methods', type=str, default='google,duckduckgo',
                        help='Comma-separated list of search methods: google,duckduckgo,website')
    parser.add_argument('--no-verify', action='store_true',
                        help='Skip verification of PDF links')
    
    # Output options
    parser.add_argument('--verbose', action='store_true',
                        help='Enable verbose output')
    
    # Environment options
    parser.add_argument('--dev', action='store_true',
                        help='Use development environment configuration')
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.query and not args.website:
        parser.error("Either --query or --website is required")
    
    return args

def get_default_paths(dev_mode=False):
    """Get default file paths based on environment."""
    script_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    if dev_mode:
        # Development environment
        root_dir = script_dir.parent.parent
        existing_file = root_dir / 'dev' / 'data' / 'pdf-data.json'
        output_file = existing_file
    else:
        # Production environment
        root_dir = script_dir.parent.parent
        existing_file = root_dir / 'public' / 'data' / 'pdf-data.json'
        output_file = existing_file
    
    return str(existing_file), str(output_file)

def main():
    """Main function to update the PDF collection."""
    args = parse_arguments()
    
    # Determine file paths
    default_existing, default_output = get_default_paths(args.dev)
    
    existing_file = args.existing or default_existing
    output_file = args.output or default_output
    
    # Check if existing file exists
    if not os.path.exists(existing_file):
        print(f"Warning: Existing file not found: {existing_file}")
        print(f"Creating new collection file at: {output_file}")
        # Create empty structure
        initial_data = {
            "lastValidated": datetime.now().isoformat(),
            "pdfs": []
        }
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(initial_data, f, indent=2)
        existing_file = output_file
    
    # Initialize the PDF finder
    finder = PDFFinder(
        output_file=output_file,
        existing_file=existing_file,
        verbose=args.verbose
    )
    
    # Search methods
    search_methods = args.methods.split(',')
    
    # Use appropriate search method based on arguments
    if args.website:
        # When a website is specified, always use the 'website' method
        search_methods = ['website']
        query = args.website
        print(f"Searching website: {query}")
    else:
        # Otherwise use the query with specified search methods
        query = args.query
        print(f"Searching for: {query} using methods: {', '.join(search_methods)}")
    
    # Perform the search
    results = finder.search_and_process(
        query=query,
        limit=args.limit,
        search_methods=search_methods,
        verify=not args.no_verify
    )
    
    # Print results summary
    print(f"\nUpdate completed:")
    print(f"- {len(results)} new PDFs added")
    print(f"- Collection now contains {len(finder.data['pdfs'])} PDFs total")
    print(f"- Updated collection saved to {output_file}")

if __name__ == "__main__":
    main()