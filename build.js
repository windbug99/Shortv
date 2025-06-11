#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting comprehensive build process...');

// Clean previous build
console.log('Cleaning previous build...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('Previous build cleaned');
} catch (error) {
  console.warn('Warning: Could not clean previous build:', error.message);
}

// Step 1: Build the client with optimized settings
console.log('Building client application...');
try {
  execSync('vite build --mode production', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('Client build completed successfully');
} catch (error) {
  console.error('Client build failed:', error.message);
  process.exit(1);
}

// Step 2: Build the server with production optimizations
console.log('Building server application...');
try {
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify --sourcemap=external --target=node18', { 
    stdio: 'inherit' 
  });
  console.log('Server build completed successfully');
} catch (error) {
  console.error('Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Comprehensive build verification
console.log('Verifying build integrity...');

const serverFile = path.resolve('dist/index.js');
const clientDir = path.resolve('dist/public');
const indexHtml = path.resolve(clientDir, 'index.html');
const assetsDir = path.resolve(clientDir, 'assets');

// Check server build
if (!fs.existsSync(serverFile)) {
  console.error('CRITICAL: Server build file missing:', serverFile);
  process.exit(1);
}

const serverStats = fs.statSync(serverFile);
if (serverStats.size < 1000) {
  console.error('CRITICAL: Server build file too small, likely corrupted');
  process.exit(1);
}

// Check client build
if (!fs.existsSync(clientDir)) {
  console.error('CRITICAL: Client build directory missing:', clientDir);
  process.exit(1);
}

if (!fs.existsSync(indexHtml)) {
  console.error('CRITICAL: Client index.html missing:', indexHtml);
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  console.error('CRITICAL: Client assets directory missing:', assetsDir);
  process.exit(1);
}

// Verify assets are present
const assets = fs.readdirSync(assetsDir);
if (assets.length === 0) {
  console.error('CRITICAL: No assets found in build');
  process.exit(1);
}

console.log('Build verification completed successfully');
console.log('Server file size:', Math.round(serverStats.size / 1024) + 'KB');
console.log('Client assets found:', assets.length);
console.log('Deployment-ready build completed successfully!');