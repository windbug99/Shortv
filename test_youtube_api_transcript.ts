import { extractTranscriptWithYouTubeAPI, isYouTubeAPIAvailable } from './server/youtubeApiTranscript.js';

async function testYouTubeAPITranscript() {
  console.log('=== YouTube Data API v3 스크립트 추출 테스트 ===');
  
  // Check if API key is available
  if (!isYouTubeAPIAvailable()) {
    console.log('YouTube API 키가 설정되지 않았습니다.');
    console.log('환경변수 YOUTUBE_API_KEY를 설정해주세요.');
    return;
  }

  console.log('YouTube API 키 확인됨. 테스트 시작...');
  console.log('');

  // Test videos with different characteristics
  const testVideos = [
    {
      id: 'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up (popular video, likely has captions)
      title: 'Rick Astley - Never Gonna Give You Up (Official Video)'
    },
    {
      id: 'jNQXAC9IVRw', // Me at the zoo (first YouTube video)
      title: 'Me at the zoo'
    },
    {
      id: 'DhnVAQRI7w0', // Recent Korean video
      title: '샤오미 최초 모바일 자체칩 Xring O1 공개! 퀄컴 잡을 비밀병기 될까?'
    }
  ];

  for (const video of testVideos) {
    console.log(`\n--- 테스트: ${video.title} (${video.id}) ---`);
    
    try {
      const startTime = Date.now();
      
      const result = await extractTranscriptWithYouTubeAPI(video.id);
      
      const endTime = Date.now();
      const processingTime = Math.round((endTime - startTime) / 1000);
      
      console.log(`처리 시간: ${processingTime}초`);
      console.log(`성공 여부: ${result.success}`);
      console.log(`방법: ${result.method}`);
      
      if (result.success && result.transcript) {
        console.log(`스크립트 길이: ${result.transcript.length}자`);
        console.log('스크립트 샘플:');
        const sample = result.transcript.substring(0, 200);
        console.log(`"${sample}${result.transcript.length > 200 ? '...' : '"}"`);
      } else if (result.error) {
        console.log(`오류: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`테스트 실패: ${error}`);
    }
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testYouTubeAPITranscript();