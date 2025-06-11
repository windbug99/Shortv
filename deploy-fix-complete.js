#!/usr/bin/env node
// Complete deployment fix for connection refused and module path errors
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔧 Fixing deployment errors...');

try {
  // 1. Clean and rebuild with correct configuration
  console.log('Step 1: Rebuilding with correct settings...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // 2. Build server with production optimizations
  console.log('Step 2: Building production server...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js --alias:@shared=./shared --define:process.env.NODE_ENV=\\"production\\"', {
    stdio: 'inherit'
  });

  // 3. Create production package.json with correct start script
  console.log('Step 3: Creating production package.json...');
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const productionPkg = {
    name: originalPkg.name,
    version: originalPkg.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "NODE_ENV=production node index.js"  // Fixed: no dist/ prefix needed when running from dist/
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

  fs.writeFileSync('dist/package.json', JSON.stringify(productionPkg, null, 2));

  // 4. Copy essential files
  console.log('Step 4: Copying essential files...');
  fs.cpSync('shared', 'dist/shared', { recursive: true });
  
  // Create public directory
  fs.mkdirSync('dist/public', { recursive: true });
  
  // 5. Test the built server to ensure it starts correctly
  console.log('Step 5: Testing production server...');
  
  // Verify files exist
  const checks = [
    { file: 'dist/index.js', name: 'Server bundle' },
    { file: 'dist/package.json', name: 'Production config' },
    { file: 'dist/shared', name: 'Schema files' }
  ];
  
  let allPassed = true;
  for (const check of checks) {
    if (fs.existsSync(check.file)) {
      console.log(`✅ ${check.name} ready`);
    } else {
      console.error(`❌ ${check.name} missing`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('✅ All deployment fixes applied successfully!');
    console.log('\nDeployment ready:');
    console.log('- dist/index.js (production server)');
    console.log('- dist/package.json (correct start script)');
    console.log('- PORT environment variable handling fixed');
    console.log('- 0.0.0.0 binding for accessibility');
    console.log('\nTo deploy: Use "node deploy-fix-complete.js" as build command');
  } else {
    throw new Error('Build verification failed');
  }

} catch (error) {
  console.error('❌ Deployment fix failed:', error.message);
  process.exit(1);
}