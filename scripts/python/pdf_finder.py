#!/usr/bin/env python3
"""
PDF Finder Script

This script searches the web for PDF files using various methods and outputs the results
in a format compatible with the Random PDF Explorer application.

Contributors: Maurice Gaston, Claude https://claude.ai
Last Updated: March 2025

Requirements:
    pip install requests beautifulsoup4 googlesearch-python pdfplumber tqdm

Usage:
    python pdf_finder.py --query "machine learning tutorials" --limit 10 --output pdfs.json
"""

import argparse
import json
import os
import random
import re
import time
import urllib.parse
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

# Try to import optional dependencies
try:
    from googlesearch import search
    GOOGLE_SEARCH_AVAILABLE = True
except ImportError:
    GOOGLE_SEARCH_AVAILABLE = False
    print("Warning: googlesearch-python not available. Google search method will be disabled.")

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("Warning: pdfplumber not available. PDF metadata extraction will be limited.")

# Constants
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

# Request delays to avoid being blocked (in seconds)
MIN_DELAY = 2
MAX_DELAY = 5

class PDFFinder:
    """A class to find PDF files on the web using various search methods."""
    
    def __init__(self, output_file: str = "pdf_results.json", existing_file: Optional[str] = None,
                 verbose: bool = False):
        """
        Initialize the PDF finder.
        
        Args:
            output_file: Path to save the results JSON
            existing_file: Path to existing JSON file to update
            verbose: Whether to print detailed logs
        """
        self.output_file = output_file
        self.verbose = verbose
        self.session = requests.Session()
        
        # Load existing data if provided
        if existing_file and os.path.exists(existing_file):
            with open(existing_file, 'r', encoding='utf-8') as f:
                try:
                    self.data = json.load(f)
                    if self.verbose:
                        print(f"Loaded {len(self.data['pdfs'])} existing PDF entries.")
                except json.JSONDecodeError:
                    self.data = {"lastValidated": datetime.now().isoformat(), "pdfs": []}
        else:
            self.data = {"lastValidated": datetime.now().isoformat(), "pdfs": []}
            
        # Create a set of existing URLs for quick lookup
        self.existing_urls = {pdf['url'] for pdf in self.data['pdfs']}
    
    def _get_random_user_agent(self) -> str:
        """Return a random user agent from the list."""
        return random.choice(USER_AGENTS)
    
    def _introduce_delay(self) -> None:
        """Sleep for a random time to avoid rate limiting."""
        delay = random.uniform(MIN_DELAY, MAX_DELAY)
        time.sleep(delay)
    
    def search_using_google(self, query: str, limit: int = 10) -> List[str]:
        """
        Search for PDFs using the googlesearch package.
        
        Args:
            query: Search query string
            limit: Maximum number of results to return
            
        Returns:
            List of URLs that might be PDFs
        """
        if not GOOGLE_SEARCH_AVAILABLE:
            if self.verbose:
                print("Google search method not available. Install googlesearch-python package.")
            return []
            
        # Add 'filetype:pdf' to the query if not already present
        if 'filetype:pdf' not in query.lower():
            query = f"{query} filetype:pdf"
            
        results = []
        try:
            # The search function yields URLs one at a time
            for url in search(query, num_results=limit, lang="en"):
                if url.lower().endswith('.pdf'):
                    results.append(url)
                    
                # Respect rate limits
                self._introduce_delay()
                
                if len(results) >= limit:
                    break
        except Exception as e:
            if self.verbose:
                print(f"Error during Google search: {e}")
        
        return results
    
    def search_using_duckduckgo(self, query: str, limit: int = 10) -> List[str]:
        """
        Search for PDFs using DuckDuckGo.
        
        Args:
            query: Search query string
            limit: Maximum number of results to return
            
        Returns:
            List of URLs that might be PDFs
        """
        # Add 'filetype:pdf' to the query if not already present
        if 'filetype:pdf' not in query.lower():
            query = f"{query} filetype:pdf"
            
        encoded_query = urllib.parse.quote_plus(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        
        headers = {
            'User-Agent': self._get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://duckduckgo.com/'
        }
        
        results = []
        try:
            response = self.session.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.select('.result__a')
            
            for link in links:
                href = link.get('href')
                if href:
                    # DuckDuckGo uses redirects, so we need to extract the actual URL
                    if '/l/?uddg=' in href:
                        actual_url = href.split('/l/?uddg=')[1].split('&')[0]
                        actual_url = urllib.parse.unquote(actual_url)
                        if actual_url.lower().endswith('.pdf'):
                            results.append(actual_url)
                            if len(results) >= limit:
                                break
            
        except Exception as e:
            if self.verbose:
                print(f"Error during DuckDuckGo search: {e}")
        
        return results
    
    def search_website_for_pdfs(self, website_url: str, limit: int = 20) -> List[str]:
        """
        Crawl a specific website to find PDF links.
        
        Args:
            website_url: The website to search
            limit: Maximum number of PDF links to return
            
        Returns:
            List of PDF URLs found on the website
        """
        headers = {'User-Agent': self._get_random_user_agent()}
        results = []
        visited = set()
        to_visit = [website_url]
        
        # Basic crawler that looks for PDF links
        while to_visit and len(results) < limit:
            current_url = to_visit.pop(0)
            if current_url in visited:
                continue
                
            visited.add(current_url)
            
            try:
                response = self.session.get(current_url, headers=headers, timeout=10)
                if response.status_code != 200:
                    continue
                    
                # Check content type - we only want to parse HTML pages
                content_type = response.headers.get('Content-Type', '')
                if 'text/html' not in content_type:
                    continue
                    
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find PDF links
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    
                    # Handle relative URLs
                    if href.startswith('/'):
                        href = urllib.parse.urljoin(current_url, href)
                    
                    # Check if it's a PDF
                    if href.lower().endswith('.pdf'):
                        if href not in results:
                            results.append(href)
                            if len(results) >= limit:
                                break
                    
                    # Add more links to explore (but stay on the same domain)
                    if (len(to_visit) < 50 and href not in visited and href not in to_visit and
                            urllib.parse.urlparse(current_url).netloc == urllib.parse.urlparse(href).netloc):
                        to_visit.append(href)
                        
                # Respect the website by not hammering it with requests
                self._introduce_delay()
                        
            except Exception as e:
                if self.verbose:
                    print(f"Error crawling {current_url}: {e}")
        
        return results
    
    def validate_pdf_url(self, url: str, verify: bool = True) -> Tuple[bool, Dict[str, Union[str, int]]]:
        """
        Validate that a URL actually points to a PDF and get basic metadata.
        
        Args:
            url: The URL to check
            verify: Whether to download a sample to verify content
            
        Returns:
            Tuple of (is_valid, metadata_dict)
        """
        headers = {'User-Agent': self._get_random_user_agent()}
        metadata = {}
        
        try:
            # Make a HEAD request first to check content type and size
            head_response = self.session.head(url, headers=headers, timeout=10, allow_redirects=True)
            
            content_type = head_response.headers.get('Content-Type', '').lower()
            if 'application/pdf' not in content_type and not url.lower().endswith('.pdf'):
                if self.verbose:
                    print(f"Skipping non-PDF content type: {content_type} for {url}")
                return False, {}
                
            # Get content length if available
            content_length = head_response.headers.get('Content-Length')
            if content_length:
                # Convert to MB for readability
                size_mb = round(int(content_length) / (1024 * 1024), 2)
                metadata['sizeMB'] = size_mb
                
                # Skip very large PDFs
                if size_mb > 50:  # Adjust this threshold as needed
                    if self.verbose:
                        print(f"Skipping large PDF ({size_mb} MB): {url}")
                    return False, {}
            
            # Get the PDF title from the URL if we can't extract it
            filename = os.path.basename(urllib.parse.urlparse(url).path)
            title = filename.replace('.pdf', '').replace('-', ' ').replace('_', ' ').replace('%20', ' ')
            title = ' '.join(w.capitalize() if w.islower() else w for w in title.split())
            metadata['title'] = title
            
            # Skip deep verification if not requested
            if not verify:
                return True, metadata
            
            # Try to get more metadata if pdfplumber is available
            if PDFPLUMBER_AVAILABLE:
                # Download a small chunk of the PDF to extract metadata
                with self.session.get(url, headers=headers, stream=True, timeout=15) as response:
                    if response.status_code == 200:
                        # Download only the first 100KB to check
                        chunk_size = 1024  # 1KB
                        max_chunks = 100   # 100KB max
                        
                        chunks = []
                        for i, chunk in enumerate(response.iter_content(chunk_size=chunk_size)):
                            if i >= max_chunks:
                                break
                            chunks.append(chunk)
                        
                        # Save to a temporary file
                        temp_file = f'temp_pdf_download_{random.randint(1000, 9999)}.pdf'
                        with open(temp_file, 'wb') as f:
                            for chunk in chunks:
                                f.write(chunk)
                        
                        try:
                            # Extract metadata from the PDF
                            with pdfplumber.open(temp_file) as pdf:
                                if hasattr(pdf, 'metadata') and pdf.metadata:
                                    if pdf.metadata.get('Title'):
                                        metadata['title'] = pdf.metadata.get('Title')
                                    if pdf.metadata.get('Author'):
                                        metadata['author'] = pdf.metadata.get('Author')
                                    if pdf.metadata.get('CreationDate'):
                                        # Try to parse PDF creation date
                                        date_str = pdf.metadata.get('CreationDate')
                                        if date_str and date_str.startswith('D:'):
                                            # Basic conversion of PDF date format
                                            date_str = date_str[2:10]  # Extract YYYYMMDD
                                            try:
                                                year = date_str[:4]
                                                metadata['yearPublished'] = year
                                            except:
                                                pass
                                
                                # Get page count
                                metadata['pages'] = len(pdf.pages)
                                
                                # Get text from first page for better title
                                if 'title' not in metadata or metadata['title'] == title:
                                    try:
                                        first_page = pdf.pages[0]
                                        text = first_page.extract_text()
                                        if text:
                                            # Try to extract a title from the first few lines
                                            lines = text.split('|')
                                            for line in lines[:5]:  # Check first 5 lines
                                                line = line.strip()
                                                if 10 < len(line) < 100:  # Reasonable title length
                                                    metadata['title'] = line
                                                    break
                                    except:
                                        pass
                        except Exception as e:
                            if self.verbose:
                                print(f"Error extracting PDF metadata: {e}")
                        finally:
                            # Clean up temp file
                            if os.path.exists(temp_file):
                                os.remove(temp_file)
            
            # Clean up title if needed
            if 'title' in metadata:
                # Remove excessive whitespace and newlines
                metadata['title'] = re.sub(r'\s+', ' ', metadata['title']).strip()
                # Truncate very long titles
                if len(metadata['title']) > 200:
                    metadata['title'] = metadata['title'][:197] + '...'
            
            return True, metadata
                
        except Exception as e:
            if self.verbose:
                print(f"Error validating PDF URL {url}: {e}")
            return False, {}
    
    def search_and_process(self, query: str, limit: int = 10, 
                          search_methods: List[str] = None, verify: bool = True) -> List[Dict]:
        """
        Search for PDFs using the specified methods and process the results.
        
        Args:
            query: Search query
            limit: Maximum number of results per search method
            search_methods: List of search methods to use ['google', 'duckduckgo', 'website']
                            If 'website' is included, the query should be a website URL
            verify: Whether to download a sample of each PDF to verify its content
            
        Returns:
            List of validated PDF information dictionaries
        """
        if search_methods is None:
            search_methods = ['google', 'duckduckgo']
            
        all_urls = []
        
        # Collect URLs from all specified search methods
        for method in search_methods:
            if method == 'google':
                if self.verbose:
                    print(f"Searching Google for: {query}")
                urls = self.search_using_google(query, limit)
                all_urls.extend(urls)
            elif method == 'duckduckgo':
                if self.verbose:
                    print(f"Searching DuckDuckGo for: {query}")
                urls = self.search_using_duckduckgo(query, limit)
                all_urls.extend(urls)
            elif method == 'website':
                if self.verbose:
                    print(f"Crawling website: {query}")
                urls = self.search_website_for_pdfs(query, limit)
                all_urls.extend(urls)
        
        # Remove duplicates while preserving order
        unique_urls = []
        seen = set()
        for url in all_urls:
            if url not in seen and url not in self.existing_urls:
                seen.add(url)
                unique_urls.append(url)
                
        if self.verbose:
            print(f"Found {len(unique_urls)} unique new PDF URLs")
            
        # Validate and process each URL
        results = []
        for url in tqdm(unique_urls, desc="Validating PDFs", disable=not self.verbose):
            is_valid, metadata = self.validate_pdf_url(url, verify=verify)
            if is_valid:
                # Generate a unique ID
                pdf_id = f"pdf{abs(hash(url)) % 10000000:07d}"
                
                pdf_entry = {
                    "id": pdf_id,
                    "url": url,
                    "title": metadata.get('title', "Untitled PDF"),
                    "dateAdded": datetime.now().strftime("%Y-%m-%d"),
                    "lastChecked": datetime.now().strftime("%Y-%m-%d"),
                    "isAvailable": True,
                    "lastStatus": 200
                }
                
                # Add optional metadata if available
                if 'author' in metadata:
                    pdf_entry["author"] = metadata['author']
                if 'pages' in metadata:
                    pdf_entry["pages"] = metadata['pages']
                if 'sizeMB' in metadata:
                    pdf_entry["sizeMB"] = metadata['sizeMB']
                if 'yearPublished' in metadata:
                    pdf_entry["yearPublished"] = metadata['yearPublished']
                if len(query) > 0:
                    pdf_entry["sourceQuery"] = query.split(" ")
                
                results.append(pdf_entry)
                self.data['pdfs'].append(pdf_entry)
                
                # Update our set of URLs to avoid duplicates
                self.existing_urls.add(url)
            
            # Short delay between validations
            time.sleep(random.uniform(0.5, 1.5))
            
        # Save results to the output file
        self.save_results()
        
        return results
    
    def save_results(self) -> None:
        """Save the current results to the output file."""
        self.data["lastValidated"] = datetime.now().isoformat()
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(os.path.abspath(self.output_file)), exist_ok=True)
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
            
        if self.verbose:
            print(f"Saved {len(self.data['pdfs'])} PDF entries to {self.output_file}")

