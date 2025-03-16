# In pdf_finder.py, locate the main() function and modify it like this:

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
    
    results = finder.search_and_process(args.query, args.limit, search_methods)
    
    print(f"Found {len(results)} new PDFs")