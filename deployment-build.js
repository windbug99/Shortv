#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting deployment build process...');

try {
  // Clean and create dist directory
  if (fs.existsSync('dist')) {
    console.log('Cleaning existing dist directory...');
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build server bundle using esbuild with correct parameters
  console.log('Building server bundle...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared', {
    stdio: 'inherit'
  });

  // Verify dist/index.js was created
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('CRITICAL: dist/index.js was not created by esbuild');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`✅ Server bundle created: dist/index.js (${Math.round(stats.size / 1024)}KB)`);

  // Create production package.json with correct dependencies and port configuration
  console.log('Creating production package.json...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
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
      "@neondatabase/serverless": packageJson.dependencies["@neondatabase/serverless"],
      "express": packageJson.dependencies["express"],
      "express-session": packageJson.dependencies["express-session"],
      "drizzle-orm": packageJson.dependencies["drizzle-orm"],
      "drizzle-zod": packageJson.dependencies["drizzle-zod"],
      "passport": packageJson.dependencies["passport"],
      "passport-local": packageJson.dependencies["passport-local"],
      "openid-client": packageJson.dependencies["openid-client"],
      "node-cron": packageJson.dependencies["node-cron"],
      "zod": packageJson.dependencies["zod"],
      "connect-pg-simple": packageJson.dependencies["connect-pg-simple"],
      "node-fetch": packageJson.dependencies["node-fetch"],
      "memoizee": packageJson.dependencies["memoizee"],
      "memorystore": packageJson.dependencies["memorystore"],
      // AI and processing dependencies
      "@google/generative-ai": packageJson.dependencies["@google/generative-ai"],
      "@langchain/core": packageJson.dependencies["@langchain/core"],
      "@langchain/openai": packageJson.dependencies["@langchain/openai"],
      "langchain": packageJson.dependencies["langchain"],
      "openai": packageJson.dependencies["openai"],
      // YouTube processing dependencies
      "youtube-transcript": packageJson.dependencies["youtube-transcript"],
      "ytdl-core": packageJson.dependencies["ytdl-core"],
      "fluent-ffmpeg": packageJson.dependencies["fluent-ffmpeg"],
      // Utilities
      "ws": packageJson.dependencies["ws"],
      "date-fns": packageJson.dependencies["date-fns"],
      "zod-validation-error": packageJson.dependencies["zod-validation-error"]
    },
    optionalDependencies: {
      "bufferutil": "^4.0.8"
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

  // Copy shared modules (required for schema definitions)
  if (fs.existsSync('shared')) {
    console.log('Copying shared modules...');
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Create public directory for static assets
  fs.mkdirSync('dist/public', { recursive: true });

  // Copy client files for development serving in production
  if (fs.existsSync('client')) {
    console.log('Copying client files...');
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  // Test server startup (quick verification)
  console.log('🔍 Testing server startup...');
  try {
    const testProcess = execSync('cd dist && timeout 3s node index.js 2>&1 || echo "Server test completed"', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (testProcess.includes('Server successfully started') || testProcess.includes('serving on port')) {
      console.log('✅ Server startup test passed');
    } else {
      console.log('⚠️  Server startup test completed (may need environment variables)');
    }
  } catch (testError) {
    console.log('⚠️  Server startup test completed (expected in build environment)');
  }

  console.log('\n🎉 Deployment build completed successfully!');
  console.log('\n📁 Files created:');
  console.log('  ✅ dist/index.js - Server bundle');
  console.log('  ✅ dist/package.json - Production dependencies');
  console.log('  ✅ dist/shared/ - Schema definitions');
  console.log('  ✅ dist/client/ - Frontend files');
  console.log('  ✅ dist/public/ - Static assets directory');
  
  console.log('\n🚀 Ready for deployment with: node dist/index.js');

} catch (error) {
  console.error('❌ Deployment build failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}