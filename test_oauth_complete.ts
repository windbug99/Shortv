import { youtubeOAuth } from './server/youtubeOAuth.js';
import { extractTranscriptWithYouTubeAPI } from './server/youtubeApiTranscript.js';

async function testCompleteOAuth() {
  console.log('=== YouTube OAuth 2.0 완전한 테스트 ===\n');
  
  // Check OAuth configuration
  if (!youtubeOAuth.isConfigured()) {
    console.error('❌ OAuth 설정이 완료되지 않았습니다.');
    console.log('필요한 환경변수:');
    console.log('- YOUTUBE_CLIENT_ID');
    console.log('- YOUTUBE_CLIENT_SECRET'); 
    console.log('- YOUTUBE_REFRESH_TOKEN');
    return;
  }
  
  console.log('✅ OAuth 설정 확인됨');
  
  // Test token refresh
  try {
    console.log('🔄 Access Token 발급 테스트...');
    const accessToken = await youtubeOAuth.getAccessToken();
    console.log(`✅ Access Token 발급 성공: ${accessToken.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Access Token 발급 실패:', error instanceof Error ? error.message : String(error));
    return;
  }
  
  // Test transcript extraction
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
  console.log(`\n📝 스크립트 추출 테스트: ${testVideoId}`);
  
  try {
    const transcript = await extractTranscriptWithYouTubeAPI(testVideoId);
    if (transcript) {
      console.log(`✅ 스크립트 추출 성공: ${transcript.length} 문자`);
      console.log(`미리보기: ${transcript.substring(0, 100)}...`);
    } else {
      console.log('⚠️  스크립트가 비어있습니다.');
    }
  } catch (error) {
    console.error('❌ 스크립트 추출 실패:', error instanceof Error ? error.message : String(error));
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testCompleteOAuth().catch(console.error);