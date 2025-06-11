#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔨 Starting build process...');

// Step 1: Build the client
console.log('📦 Building client...');
try {
  execSync('vite build', { stdio: 'inherit' });
  console.log('✅ Client build completed');
} catch (error) {
  console.error('❌ Client build failed:', error.message);
  process.exit(1);
}

// Step 2: Build the server
console.log('🖥️ Building server...');
try {
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  console.log('✅ Server build completed');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Verify build outputs
console.log('🔍 Verifying build outputs...');

const serverFile = path.resolve('dist/index.js');
const clientDir = path.resolve('dist/public');

if (!fs.existsSync(serverFile)) {
  console.error('❌ Server build file not found:', serverFile);
  process.exit(1);
}

if (!fs.existsSync(clientDir)) {
  console.error('❌ Client build directory not found:', clientDir);
  process.exit(1);
}

const indexHtml = path.resolve(clientDir, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('❌ Client index.html not found:', indexHtml);
  process.exit(1);
}

console.log('✅ All build outputs verified');
console.log('🎉 Build process completed successfully!');