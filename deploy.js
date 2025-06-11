#!/usr/bin/env node
// Deployment wrapper script for Replit
// This script ensures the build process works correctly for deployment

import { execSync } from 'child_process';
import fs from 'fs';

const REQUIRED_FILES = [
  'server/index.ts',
  'shared/schema.ts',
  'package.json'
];

console.log('Starting deployment process...');

// Verify required files exist
console.log('Checking required files...');
for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Required file missing: ${file}`);
    process.exit(1);
  }
}

// Install dependencies if node_modules doesn't exist
if (!fs.existsSync('node_modules')) {
  console.log('Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Run the production build
console.log('Running production build...');
try {
  execSync('node production-build.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}

// Final verification
if (!fs.existsSync('dist/index.js')) {
  console.error('❌ Deployment failed: dist/index.js not found');
  process.exit(1);
}

if (!fs.existsSync('dist/package.json')) {
  console.error('❌ Deployment failed: dist/package.json not found');
  process.exit(1);
}

console.log('✅ Deployment build completed successfully');
console.log('Ready for production deployment!');