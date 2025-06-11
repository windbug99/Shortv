#!/usr/bin/env node
// Simple, reliable deployment build
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Building for deployment...');

// Clean and create dist
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server only (skip client for now)
console.log('Building server...');
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared', { stdio: 'inherit' });

// Create production package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  type: "module",
  scripts: { start: "NODE_ENV=production node index.js" },
  dependencies: {
    "@neondatabase/serverless": pkg.dependencies["@neondatabase/serverless"],
    "express": pkg.dependencies["express"],
    "express-session": pkg.dependencies["express-session"],
    "drizzle-orm": pkg.dependencies["drizzle-orm"],
    "drizzle-zod": pkg.dependencies["drizzle-zod"],
    "passport": pkg.dependencies["passport"],
    "passport-local": pkg.dependencies["passport-local"],
    "openid-client": pkg.dependencies["openid-client"],
    "node-cron": pkg.dependencies["node-cron"],
    "zod": pkg.dependencies["zod"],
    "connect-pg-simple": pkg.dependencies["connect-pg-simple"],
    "node-fetch": pkg.dependencies["node-fetch"],
    "memoizee": pkg.dependencies["memoizee"],
    "memorystore": pkg.dependencies["memorystore"],
    "@google/generative-ai": pkg.dependencies["@google/generative-ai"],
    "langchain": pkg.dependencies["langchain"],
    "openai": pkg.dependencies["openai"],
    "youtube-transcript": pkg.dependencies["youtube-transcript"],
    "ytdl-core": pkg.dependencies["ytdl-core"],
    "fluent-ffmpeg": pkg.dependencies["fluent-ffmpeg"],
    "ws": pkg.dependencies["ws"],
    "date-fns": pkg.dependencies["date-fns"],
    "zod-validation-error": pkg.dependencies["zod-validation-error"]
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Copy shared files
fs.cpSync('shared', 'dist/shared', { recursive: true });

console.log('Build complete. Ready for deployment.');