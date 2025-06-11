import { extractTranscriptWithWhisper } from './server/whisperTranscriptor.js';

async function testWhisperTranscription() {
  console.log('=== Whisper 트랜스크립션 테스트 ===\n');
  
  // 짧은 테스트 비디오들
  const testVideos = [
    { id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up' },
    { id: 'jNQXAC9IVRw', title: 'Me at the zoo (first YouTube video)' },
  ];
  
  for (const video of testVideos) {
    console.log(`--- 테스트: ${video.title} (${video.id}) ---`);
    
    try {
      const startTime = Date.now();
      const transcript = await extractTranscriptWithWhisper(video.id);
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      if (transcript) {
        console.log(`✅ 성공: ${transcript.length} 글자`);
        console.log(`처리 시간: ${duration}초`);
        console.log(`내용 미리보기: ${transcript.substring(0, 200)}...`);
      } else {
        console.log(`❌ 실패: 트랜스크립트를 추출할 수 없음`);
      }
      
    } catch (error) {
      console.log(`❌ 오류:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('=== 테스트 완료 ===');
}

testWhisperTranscription().catch(console.error);