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
import time
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

# Import category utilities
try:
    from category_utils import load_categories_config, detect_categories, ensure_json_schema_compatibility
except ImportError:
    # Try to find the module in the same directory
    if os.path.exists(os.path.join(script_dir, 'category_utils.py')):
        # Already added script_dir to path above
        from category_utils import load_categories_config, detect_categories, ensure_json_schema_compatibility
    else:
        print("Warning: Could not import category_utils.py. Category detection will be limited.")
        # Define empty stubs for the functions
        def load_categories_config():
            return {"categories": []}
        def detect_categories(text):
            return []
        def ensure_json_schema_compatibility(pdf_entry):
            return pdf_entry

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Update the PDF collection with new entries.')
    
    # Main parameters
    parser.add_argument('--query', type=str, help='Search query for finding PDFs')
    parser.add_argument('--website', type=str, help='Website URL to search for PDFs')
    parser.add_argument('--limit', type=int, default=10,
                        help='Maximum number of results per search method')
    parser.add_argument('--all', action='store_true',
                        help='Update PDFs for all categories using centralized configuration')
    
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
    
    # Category options
    parser.add_argument('--category', type=str, default=None,
                        help='Assign a specific category to found PDFs')
    parser.add_argument('--auto-categorize', action='store_true', default=True,
                        help='Automatically categorize PDFs based on title and content')
    
    # Processing options
    parser.add_argument('--standardize', action='store_true', default=True,
                        help='Ensure all PDFs conform to the standard schema')
    
    # Output options
    parser.add_argument('--verbose', action='store_true',
                        help='Enable verbose output')
    
    # Environment options
    parser.add_argument('--dev', action='store_true',
                        help='Use development environment configuration')
    
    # Interactive mode
    parser.add_argument('--interactive', action='store_true',
                        help='Run in interactive mode')
    
    args = parser.parse_args()
    
    # If interactive mode, prompt for query if not provided
    if args.interactive:
        if not args.query and not args.website and not args.all:
            print("\nInteractive Mode")
            print("===============")
            
            search_type = input("Search type (1=query, 2=website, 3=all categories) [1]: ").strip() or "1"
            
            if search_type == "1":
                args.query = input("Enter search query: ").strip()
                if not args.query:
                    print("Error: Search query is required in interactive mode")
                    sys.exit(1)
            elif search_type == "2":
                args.website = input("Enter website URL: ").strip()
                if not args.website:
                    print("Error: Website URL is required in interactive mode")
                    sys.exit(1)
            elif search_type == "3":
                args.all = True
                print("All categories mode selected")
            
            args.limit = int(input(f"Maximum results per search [default: {args.limit}]: ").strip() or args.limit)
            
            # Ask for category if not using all mode
            if not args.all:
                categories_config = load_categories_config()
                print("\nAvailable categories:")
                for i, category in enumerate(categories_config["categories"], 1):
                    print(f"{i}. {category['name']} ({category['id']})")
                
                category_choice = input("\nSelect category number or leave empty for auto-categorization: ").strip()
                if category_choice and category_choice.isdigit():
                    idx = int(category_choice) - 1
                    if 0 <= idx < len(categories_config["categories"]):
                        args.category = categories_config["categories"][idx]["id"]
                        print(f"Selected category: {categories_config['categories'][idx]['name']}")
    
    # Validate arguments
    if not args.query and not args.website and not args.all:
        parser.error("Either --query, --website, or --all is required, or use --interactive")
    
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

