#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

// Restore original successful deployment build
try {
  console.log('Building for deployment...');
  
  // Clean dist
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });
  
  // Build server with exact path expected by deployment system
  console.log('Building server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { stdio: 'inherit' });
  
  // Copy essential files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }
  
  // Create public directory for static files
  fs.mkdirSync('dist/public', { recursive: true });
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}