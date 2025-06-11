// YouTube OAuth 2.0 Refresh Token 발급 도우미

const clientId = process.env.YOUTUBE_CLIENT_ID;

if (!clientId) {
  console.error('YOUTUBE_CLIENT_ID 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(clientId)}&` +
  `redirect_uri=${encodeURIComponent('http://localhost:8080')}&` +
  `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')}&` +
  `response_type=code&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log('YouTube OAuth 2.0 인증 URL:');
console.log(authUrl);
console.log('\n단계:');
console.log('1. 위 URL을 브라우저에서 열기');
console.log('2. Google 계정 로그인 및 권한 승인');
console.log('3. 리디렉션된 URL에서 code= 뒤의 값 복사');
console.log('4. 다음 명령어 실행: npx tsx get_token.ts YOUR_CODE');

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
    `);
    console.log(`\n인증 코드: ${code}`);
    console.log(`\n다음 명령어를 실행하세요:`);
    console.log(`npx tsx get_token.ts ${code}`);
  } else {
    res.send('<h1>인증 코드를 기다리는 중...</h1>');
  }
});

app.listen(PORT, () => {
  console.log(`\n콜백 서버가 http://localhost:${PORT}에서 실행 중입니다.`);
});