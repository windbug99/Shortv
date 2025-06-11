import fetch from 'node-fetch';

const authCode = process.argv[2];

if (!authCode) {
  console.error('인증 코드를 입력해주세요.');
  console.log('사용법: npx tsx get_token.ts YOUR_AUTHORIZATION_CODE');
  process.exit(1);
}

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('YOUTUBE_CLIENT_ID 또는 YOUTUBE_CLIENT_SECRET가 설정되지 않았습니다.');
  process.exit(1);
}

async function getRefreshToken() {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:8080',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`토큰 발급 실패: ${response.status}`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json() as any;
    
    console.log('Refresh Token 발급 성공!');
    console.log('\nYOUTUBE_REFRESH_TOKEN으로 설정할 값:');
    console.log(data.refresh_token);
    console.log('\n추가 정보:');
    console.log(`Access Token: ${data.access_token.substring(0, 20)}...`);
    console.log(`Expires In: ${data.expires_in} seconds`);

  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
}

getRefreshToken();