# YouTube Data API v3 OAuth 2.0 설정 가이드

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성 및 API 활성화
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" > "Library" 이동
4. "YouTube Data API v3" 검색 후 활성화

### 1.2 OAuth 2.0 클라이언트 생성
1. "APIs & Services" > "Credentials" 이동
2. "+ CREATE CREDENTIALS" > "OAuth client ID" 선택
3. Application type: "Desktop application" 선택
4. Name: "YouTube Transcript Extractor" (또는 원하는 이름)
5. "CREATE" 클릭
6. Client ID와 Client Secret 복사 및 저장

## 2. OAuth 2.0 인증 코드 발급

### 2.1 인증 URL 생성
다음 URL을 브라우저에서 열어주세요:

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=https://www.googleapis.com/auth/youtube.readonly&response_type=code&access_type=offline&prompt=consent
```

**중요**: `YOUR_CLIENT_ID`를 실제 Client ID로 교체하세요.

### 2.2 인증 과정
1. Google 계정으로 로그인
2. YouTube 데이터 읽기 권한 승인
3. 표시되는 인증 코드(authorization code) 복사

## 3. Refresh Token 발급

인증 코드를 받은 후, 다음 curl 명령어로 Refresh Token을 발급받습니다:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

응답에서 `refresh_token` 값을 복사하여 환경변수로 설정하세요.

## 4. 환경변수 설정

다음 값들을 Replit Secrets에 설정:
- `YOUTUBE_CLIENT_ID`: OAuth 클라이언트 ID
- `YOUTUBE_CLIENT_SECRET`: OAuth 클라이언트 시크릿  
- `YOUTUBE_REFRESH_TOKEN`: 발급받은 Refresh Token

## 주의사항
- Refresh Token은 한 번만 발급되므로 안전하게 보관
- `access_type=offline`과 `prompt=consent` 파라미터 필수
- 토큰이 만료되면 위 과정을 다시 진행해야 함