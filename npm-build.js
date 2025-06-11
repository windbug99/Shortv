#!/usr/bin/env node
// This script replaces the problematic npm build command
// and ensures the deployment creates the correct dist/index.js file

import { execSync } from 'child_process';

console.log('Running corrected build process...');

try {
  // Run the working build script instead of the problematic package.json build command
  execSync('node build.js', {
    stdio: 'inherit'
  });
  
  console.log('✅ Build process completed successfully');
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}