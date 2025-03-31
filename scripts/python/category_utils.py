#!/usr/bin/env python3
"""
Category Utilities

Utilities for working with the centralized category configuration.
This is used by both the JavaScript and Python scripts to ensure consistency.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

# Get the root directory of the project
def get_project_root() -> Path:
    """Get the root directory of the project."""
    current_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    return current_dir.parent.parent

def load_categories_config() -> Dict:
    """
    Load the categories from the central configuration file
    
    Returns:
        Dict: The categories configuration
    """
    config_path = get_project_root() / 'config' / 'categories.json'
    
    try:
        if not config_path.exists():
            print(f"Error: Categories configuration file not found at {config_path}")
            return create_default_config()
        
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading categories configuration: {str(e)}")
        return create_default_config()

def create_default_config() -> Dict:
    """
    Create a default configuration if the config file doesn't exist
    
    Returns:
        Dict: Default configuration
    """
    return {
        "version": "1.0",
        "lastUpdated": datetime.now().isoformat(),
        "categories": [
            {
                "id": "ai",
                "name": "Artificial Intelligence",
                "keywords": ["machine learning", "AI"],
                "color": "#3498db"
            },
            {
                "id": "programming",
                "name": "Programming",
                "keywords": ["javascript", "python"],
                "color": "#2ecc71"
            }
        ],
        "searchSuffixes": ["filetype:pdf"]
    }

def update_categories_config(config: Dict) -> bool:
    """
    Update the categories configuration file
    
    Args:
        config: The new configuration to save
        
    Returns:
        bool: Whether the update was successful
    """
    config_path = get_project_root() / 'config' / 'categories.json'
    
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        # Update lastUpdated timestamp
        config["lastUpdated"] = datetime.now().isoformat()
        
        # Write the file
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error updating categories configuration: {str(e)}")
        return False

def detect_categories(text: str) -> List[str]:
    """
    Detect category IDs based on text content
    
    Args:
        text: Text to analyze for category keywords
        
    Returns:
        List[str]: Array of category IDs matching the text
    """
    config = load_categories_config()
    text_lower = text.lower()
    matches = []
    
    for category in config["categories"]:
        for keyword in category["keywords"]:
            if keyword.lower() in text_lower:
                if category["id"] not in matches:
                    matches.append(category["id"])
                break
    
    return matches

def generate_search_queries(category_id: str) -> List[str]:
    """
    Generate search queries for a category based on the configuration
    
    Args:
        category_id: The category ID to generate queries for
        
    Returns:
        List[str]: Array of search queries
    """
    config = load_categories_config()
    category = next((cat for cat in config["categories"] if cat["id"] == category_id), None)
    
    if not category:
        return []
    
    # Generate search queries by combining keywords with suffixes
    queries = []
    
    for keyword in category["keywords"]:
        for suffix in config["searchSuffixes"]:
            queries.append(f"{keyword} {suffix}")
    
    return queries

def get_category_by_id(category_id: str) -> Optional[Dict]:
    """
    Get a category by its ID
    
    Args:
        category_id: The category ID to look for
        
    Returns:
        Optional[Dict]: The category object or None if not found
    """
    config = load_categories_config()
    return next((cat for cat in config["categories"] if cat["id"] == category_id), None)

def ensure_json_schema_compatibility(pdf_entry: Dict) -> Dict:
    """
    Ensure a PDF entry conforms to the JavaScript schema
    
    Args:
        pdf_entry: The PDF entry to normalize
        
    Returns:
        Dict: The normalized PDF entry
    """
    # Required fields with default values
    schema_fields = {
        "id": None,  # Should be provided
        "url": None,  # Should be provided
        "title": "Untitled PDF",
        "author": "Unknown",
        "categories": [],
        "source": "unknown",
        "yearPublished": None,
        "tags": [],
        "isAvailable": True,
        "dateAdded": datetime.now().strftime("%Y-%m-%d"),
        "lastChecked": datetime.now().strftime("%Y-%m-%d"),
        "lastStatus": 200,
        "pages": None,
        "sizeMB": None
    }
    
    # Apply defaults for missing fields
    for field, default_value in schema_fields.items():
        if field not in pdf_entry:
            pdf_entry[field] = default_value
    
    # Ensure arrays are arrays
    for field in ["categories", "tags"]:
        if not isinstance(pdf_entry[field], list):
            if pdf_entry[field]:
                pdf_entry[field] = [pdf_entry[field]]
            else:
                pdf_entry[field] = []
    
    # Remove non-standard fields
    allowed_fields = set(schema_fields.keys())
    for field in list(pdf_entry.keys()):
        if field not in allowed_fields:
            del pdf_entry[field]
    
    return pdf_entry

# Direct command line usage to update search queries
if __name__ == "__main__":
    config = load_categories_config()
    
    print(f"Loaded {len(config['categories'])} categories from configuration")
    
    # If arguments are provided, generate search queries for that category
    if len(sys.argv) > 1:
        category_id = sys.argv[1]
        queries = generate_search_queries(category_id)
        
        print(f"\nSearch queries for category '{category_id}':")
        for query in queries:
            print(f"- {query}")
    else:
        # Otherwise, print all categories
        print("\nAvailable categories:")
        for category in config["categories"]:
            print(f"- {category['id']}: {category['name']} ({len(category['keywords'])} keywords)") 