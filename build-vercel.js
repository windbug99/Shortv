#!/usr/bin/env node
// Vercel 배포용 빌드 스크립트
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Vercel 배포용 빌드 시작...');

try {
  // 빌드 디렉토리 정리
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });
  fs.mkdirSync('dist/client', { recursive: true });

  // 프론트엔드 빌드
  console.log('프론트엔드 빌드 중...');
  execSync('vite build --outDir=dist/client', { stdio: 'inherit' });

  // Vercel API 함수용 서버 빌드
  console.log('Vercel API 함수 빌드 중...');
  execSync('esbuild api/index.ts --platform=node --bundle --format=esm --outfile=dist/api/index.js --external:@vercel/node --alias:@shared=./shared', {
    stdio: 'inherit'
  });

  // package.json을 Vercel 설정으로 업데이트
  const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const vercelPkg = {
    ...originalPkg,
    scripts: {
      ...originalPkg.scripts,
      "build": "node build-vercel.js",
      "vercel-build": "vite build --outDir=dist/client"
    },
    dependencies: {
      ...originalPkg.dependencies,
      "@vercel/node": "^3.0.0"
    }
  };

  fs.writeFileSync('package.json', JSON.stringify(vercelPkg, null, 2));

  // 필수 파일 복사
  fs.cpSync('shared', 'dist/shared', { recursive: true });

  console.log('✅ Vercel 빌드 완료');
  console.log('생성된 파일:');
  console.log('- dist/client/ (프론트엔드)');
  console.log('- dist/api/index.js (서버리스 함수)');
  console.log('- dist/shared/ (공유 스키마)');

} catch (error) {
  console.error('❌ Vercel 빌드 실패:', error.message);
  process.exit(1);
}