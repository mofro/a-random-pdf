#!/usr/bin/env python3
"""
Sync Categories

This script synchronizes Python scripts with the centralized category configuration.
"""

import json
import os
import sys
from pathlib import Path

# Import our category utilities
try:
    from category_utils import load_categories_config, get_project_root
except ImportError:
    # Try to find the module in the same directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.exists(os.path.join(script_dir, 'category_utils.py')):
        sys.path.append(script_dir)
        from category_utils import load_categories_config, get_project_root
    else:
        print("Error: Could not import category_utils.py. Make sure it's in the same directory.")
        sys.exit(1)

def update_pdf_data_metadata(config):
    """Update the metadata section in pdf-data.json"""
    data_file_path = get_project_root() / 'public' / 'data' / 'pdf-data.json'
    
    if not data_file_path.exists():
        print(f"✗ Error: pdf-data.json not found at {data_file_path}")
        return False
    
    try:
        # Read the data file
        with open(data_file_path, 'r', encoding='utf-8') as f:
            pdf_data = json.load(f)
        
        # Update the metadata section
        if 'metadata' not in pdf_data:
            pdf_data['metadata'] = {}
        
        # Update categories in metadata
        pdf_data['metadata']['categories'] = [
            {
                "id": cat["id"],
                "name": cat["name"],
                "color": cat["color"]
            }
            for cat in config["categories"]
        ]
        
        # Ensure version is set
        pdf_data['metadata']['version'] = pdf_data['metadata'].get('version', '2.0')
        
        # Write the updated file
        with open(data_file_path, 'w', encoding='utf-8') as f:
            json.dump(pdf_data, f, indent=2)
        
        print('✓ Updated pdf-data.json metadata from Python')
        return True
    except Exception as e:
        print(f"✗ Error updating pdf-data.json: {str(e)}")
        return False

def generate_searches_file(config):
    """Generate a searches.md file from the categories configuration"""
    searches_file_path = get_project_root() / 'config' / 'searches.md'
    
    try:
        # Generate the content
        content = "# PDF Search Queries\n\n"
        
        for category in config["categories"]:
            content += f"# {category['name']}\n"
            
            # Add search queries for each keyword
            for keyword in category["keywords"]:
                content += f"{keyword} filetype:pdf\n"
            
            content += "\n"
        
        # Write the file
        with open(searches_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print('✓ Updated searches.md from Python')
        return True
    except Exception as e:
        print(f"✗ Error updating searches.md: {str(e)}")
        return False

def update_categories_in_pdfs(config):
    """Update category assignments in PDFs based on keywords"""
    data_file_path = get_project_root() / 'public' / 'data' / 'pdf-data.json'
    
    if not data_file_path.exists():
        print(f"✗ Error: pdf-data.json not found at {data_file_path}")
        return False
    
    try:
        # Read the data file
        with open(data_file_path, 'r', encoding='utf-8') as f:
            pdf_data = json.load(f)
        
        updated_count = 0
        
        # Process each PDF
        for pdf in pdf_data['pdfs']:
            # Skip PDFs that already have categories assigned
            if pdf.get('categories') and len(pdf['categories']) > 0:
                continue
            
            # Look for keywords in title and create a list of matching category IDs
            text = f"{pdf.get('title', '')} {pdf.get('description', '')}"
            matches = []
            
            for category in config["categories"]:
                for keyword in category["keywords"]:
                    if keyword.lower() in text.lower():
                        if category["id"] not in matches:
                            matches.append(category["id"])
                        break
            
            # If we found categories, update the PDF
            if matches:
                pdf['categories'] = matches
                updated_count += 1
        
        # Write the updated file if changes were made
        if updated_count > 0:
            with open(data_file_path, 'w', encoding='utf-8') as f:
                json.dump(pdf_data, f, indent=2)
            print(f'✓ Updated categories for {updated_count} PDFs')
        else:
            print('✓ No PDFs needed category updates')
        
        return True
    except Exception as e:
        print(f"✗ Error updating PDF categories: {str(e)}")
        return False

def main():
    """Main function to update all files with the centralized categories"""
    print('Category Synchronization (Python)')
    print('===============================')
    
    # Load the centralized configuration
    config = load_categories_config()
    print(f"Loaded {len(config['categories'])} categories from central configuration")
    
    # Update PDF metadata section
    update_pdf_data_metadata(config)
    
    # Generate searches.md file
    generate_searches_file(config)
    
    # Update categories in PDFs
    update_categories_in_pdfs(config)
    
    print('\nSync completed!')

if __name__ == "__main__":
    main() 