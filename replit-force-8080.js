#!/usr/bin/env node
// Force port 8080 for Replit autoscale - server only build
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Creating Replit deployment with port 8080 enforcement...');

try {
  // Clean dist
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  // Build server directly without client
  console.log('Building server bundle...');
  execSync(`esbuild server/index.ts \\
    --platform=node \\
    --packages=external \\
    --bundle \\
    --format=esm \\
    --outfile=dist/index.js \\
    --alias:@shared=./shared \\
    --define:process.env.NODE_ENV=\\"production\\" \\
    --define:process.env.PORT=\\"8080\\" \\
    --target=node18 \\
    --minify`, {
    stdio: 'inherit'
  });

  // Read original package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Create production package.json that forces port 8080
  const prodPkg = {
    name: pkg.name,
    version: pkg.version,
    type: "module",
    main: "index.js",
    scripts: {
      start: "PORT=8080 NODE_ENV=production node index.js"
    },
    engines: {
      node: ">=18.0.0"
    },
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
      "memorystore": pkg.dependencies["memorystore"]
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

  // Force port 8080 in the built server code
  let serverCode = fs.readFileSync('dist/index.js', 'utf8');
  
  // Replace any port references to force 8080
  serverCode = serverCode.replace(
    /parseInt\(process\.env\.PORT\s*\|\|\s*['"]\d+['"]\)/g,
    '8080'
  );
  serverCode = serverCode.replace(
    /process\.env\.PORT\s*\|\|\s*['"]\d+['"]/, 
    '"8080"'
  );
  
  // Ensure 0.0.0.0 binding
  serverCode = serverCode.replace(/"localhost"/g, '"0.0.0.0"');
  
  fs.writeFileSync('dist/index.js', serverCode);

  // Create startup wrapper that absolutely forces port 8080
  const wrapper = `#!/usr/bin/env node
// Port 8080 enforcement wrapper for Replit autoscale
process.env.PORT = "8080";
process.env.NODE_ENV = "production";

console.log("Replit deployment: Starting on port 8080");

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start server
import('./index.js').catch(error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
`;

  fs.writeFileSync('dist/server.js', wrapper);

  // Verify build
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('Build failed: dist/index.js not created');
  }

  const stats = fs.statSync('dist/index.js');
  console.log(`Build complete: ${(stats.size / 1024).toFixed(1)}kb`);
  console.log('Port 8080 forced in all configurations');
  console.log('Ready for deployment');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}