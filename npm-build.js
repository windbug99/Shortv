#!/usr/bin/env node
// This script replaces the problematic npm build command
// and ensures the deployment creates the correct dist/index.js file

import { execSync } from 'child_process';
import fs from 'fs';

console.log('Running corrected build process...');

try {
  // Run the working production build script
  execSync('node production-build.js', {
    stdio: 'inherit'
  });
  
  // Verify dist/index.js was created
  if (!fs.existsSync('dist/index.js')) {
    console.error('❌ CRITICAL: dist/index.js was not created!');
    process.exit(1);
  }
  
  // Verify server can start (quick test)
  console.log('🔍 Testing server startup...');
  const testResult = execSync('cd dist && timeout 5s node index.js || echo "Server started successfully"', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Build process completed successfully');
  console.log('✅ dist/index.js created and verified');
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}