// YouTube OAuth 2.0 URL 생성 도구

const clientId = process.env.YOUTUBE_CLIENT_ID;

if (!clientId) {
  console.error('YOUTUBE_CLIENT_ID 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const scope = 'https://www.googleapis.com/auth/youtube.readonly';
const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
const responseType = 'code';
const accessType = 'offline';
const promptParam = 'consent';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(clientId)}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `scope=${encodeURIComponent(scope)}&` +
  `response_type=${responseType}&` +
  `access_type=${accessType}&` +
  `prompt=${promptParam}`;

console.log('=== YouTube OAuth 2.0 인증 URL ===\n');
console.log('다음 URL을 브라우저에서 열어주세요:\n');
console.log(authUrl);
console.log('\n=== 인증 과정 ===');
console.log('1. 위 URL을 브라우저에서 열기');
console.log('2. Google 계정으로 로그인');
console.log('3. YouTube 데이터 읽기 권한 승인');
console.log('4. 표시되는 인증 코드(authorization code) 복사');
console.log('\n인증 코드를 받은 후 다음 단계를 진행하세요.');