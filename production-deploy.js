#!/usr/bin/env node
// Production deployment script with enhanced port handling
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Production deployment build starting...');

// Clean and prepare
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server bundle
console.log('Building server bundle...');
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared', {
  stdio: 'inherit'
});

// Verify build output
if (!fs.existsSync('dist/index.js')) {
  console.error('CRITICAL: dist/index.js not created');
  process.exit(1);
}

// Create production package.json with proper start command
const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const productionPackage = {
  name: originalPackage.name,
  version: originalPackage.version,
  type: "module",
  main: "index.js",
  scripts: {
    start: "NODE_ENV=production node index.js"
  },
  engines: {
    node: ">=18.0.0"
  },
  dependencies: {
    // Essential server dependencies
    "@neondatabase/serverless": originalPackage.dependencies["@neondatabase/serverless"],
    "express": originalPackage.dependencies["express"],
    "express-session": originalPackage.dependencies["express-session"],
    "drizzle-orm": originalPackage.dependencies["drizzle-orm"],
    "drizzle-zod": originalPackage.dependencies["drizzle-zod"],
    "passport": originalPackage.dependencies["passport"],
    "passport-local": originalPackage.dependencies["passport-local"],
    "openid-client": originalPackage.dependencies["openid-client"],
    "node-cron": originalPackage.dependencies["node-cron"],
    "zod": originalPackage.dependencies["zod"],
    "connect-pg-simple": originalPackage.dependencies["connect-pg-simple"],
    "node-fetch": originalPackage.dependencies["node-fetch"],
    "memoizee": originalPackage.dependencies["memoizee"],
    "memorystore": originalPackage.dependencies["memorystore"],
    // AI and content processing
    "@google/generative-ai": originalPackage.dependencies["@google/generative-ai"],
    "@langchain/core": originalPackage.dependencies["@langchain/core"],
    "@langchain/openai": originalPackage.dependencies["@langchain/openai"],
    "langchain": originalPackage.dependencies["langchain"],
    "openai": originalPackage.dependencies["openai"],
    // YouTube and media processing
    "youtube-transcript": originalPackage.dependencies["youtube-transcript"],
    "ytdl-core": originalPackage.dependencies["ytdl-core"],
    "fluent-ffmpeg": originalPackage.dependencies["fluent-ffmpeg"],
    // WebSocket and utilities
    "ws": originalPackage.dependencies["ws"],
    "date-fns": originalPackage.dependencies["date-fns"],
    "zod-validation-error": originalPackage.dependencies["zod-validation-error"]
  },
  optionalDependencies: {
    "bufferutil": "^4.0.8"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Copy required files
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}
if (fs.existsSync('client')) {
  fs.cpSync('client', 'dist/client', { recursive: true });
}
fs.mkdirSync('dist/public', { recursive: true });

console.log('Production build completed successfully');
console.log('Ready for deployment: node dist/index.js');