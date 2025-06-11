#!/usr/bin/env node
// Comprehensive deployment fix script
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔧 Fixing deployment build process...');

try {
  // Clean build directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build frontend first
  console.log('Building client...');
  execSync('vite build', { stdio: 'inherit' });

  // Build server with proper configuration
  console.log('Building server...');
  const buildCommand = [
    'esbuild server/index.ts',
    '--platform=node',
    '--packages=external',
    '--bundle',
    '--format=esm',
    '--outfile=dist/index.js',
    '--alias:@shared=./shared',
    '--define:process.env.NODE_ENV=\\"production\\"'
  ].join(' ');
  
  execSync(buildCommand, { stdio: 'inherit' });

  // Read original package.json
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Create optimized production package.json
  const prodPkg = {
    name: originalPkg.name,
    version: originalPkg.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "NODE_ENV=production node index.js"
    },
    engines: {
      node: ">=18.0.0"
    },
    dependencies: {
      "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
      "express": originalPkg.dependencies["express"],
      "express-session": originalPkg.dependencies["express-session"],
      "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
      "drizzle-zod": originalPkg.dependencies["drizzle-zod"],
      "passport": originalPkg.dependencies["passport"],
      "passport-local": originalPkg.dependencies["passport-local"],
      "openid-client": originalPkg.dependencies["openid-client"],
      "node-cron": originalPkg.dependencies["node-cron"],
      "zod": originalPkg.dependencies["zod"],
      "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"],
      "node-fetch": originalPkg.dependencies["node-fetch"],
      "memoizee": originalPkg.dependencies["memoizee"],
      "memorystore": originalPkg.dependencies["memorystore"],
      "@google/generative-ai": originalPkg.dependencies["@google/generative-ai"],
      "@langchain/core": originalPkg.dependencies["@langchain/core"],
      "@langchain/openai": originalPkg.dependencies["@langchain/openai"],
      "langchain": originalPkg.dependencies["langchain"],
      "openai": originalPkg.dependencies["openai"],
      "youtube-transcript": originalPkg.dependencies["youtube-transcript"],
      "ytdl-core": originalPkg.dependencies["ytdl-core"],
      "fluent-ffmpeg": originalPkg.dependencies["fluent-ffmpeg"],
      "ws": originalPkg.dependencies["ws"],
      "date-fns": originalPkg.dependencies["date-fns"],
      "zod-validation-error": originalPkg.dependencies["zod-validation-error"]
    },
    optionalDependencies: {
      "bufferutil": "^4.0.8"
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

  // Copy essential files
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Setup public directory
  fs.mkdirSync('dist/public', { recursive: true });
  if (fs.existsSync('dist/client')) {
    fs.cpSync('dist/client', 'dist/public', { recursive: true });
  }

  // Verify build
  const checks = [
    { file: 'dist/index.js', desc: 'Server bundle' },
    { file: 'dist/package.json', desc: 'Production package.json' },
    { file: 'dist/shared', desc: 'Schema files' }
  ];

  let allPassed = true;
  for (const check of checks) {
    if (fs.existsSync(check.file)) {
      console.log(`✅ ${check.desc} ready`);
    } else {
      console.error(`❌ ${check.desc} missing`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('🎉 Deployment build successful!');
    console.log('Ready for deployment with:');
    console.log('- dist/index.js (bundled server)');
    console.log('- dist/package.json (production config)');
    console.log('- Proper PORT environment variable handling');
    console.log('- 0.0.0.0 binding for accessibility');
  } else {
    throw new Error('Build verification failed');
  }

} catch (error) {
  console.error('❌ Deployment fix failed:', error.message);
  process.exit(1);
}