# Vercel 배포 완전 가이드

## 1. GitHub Repository 준비

### 필수 파일들 (모두 생성 완료)
```
프로젝트 루트/
├── vercel.json           # ✅ Vercel 설정 파일
├── package.json          # ✅ 의존성 및 빌드 스크립트
├── api/index.ts          # ✅ Vercel 서버리스 함수
├── server/               # 백엔드 코드
├── client/               # 프론트엔드 코드
├── shared/               # 공유 스키마
└── .env.example          # ✅ 환경변수 예시
```

### GitHub Repository 생성 단계
1. GitHub에서 새 Repository 생성
2. 로컬에서 Git 초기화:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repository-name.git
git push -u origin main
```

## 2. Vercel 프로젝트 설정

### Import 시 설정값
- **Framework Preset**: Other
- **Root Directory**: `/` (프로젝트 루트)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Build 설정
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

## 3. 환경변수 설정 (필수)

Vercel Dashboard > Project Settings > Environment Variables에서 설정:

### 데이터베이스
```
DATABASE_URL=postgresql://username:password@host/database
```

### AI 서비스 (필요한 것만)
```
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

### YouTube API (선택사항)
```
YOUTUBE_API_KEY=...
```

### 세션 관리
```
SESSION_SECRET=your-secure-random-string
```

## 4. Vercel 전용 빌드 스크립트

현재 프로젝트의 `package.json`을 다음과 같이 수정:

```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --bundle --format=esm --outfile=api/index.js --external:@neondatabase/serverless --alias:@shared=./shared",
    "dev": "npm run dev:original",
    "dev:original": "NODE_ENV=development tsx server/index.ts"
  }
}
```

## 5. 서버 코드 수정 사항

### API 라우트 구조
Vercel에서는 `api/` 폴더의 파일들이 자동으로 API 엔드포인트가 됩니다.

### 포트 설정 제거
Vercel은 서버리스이므로 포트 바인딩 코드 제거:
```javascript
// 제거해야 할 코드
server.listen(port, host, () => {
  // ...
});
```

## 6. 배포 단계

### 1단계: GitHub Repository 생성
1. GitHub에서 새 Repository 생성
2. 프로젝트 코드 푸시

### 2단계: Vercel 연결
1. vercel.com 접속
2. "New Project" 클릭
3. GitHub repository import
4. 위의 설정값들 입력

### 3단계: 환경변수 설정
- Project Settings에서 모든 필요한 환경변수 추가

### 4단계: 배포 실행
- 첫 배포는 자동으로 시작됨
- 이후 GitHub push시 자동 재배포

## 7. 배포 후 확인사항

### 체크리스트
- [ ] 프론트엔드 페이지 로딩 확인
- [ ] API 엔드포인트 응답 확인
- [ ] 데이터베이스 연결 확인
- [ ] 환경변수 적용 확인

### 문제 해결
- Vercel Dashboard > Functions 탭에서 서버 로그 확인
- Build 실패시 Build 탭에서 오류 로그 확인

## 8. 도메인 설정 (선택사항)

### 커스텀 도메인
- Vercel Dashboard > Domains에서 설정
- DNS 설정 필요

### 자동 HTTPS
- Vercel이 자동으로 SSL 인증서 제공

## 필요한 즉시 작업

1. `vercel.json` 파일이 이미 생성됨
2. 환경변수 목록 준비
3. GitHub repository 생성 후 코드 푸시
4. Vercel에서 import 진행