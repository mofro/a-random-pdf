/**
 * PDF Search Configuration
 * 
 * This file contains configuration settings for the PDF search and update
 * system, focusing on a client-side friendly JSON-based approach.
 */

module.exports = {
  // Categories for organizing PDFs
  categories: [
    { id: "ai", name: "Artificial Intelligence", keywords: ["machine learning", "neural networks", "AI"], color: "#3498db" },
    { id: "programming", name: "Programming", keywords: ["javascript", "python", "algorithms"], color: "#2ecc71" },
    { id: "security", name: "Security", keywords: ["cybersecurity", "encryption", "privacy"], color: "#e74c3c" },
    { id: "networks", name: "Networks", keywords: ["distributed systems", "protocols", "internet"], color: "#9b59b6" },
    { id: "databases", name: "Databases", keywords: ["SQL", "NoSQL", "data modeling"], color: "#f1c40f" },
    // Add gaming categories
    { id: "gaming", name: "Game Development", keywords: ["game design", "game engines", "unity", "unreal engine"], color: "#e67e22" },
    { id: "gamedesign", name: "Game Design", keywords: ["level design", "narrative design", "game mechanics", "game balance"], color: "#d35400" },
    { id: "gametesting", name: "Game Testing & QA", keywords: ["playtesting", "game testing", "quality assurance", "beta testing"], color: "#16a085" },
    { id: "gameai", name: "Game AI", keywords: ["npc behaviors", "pathfinding", "game ai", "procedural generation"], color: "#8e44ad" },
    { id: "esports", name: "Esports", keywords: ["competitive gaming", "esports", "tournament", "game streaming"], color: "#c0392b" },
    // New categories for specific interests
    { id: "medicine", name: "Medicine", keywords: ["medical research", "healthcare", "clinical", "anatomy", "physiology"], color: "#27ae60" },
    { id: "science", name: "General Science", keywords: ["scientific research", "experiments", "methodology", "science"], color: "#2980b9" },
    { id: "physics", name: "Physics", keywords: ["quantum physics", "theoretical physics", "mechanics", "relativity"], color: "#8e44ad" },
    { id: "politics", name: "Politics", keywords: ["political science", "government", "policy", "international relations"], color: "#c0392b" },
    { id: "literature", name: "Literature", keywords: ["literary analysis", "poetry", "fiction", "novels", "writing"], color: "#d35400" },
    { id: "sports", name: "Sports", keywords: ["athletics", "coaching", "training", "sports science", "physical education"], color: "#16a085" }
  ],
  
  // Sources to search
  searches: [
    // AI/Machine Learning
    "machine learning filetype:pdf",
    "neural networks filetype:pdf",
    "artificial intelligence filetype:pdf",
    "deep learning filetype:pdf",
    "reinforcement learning filetype:pdf",
    
    // Gaming
    "board gaming filetype:pdf",
    "role-playing gaming filetype:pdf",
    "tabletop gaming filetype:pdf",
    "strategy games filetype:pdf",
    "virtual reality gaming filetype:pdf",
    
    // Game Development
    "game development tutorial filetype:pdf",
    "game engines filetype:pdf",
    "unity game engine guide filetype:pdf",
    "unreal engine documentation filetype:pdf",
    "godot engine tutorial filetype:pdf",
    
    // Game Design
    "game design document template filetype:pdf",
    "level design principles filetype:pdf",
    "narrative design in games filetype:pdf",
    "game mechanics filetype:pdf",
    "game balance techniques filetype:pdf",
    
    // Game Testing & QA
    "game testing methodology filetype:pdf",
    "playtesting techniques filetype:pdf",
    "quality assurance in games filetype:pdf",
    "beta testing best practices filetype:pdf",
    "user experience testing filetype:pdf",
    
    // Game AI
    "game AI techniques filetype:pdf",
    "npc behaviors filetype:pdf",
    "pathfinding algorithms filetype:pdf",
    "procedural generation filetype:pdf",
    "machine learning in games filetype:pdf",
    
    // Esports
    "esports management filetype:pdf",
    "competitive gaming filetype:pdf",
    "tournament organization filetype:pdf",
    "game streaming guide filetype:pdf",
    "professional gaming filetype:pdf",
    
    // Programming
    "programming algorithms filetype:pdf",
    "javascript programming filetype:pdf",
    "python programming filetype:pdf",
    "algorithms and data structures filetype:pdf",
    "software engineering best practices filetype:pdf",
    "web development filetype:pdf",
    
    // Security
    "cybersecurity best practices filetype:pdf",
    "encryption techniques filetype:pdf",
    "network security filetype:pdf",
    "privacy protection filetype:pdf",
    "security vulnerabilities filetype:pdf",
    
    // Networks
    "distributed systems design filetype:pdf",
    "network protocols filetype:pdf",
    "computer networks filetype:pdf",
    "internet architecture filetype:pdf",
    "wireless networking filetype:pdf",
    
    // Databases
    "database optimization techniques filetype:pdf",
    "SQL databases filetype:pdf",
    "NoSQL database systems filetype:pdf",
    "data modeling filetype:pdf",
    "database management filetype:pdf",
    
    // Medicine
    "medical research filetype:pdf",
    "clinical guidelines filetype:pdf",
    "healthcare management filetype:pdf",
    "anatomy and physiology filetype:pdf",
    "medical diagnosis filetype:pdf",
    
    // Science
    "scientific research methodology filetype:pdf",
    "experimental design filetype:pdf",
    "scientific discoveries filetype:pdf",
    "science education filetype:pdf",
    "environmental science filetype:pdf",
    
    // Physics
    "quantum physics filetype:pdf",
    "theoretical physics filetype:pdf",
    "mechanics principles filetype:pdf",
    "relativity theory filetype:pdf",
    "particle physics filetype:pdf",
    
    // Politics
    "political science filetype:pdf",
    "government policy filetype:pdf",
    "international relations filetype:pdf",
    "political theory filetype:pdf",
    "public administration filetype:pdf",
    
    // Literature
    "literary analysis filetype:pdf",
    "creative writing filetype:pdf",
    "poetry collections filetype:pdf",
    "literary criticism filetype:pdf",
    "novel writing guide filetype:pdf",
    
    // Sports
    "sports coaching filetype:pdf",
    "athletic training filetype:pdf",
    "sports psychology filetype:pdf",
    "physical education filetype:pdf",
    "sports science research filetype:pdf",
    
    // General Interest
    "history filetype:pdf",
    "engineering filetype:pdf",
    "music theory filetype:pdf",
    "government policies filetype:pdf",
    "film screenplay scripts filetype:pdf"
  ],
  
  // File paths
  paths: {
    dataFile: 'public/data/pdf-data.json', // Main data file
    backupFile: 'public/data/pdf-data.backup.json', // Backup of the data file
    searchesFile: 'searches.md', // File containing searches to run
    urlsFile: 'urls.json' // File containing specific URL targets
  },
  
  // Search limits
  limits: {
    maxResults: 100, // Maximum total PDFs to store
    maxPerSearch: 20, // Maximum results per search query
    maxHistorySize: 50 // Maximum number of PDFs to track in view history
  },
  
  // Update settings
  update: {
    preserveExisting: true, // Keep existing PDFs when updating
    addCategories: true, // Add category information to PDFs
    addDateAdded: true, // Add date when the PDF was added
    validateUrls: false, // Validate URLs are still accessible (can be slow)
    removeUnavailable: false, // Remove PDFs that are no longer available
    includeUrlTargets: true // Include specific URL targets from urls.json
  }
}; 