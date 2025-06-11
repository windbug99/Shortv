import fs from 'fs';
import path from 'path';

console.log('📦 Post-install: package.json 빌드 스크립트 최적화...');

try {
  // package.json 읽기
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // 빌드 스크립트를 올바른 구조로 수정
  if (packageJson.scripts && packageJson.scripts.build) {
    const originalBuild = packageJson.scripts.build;
    
    // --outdir=dist를 --outfile=dist/index.js로 변경
    const fixedBuild = originalBuild.replace(
      '--outdir=dist',
      '--outfile=dist/index.js'
    );
    
    if (fixedBuild !== originalBuild) {
      packageJson.scripts.build = fixedBuild;
      
      // 임시 백업 생성
      fs.writeFileSync('package.json.backup', JSON.stringify(packageJson, null, 2));
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      
      console.log('✅ 빌드 스크립트 수정 완료');
      console.log(`이전: ${originalBuild}`);
      console.log(`수정: ${fixedBuild}`);
    } else {
      console.log('빌드 스크립트가 이미 올바르게 설정되어 있습니다.');
    }
  }
  
} catch (error) {
  console.error('❌ Post-install 실패:', error.message);
}