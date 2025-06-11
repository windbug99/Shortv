import fs from 'fs';
import path from 'path';

// Copy package.json to dist for production dependencies
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create a production package.json with only runtime dependencies
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type,
  dependencies: packageJson.dependencies,
  optionalDependencies: packageJson.optionalDependencies
};

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Write production package.json
fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

console.log('✅ Copied package.json to dist directory');