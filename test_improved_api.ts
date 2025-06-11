import { extractTranscriptWithYouTubeAPI } from './server/youtubeApiTranscript.js';
import { youtubeOAuth } from './server/youtubeOAuth.js';

const testVideos = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up (Official Video)' },
  { id: 'jNQXAC9IVRw', title: 'Me at the zoo' },
  { id: 'DhnVAQRI7w0', title: '샤오미 최초 모바일 자체칩 Xring O1 공개! 퀄컴 잡을 비밀병기 될까?' },
  { id: 'M7lc1UVf-VE', title: 'YouTube Creators for Change | I Am Here' }
];

async function testImprovedAPI() {
  console.log('=== 개선된 YouTube Data API v3 스크립트 추출 테스트 ===\n');
  
  // Check OAuth configuration
  if (!youtubeOAuth.isConfigured()) {
    console.error('❌ OAuth 설정이 완료되지 않았습니다.');
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
  
  for (const video of testVideos) {
    console.log(`\n--- 테스트: ${video.title} (${video.id}) ---`);
    
    const startTime = Date.now();
    try {
      const transcript = await extractTranscriptWithYouTubeAPI(video.id);
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      console.log(`처리 시간: ${duration}초`);
      console.log(`성공 여부: ${!!transcript}`);
      
      if (transcript) {
        console.log(`스크립트 길이: ${transcript.length} 문자`);
        console.log(`방법: YouTube Data API v3`);
        console.log(`스크립트 미리보기: ${transcript.substring(0, 200)}...`);
      } else {
        console.log('방법: 스크립트 없음');
        console.log('오류: 스크립트를 추출할 수 없습니다.');
      }
      
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`처리 시간: ${duration}초`);
      console.log(`성공 여부: false`);
      console.log(`방법: error`);
      console.log(`오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testImprovedAPI().catch(console.error);