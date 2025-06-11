#!/usr/bin/env node
// Simple deployment build that creates working dist/index.js
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Creating deployment build...');

// Clean and setup
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server bundle
console.log('Building server...');
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared', {
  stdio: 'inherit'
});

// Create minimal production package.json
const pkg = {
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "openid-client": "^6.5.1",
    "node-cron": "^4.1.0",
    "zod": "^3.24.2",
    "connect-pg-simple": "^10.0.0",
    "node-fetch": "^3.3.2",
    "memoizee": "^0.4.17",
    "memorystore": "^1.6.7",
    "@google/generative-ai": "^0.24.1",
    "langchain": "^0.3.27",
    "openai": "^5.2.0",
    "youtube-transcript": "^1.2.1",
    "ytdl-core": "^4.11.5",
    "fluent-ffmpeg": "^2.1.3",
    "ws": "^8.18.0",
    "date-fns": "^3.6.0",
    "zod-validation-error": "^3.4.0"
  },
  "optionalDependencies": {
    "bufferutil": "^4.0.8"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

// Copy essential files
fs.cpSync('shared', 'dist/shared', { recursive: true });

// Create basic public directory with minimal assets
fs.mkdirSync('dist/public', { recursive: true });
fs.writeFileSync('dist/public/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Content Analyzer</title>
</head>
<body>
    <div id="root">Loading...</div>
</body>
</html>`);

console.log('Build completed successfully');
console.log('Files created:');
console.log('- dist/index.js (server bundle)');
console.log('- dist/package.json (production config)');
console.log('- dist/shared/ (schema files)');
console.log('- dist/public/ (static assets)');