def main():
    """Main function to run the PDF finder from command line."""
    parser = argparse.ArgumentParser(description='Find PDF files on the web.')
    parser.add_argument('--query', type=str, required=True, 
                        help='Search query or website URL')
    parser.add_argument('--limit', type=int, default=10,
                        help='Maximum number of results per search method')
    parser.add_argument('--output', type=str, default='pdf_results.json',
                        help='Output JSON file path')
    parser.add_argument('--existing', type=str, default=None,
                        help='Existing JSON file to update')
    parser.add_argument('--methods', type=str, default='google,duckduckgo',
                        help='Comma-separated list of search methods: google,duckduckgo,website')
    parser.add_argument('--verbose', action='store_true',
                        help='Enable verbose output')
    parser.add_argument('--append', action='store_true', default=True,
                        help='Append to existing output file instead of overwriting')
    parser.add_argument('--no-verify', action='store_true',
                        help='Skip verification of PDF content')
    
    args = parser.parse_args()
    
    # If append mode is enabled and no existing file is specified,
    # use the output file as the existing file if it exists
    if args.append and args.existing is None and os.path.exists(args.output):
        args.existing = args.output
        if args.verbose:
            print(f"Append mode: Using output file as existing file: {args.output}")
    
    # Parse search methods
    search_methods = args.methods.split(',')
    
    finder = PDFFinder(output_file=args.output, existing_file=args.existing, 
                       verbose=args.verbose)
    
    results = finder.search_and_process(
        args.query, 
        args.limit, 
        search_methods, 
        verify=not args.no_verify
    )
    
    print(f"Found {len(results)} new PDFs")
    
if __name__ == "__main__":
    main()