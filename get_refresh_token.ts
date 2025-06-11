import fetch from 'node-fetch';

// Refresh Token 발급 도구
async function getRefreshToken(authorizationCode: string) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('YOUTUBE_CLIENT_ID 또는 YOUTUBE_CLIENT_SECRET가 설정되지 않았습니다.');
    process.exit(1);
  }

  if (!authorizationCode) {
    console.error('인증 코드를 입력해주세요.');
    console.log('사용법: npx tsx get_refresh_token.ts YOUR_AUTHORIZATION_CODE');
    process.exit(1);
  }

  console.log('Refresh Token 발급 중...\n');

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:8080',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`토큰 발급 실패: ${response.status} ${response.statusText}`);
      console.error('응답:', errorText);
      process.exit(1);
    }

    const data = await response.json() as any;
    
    console.log('=== Refresh Token 발급 성공! ===\n');
    console.log('다음 값을 YOUTUBE_REFRESH_TOKEN 환경변수로 설정하세요:\n');
    console.log(data.refresh_token);
    console.log('\n=== 추가 정보 ===');
    console.log(`Access Token: ${data.access_token.substring(0, 20)}...`);
    console.log(`Token Type: ${data.token_type}`);
    console.log(`Expires In: ${data.expires_in} seconds`);
    
    if (data.scope) {
      console.log(`Scope: ${data.scope}`);
    }

  } catch (error) {
    console.error('토큰 발급 중 오류 발생:', error);
    process.exit(1);
  }
}

// 명령줄 인수에서 인증 코드 가져오기
const authCode = process.argv[2];
getRefreshToken(authCode);