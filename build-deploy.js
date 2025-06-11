#!/usr/bin/env node
// Optimized deployment build script - replaces problematic npm run build
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Starting optimized deployment build...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build server without vite (avoids timeout issues)
console.log('Building server with esbuild...');
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared', {
  stdio: 'inherit'
});

// Verify critical file exists
if (!fs.existsSync('dist/index.js')) {
  console.error('ERROR: dist/index.js not created');
  process.exit(1);
}

// Create minimal production package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  type: "module",
  scripts: { start: "node index.js" },
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
    "youtube-transcript": pkg.dependencies["youtube-transcript"],
    "ytdl-core": pkg.dependencies["ytdl-core"],
    "fluent-ffmpeg": pkg.dependencies["fluent-ffmpeg"],
    "ws": pkg.dependencies["ws"]
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Copy essential files
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}
if (fs.existsSync('client')) {
  fs.cpSync('client', 'dist/client', { recursive: true }); 
}
fs.mkdirSync('dist/public', { recursive: true });

console.log('✅ Build complete - dist/index.js ready for deployment');