def post_process_results(results, args):
    """Post-process the results to ensure schema compatibility and categorization."""
    categories_config = load_categories_config()
    
    for pdf in results:
        # Assign category if specified
        if args.category:
            pdf['categories'] = [args.category]
        
        # Extract tags from sourceQuery before it gets removed in schema compatibility
        if 'sourceQuery' in pdf:
            # Initialize tags array if it doesn't exist
            if 'tags' not in pdf or not pdf['tags']:
                pdf['tags'] = []
                
            # Process sourceQuery to extract potential tags
            if isinstance(pdf.get('sourceQuery'), list):
                # Extract meaningful terms from the query as tags
                for term in pdf['sourceQuery']:
                    # Skip common terms, filetype specifiers, and any term containing 'filetype:pdf'
                    if (term.lower() not in ['filetype:pdf', 'pdf', 'filetype', 'and', 'or', 'the', 'a', 'an'] 
                            and 'filetype:' not in term.lower()
                            and len(term) > 2 
                            and term.lower() not in [t.lower() for t in pdf['tags']]):
                        pdf['tags'].append(term.lower())
            elif isinstance(pdf.get('sourceQuery'), str):
                # Split the string into terms
                terms = pdf['sourceQuery'].split()
                for term in terms:
                    if (term.lower() not in ['filetype:pdf', 'pdf', 'filetype', 'and', 'or', 'the', 'a', 'an']
                            and 'filetype:' not in term.lower()
                            and len(term) > 2 
                            and term.lower() not in [t.lower() for t in pdf['tags']]):
                        pdf['tags'].append(term.lower())
            
            # Remove sourceQuery field to ensure it's not included in final result
            del pdf['sourceQuery']
        
        # Auto-categorize based on title and search query
        if args.auto_categorize and not pdf.get('categories'):
            # Create text to analyze from title only since sourceQuery might be deleted
            analysis_text = pdf.get('title', '')
            
            # Detect categories
            detected_categories = detect_categories(analysis_text)
            if detected_categories:
                pdf['categories'] = detected_categories
        
        # Ensure all entries conform to the standard schema
        if args.standardize:
            pdf = ensure_json_schema_compatibility(pdf)
    
    return results

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
        
        # Load categories from central configuration
        categories_config = load_categories_config()
        
        # Create empty structure with metadata
        initial_data = {
            "lastValidated": datetime.now().isoformat(),
            "metadata": {
                "version": "2.0",
                "categories": [
                    {
                        "id": cat["id"],
                        "name": cat["name"],
                        "color": cat["color"]
                    }
                    for cat in categories_config["categories"]
                ],
                "lastUpdated": datetime.now().isoformat()
            },
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
    
    # Process all categories mode
    if args.all:
        categories_config = load_categories_config()
        total_results = []
        
        print(f"PDF Update Script - All Categories Mode")
        print(f"=======================================")
        print(f"Processing {len(categories_config['categories'])} categories")
        print(f"Using search methods: {', '.join(search_methods)}")
        print(f"Maximum results per search: {args.limit}")
        print()
        
        for category in categories_config["categories"]:
            category_id = category["id"]
            category_name = category["name"]
            
            print(f"Processing category: {category_name} ({category_id})")
            
            # Use the category keywords to construct search queries
            all_category_results = []
            
            for keyword in category["keywords"]:
                # Skip very short keywords
                if len(keyword) < 3:
                    continue
                    
                query = f"{keyword} filetype:pdf"
                print(f"  Searching for: {query}")
                
                # Perform the search with current category
                temp_args = argparse.Namespace(**vars(args))
                temp_args.query = query
                temp_args.category = category_id
                
                # Search using current query
                results = finder.search_and_process(
                    query=query,
                    limit=args.limit,
                    search_methods=search_methods,
                    verify=not args.no_verify
                )
                
                # Post-process results for this category
                processed_results = post_process_results(results, temp_args)
                all_category_results.extend(processed_results)
                total_results.extend(processed_results)
                
                # Short delay between queries to avoid rate limiting
                time.sleep(1)
            
            print(f"  Added {len(all_category_results)} PDFs to category: {category_name}")
            print()
        
        # Update all results in the data file
        if total_results:
            finder.save_results()
            
        # Print overall results summary
        print(f"All Categories Update Completed:")
        print(f"- {len(total_results)} new PDFs added")
        print(f"- Collection now contains {len(finder.data['pdfs'])} PDFs total")
        print(f"- Updated collection saved to {output_file}")
        
        # Print category statistics
        print(f"\nCategory statistics:")
        category_counts = {}
        for pdf in finder.data["pdfs"]:
            for cat in pdf.get("categories", ["uncategorized"]):
                category_counts[cat] = category_counts.get(cat, 0) + 1
        
        for cat_id, count in category_counts.items():
            # Try to get the actual category name
            cat_name = next((c["name"] for c in categories_config["categories"] if c["id"] == cat_id), cat_id)
            print(f"- {cat_name}: {count} PDFs")
        
    else:
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
        
        # Post-process results for schema compatibility and categorization
        results = post_process_results(results, args)
        
        # Update the results in the data file
        if results:
            finder.save_results()
        
        # Print results summary
        print(f"|Update completed:")
        print(f"- {len(results)} new PDFs added")
        print(f"- Collection now contains {len(finder.data['pdfs'])} PDFs total")
        print(f"- Updated collection saved to {output_file}")

if __name__ == "__main__":
    main()