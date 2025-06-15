#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting deployment health check...');

// Verify build files exist
const serverFile = path.resolve('dist/index.js');
const clientDir = path.resolve('dist/public');
const indexHtml = path.resolve(clientDir, 'index.html');

if (!fs.existsSync(serverFile)) {
  console.error('FAILED: Server build file missing. Run build first.');
  process.exit(1);
}

if (!fs.existsSync(indexHtml)) {
  console.error('FAILED: Client build missing. Run build first.');
  process.exit(1);
}

console.log('Build files verified');

// Test server startup
const testPort = process.env.PORT || 3001;
const server = spawn('node', ['dist/index.js'], {
  env: { 
    ...process.env, 
    NODE_ENV: 'production',
    PORT: testPort
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverOutput = '';
let serverStarted = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  console.log('SERVER:', output.trim());
  
  if (output.includes('serving on port')) {
    serverStarted = true;
    console.log('SUCCESS: Server started successfully');
    server.kill();
  }
});

server.stderr.on('data', (data) => {
  const error = data.toString();
  console.error('SERVER ERROR:', error.trim());
});

server.on('close', (code) => {
  if (serverStarted) {
    console.log('Health check completed successfully');
    console.log('Application is ready for deployment');
    process.exit(0);
  } else {
    console.error('FAILED: Server did not start properly');
    console.error('Exit code:', code);
    console.error('Output:', serverOutput);
    process.exit(1);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!serverStarted) {
    console.error('TIMEOUT: Server startup took too long');
    server.kill();
    process.exit(1);
  }
}, 10000);