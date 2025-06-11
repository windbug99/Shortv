#!/usr/bin/env node
// Complete deployment build script that fixes all identified issues
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting deployment build process...');

try {
  // Clean and create dist directory
  console.log('Cleaning build directory...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build frontend (client)
  console.log('Building frontend...');
  execSync('vite build', { stdio: 'inherit' });

  // Build backend (server) with proper aliases and bundling
  console.log('Building backend server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\"', {
    stdio: 'inherit'
  });

  // Create production package.json with deployment configuration
  console.log('Creating production package.json...');
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
      // Essential server dependencies only
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
      "@google/generative-ai": originalPackage.dependencies["@google/generative-ai"],
      "@langchain/core": originalPackage.dependencies["@langchain/core"],
      "@langchain/openai": originalPackage.dependencies["@langchain/openai"],
      "langchain": originalPackage.dependencies["langchain"],
      "openai": originalPackage.dependencies["openai"],
      "youtube-transcript": originalPackage.dependencies["youtube-transcript"],
      "ytdl-core": originalPackage.dependencies["ytdl-core"],
      "fluent-ffmpeg": originalPackage.dependencies["fluent-ffmpeg"],
      "ws": originalPackage.dependencies["ws"],
      "date-fns": originalPackage.dependencies["date-fns"],
      "zod-validation-error": originalPackage.dependencies["zod-validation-error"]
    },
    optionalDependencies: {
      "bufferutil": "^4.0.8"
    }
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(productionPackage, null, 2));

  // Copy essential directories
  console.log('Copying essential files...');
  
  // Copy shared schema and types
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  
  // Create public directory and copy client build
  fs.mkdirSync('dist/public', { recursive: true });
  if (fs.existsSync('dist/client')) {
    fs.cpSync('dist/client', 'dist/public', { recursive: true });
  }

  // Verify build output
  console.log('Verifying build output...');
  const verifyChecks = [];
  
  if (fs.existsSync('dist/index.js')) {
    const stats = fs.statSync('dist/index.js');
    console.log(`✅ dist/index.js created (${Math.round(stats.size / 1024)}KB)`);
    verifyChecks.push(true);
  } else {
    console.error('❌ dist/index.js not found');
    verifyChecks.push(false);
  }
  
  if (fs.existsSync('dist/package.json')) {
    const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
    if (pkg.scripts && pkg.scripts.start) {
      console.log(`✅ dist/package.json configured with start script: ${pkg.scripts.start}`);
      verifyChecks.push(true);
    } else {
      console.error('❌ dist/package.json missing start script');
      verifyChecks.push(false);
    }
  } else {
    console.error('❌ dist/package.json not found');
    verifyChecks.push(false);
  }
  
  if (fs.existsSync('dist/shared')) {
    console.log('✅ dist/shared directory copied');
    verifyChecks.push(true);
  } else {
    console.error('❌ dist/shared directory missing');
    verifyChecks.push(false);
  }

  if (verifyChecks.every(check => check)) {
    console.log('🎉 Deployment build completed successfully!');
    console.log('Files ready for deployment:');
    console.log('- dist/index.js (server bundle)');
    console.log('- dist/package.json (production dependencies)');
    console.log('- dist/shared/ (schema and types)');
    console.log('- dist/public/ (frontend assets)');
  } else {
    console.error('❌ Build verification failed');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}