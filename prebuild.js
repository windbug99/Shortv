import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔧 Pre-build: 배포용 올바른 파일 구조 생성 중...');

try {
  // 기존 dist 정리
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });
  
  // 서버만 빌드 (배포용 최적화)
  console.log('서버 빌드 중...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js', { 
    stdio: 'inherit' 
  });
  
  // 파일 존재 확인
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('dist/index.js 파일 생성 실패');
  }
  
  const stats = fs.statSync('dist/index.js');
  console.log(`✅ 배포용 파일 생성 완료: ${(stats.size / 1024).toFixed(2)}KB`);
  
} catch (error) {
  console.error('❌ Pre-build 실패:', error.message);
  process.exit(1);
}