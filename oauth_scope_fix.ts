// YouTube OAuth 2.0 with correct scope for caption download

const clientId = process.env.YOUTUBE_CLIENT_ID;

if (!clientId) {
  console.error('YOUTUBE_CLIENT_ID 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Updated scope to include caption download permissions
const scope = 'https://www.googleapis.com/auth/youtube.force-ssl';
const redirectUri = 'http://localhost:8080';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(clientId)}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `scope=${encodeURIComponent(scope)}&` +
  `response_type=code&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log('=== YouTube OAuth 2.0 (Caption Download 권한 포함) ===\n');
console.log('다음 URL을 브라우저에서 열어주세요:\n');
console.log(authUrl);
console.log('\n=== 중요 변경사항 ===');
console.log('스코프가 youtube.force-ssl로 변경되었습니다.');
console.log('이 스코프는 caption 다운로드 권한을 포함합니다.');
console.log('\n=== 인증 과정 ===');
console.log('1. 위 URL을 브라우저에서 열기');
console.log('2. Google 계정으로 로그인');
console.log('3. YouTube 전체 액세스 권한 승인');
console.log('4. 리디렉션된 URL에서 code= 뒤의 값 복사');
console.log('5. npx tsx get_token.ts YOUR_CODE 실행');

import express from 'express';

const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
  const code = req.query.code as string;
  
  if (code) {
    res.send(`
      <h1>인증 성공!</h1>
      <p>인증 코드: <strong>${code}</strong></p>
      <p>이 코드를 복사하여 사용하세요.</p>
      <p>스코프: youtube.force-ssl (전체 권한)</p>
    `);
    console.log(`\n인증 코드: ${code}`);
    console.log(`\n다음 명령어를 실행하세요:`);
    console.log(`npx tsx get_token.ts ${code}`);
  } else {
    res.send('<h1>인증 코드를 기다리는 중...</h1>');
  }
});

app.listen(PORT, () => {
  console.log(`\nOAuth 콜백 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});