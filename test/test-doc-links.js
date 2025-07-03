#!/usr/bin/env node

/**
 * Test Documentation Links
 * Ensures all documentation references point to valid files
 */

const fs = require('fs');
const path = require('path');

// Define documentation references to test
const docReferences = [
  {
    source: 'claude.md',
    references: [
      '/docs/DEPLOYMENT_STATUS.md',
      '/docs/MVP_ROADMAP.md',
      '/app/api/migrate-db/route.ts',
      '.env.local'
    ]
  },
  {
    source: 'project.md',
    references: [
      '/docs/DEPLOYMENT_STATUS.md',
      '/app/api/migrate-db/route.ts'
    ]
  },
  {
    source: 'docs/REQUIREMENTS.md',
    references: [
      '/docs/DEPLOYMENT_STATUS.md',
      '/app/api/migrate-db/route.ts'
    ]
  }
];

// Test function
function testDocumentationLinks() {
  console.log('Testing Documentation Links...\n');
  
  let errors = 0;
  const projectRoot = path.join(__dirname, '..');
  
  docReferences.forEach(doc => {
    const sourcePath = path.join(projectRoot, doc.source);
    
    // Check if source document exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source document not found: ${doc.source}`);
      errors++;
      return;
    }
    
    console.log(`📄 Checking ${doc.source}:`);
    
    // Read source document
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Check each reference
    doc.references.forEach(ref => {
      // Clean reference path (remove leading slash for path.join)
      const cleanRef = ref.startsWith('/') ? ref.slice(1) : ref;
      const refPath = path.join(projectRoot, cleanRef);
      
      // Check if reference exists in content
      if (!content.includes(ref)) {
        console.error(`  ❌ Reference not found in content: ${ref}`);
        errors++;
        return;
      }
      
      // Check if referenced file exists
      if (!fs.existsSync(refPath)) {
        console.error(`  ❌ Referenced file not found: ${ref}`);
        errors++;
      } else {
        console.log(`  ✅ ${ref}`);
      }
    });
    
    console.log('');
  });
  
  // Summary
  if (errors === 0) {
    console.log('✅ All documentation links are valid!');
    process.exit(0);
  } else {
    console.error(`\n❌ Found ${errors} broken documentation links.`);
    process.exit(1);
  }
}

// Run tests
testDocumentationLinks();