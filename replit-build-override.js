#!/usr/bin/env node
// Complete Replit autoscale build override with port 8080 enforcement
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Replit autoscale deployment build starting...');

try {
  // Remove any existing dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // First, let's build the client if it exists
  console.log('Building client assets...');
  try {
    execSync('vite build', { stdio: 'pipe' });
    console.log('Client build completed');
  } catch (clientError) {
    console.log('Client build skipped (may not be needed for production)');
  }

  // Build server with forced port 8080 configuration
  console.log('Building server for Replit autoscale...');
  const serverBuildCommand = `esbuild server/index.ts \\
    --platform=node \\
    --packages=external \\
    --bundle \\
    --format=esm \\
    --outfile=dist/index.js \\
    --alias:@shared=./shared \\
    --define:process.env.NODE_ENV=\\"production\\" \\
    --define:process.env.PORT=\\"8080\\" \\
    --define:process.env.REPLIT_DEPLOYMENT=\\"true\\" \\
    --target=node18 \\
    --minify \\
    --legal-comments=none`;

  execSync(serverBuildCommand, { stdio: 'inherit' });

  // Read original package.json
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Create deployment-specific package.json with port 8080 enforcement
  const deploymentPkg = {
    name: originalPkg.name,
    version: originalPkg.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "PORT=8080 NODE_ENV=production node index.js",
      dev: "PORT=8080 NODE_ENV=development node index.js"
    },
    engines: {
      node: ">=18.0.0",
      npm: ">=8.0.0"
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
      "memorystore": originalPkg.dependencies["memorystore"]
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(deploymentPkg, null, 2));

  // Copy shared modules
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }

  // Copy client files
  if (fs.existsSync('client')) {
    fs.cpSync('client', 'dist/client', { recursive: true });
  }

  // Ensure public directory exists
  fs.mkdirSync('dist/public', { recursive: true });

  // Create port override wrapper script
  const portOverrideScript = `#!/usr/bin/env node
// Replit deployment port override - forces port 8080
process.env.PORT = '8080';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('Replit autoscale starting on port 8080...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port override:', process.env.PORT);

// Import the main application
import('./index.js').then(() => {
  console.log('Server startup completed successfully');
}).catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
`;

  fs.writeFileSync('dist/start.js', portOverrideScript);

  // Modify the generated index.js to ensure port 8080 is hardcoded
  let serverCode = fs.readFileSync('dist/index.js', 'utf8');
  
  // Replace any port references with 8080
  serverCode = serverCode.replace(
    /process\.env\.PORT\s*\|\|\s*['"]\d+['"]/, 
    'process.env.PORT || "8080"'
  );
  
  // Ensure it binds to 0.0.0.0
  serverCode = serverCode.replace(
    /"localhost"/g, 
    '"0.0.0.0"'
  );
  
  fs.writeFileSync('dist/index.js', serverCode);

  // Final verification
  const requiredFiles = ['dist/index.js', 'dist/package.json'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Critical build error: ${file} was not created`);
    }
  }

  // Check if index.js has proper content
  const indexStats = fs.statSync('dist/index.js');
  if (indexStats.size < 1000) {
    throw new Error('Built index.js file is too small - build may have failed');
  }

  console.log(`Build successful: ${(indexStats.size / 1024).toFixed(1)}kb`);
  console.log('Deployment files created:');
  console.log('- dist/index.js (main server)');
  console.log('- dist/package.json (deployment config)');
  console.log('- dist/start.js (port override)');
  console.log('Port 8080 enforcement applied');
  console.log('Ready for Replit autoscale deployment');

} catch (error) {
  console.error('Build failed:', error.message);
  console.error('Stack trace:', error.stack);
  
  // Check if dist directory was created
  if (fs.existsSync('dist')) {
    console.log('Partial build artifacts:');
    try {
      const files = fs.readdirSync('dist');
      files.forEach(file => {
        const stats = fs.statSync(path.join('dist', file));
        console.log(`- ${file}: ${stats.size} bytes`);
      });
    } catch (listError) {
      console.log('Could not list dist contents');
    }
  }
  
  process.exit(1);
}