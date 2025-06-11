#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Creating production package.json...');

// Read the original package.json
const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create production package.json with deployment optimizations
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
    // Core server dependencies
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
    // AI and processing dependencies
    "@google/generative-ai": originalPackage.dependencies["@google/generative-ai"],
    "@langchain/core": originalPackage.dependencies["@langchain/core"],
    "@langchain/openai": originalPackage.dependencies["@langchain/openai"],
    "langchain": originalPackage.dependencies["langchain"],
    "openai": originalPackage.dependencies["openai"],
    // YouTube processing dependencies
    "youtube-transcript": originalPackage.dependencies["youtube-transcript"],
    "ytdl-core": originalPackage.dependencies["ytdl-core"],
    "fluent-ffmpeg": originalPackage.dependencies["fluent-ffmpeg"],
    // Utilities
    "ws": originalPackage.dependencies["ws"],
    "date-fns": originalPackage.dependencies["date-fns"],
    "zod-validation-error": originalPackage.dependencies["zod-validation-error"]
  },
  optionalDependencies: {
    "bufferutil": "^4.0.8"
  }
};

// Write the production package.json
fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

// Copy essential files
console.log('Copying essential files...');

// Copy shared directory
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

// Create public directory for static files
fs.mkdirSync('dist/public', { recursive: true });

// Copy client build output to public
if (fs.existsSync('dist/client')) {
  fs.cpSync('dist/client', 'dist/public', { recursive: true });
}

console.log('✅ Production build package created successfully');