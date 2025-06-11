#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function log(message) {
  console.log(`[BUILD] ${message}`);
}

function error(message) {
  console.error(`[ERROR] ${message}`);
}

// Clean and prepare
log('Cleaning previous build...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Build client (lightweight approach)
log('Building client...');
try {
  execSync('npm run build 2>/dev/null || vite build', { stdio: 'inherit' });
} catch (e) {
  error('Client build failed');
  process.exit(1);
}

// Verify all required files exist
const serverFile = path.resolve('dist/index.js');
const clientDir = path.resolve('dist/public');
const indexHtml = path.resolve(clientDir, 'index.html');

if (!fs.existsSync(serverFile)) {
  error('Server build missing: ' + serverFile);
  process.exit(1);
}

if (!fs.existsSync(indexHtml)) {
  error('Client build missing: ' + indexHtml);
  process.exit(1);
}

log('Build verification complete');
log('Server: ' + Math.round(fs.statSync(serverFile).size / 1024) + 'KB');
log('Client ready at: ' + clientDir);
log('Deployment build successful');