import { generateAISummary } from './server/aiSummarizer.js';
import { storage } from './server/storage.js';

async function testCompleteSystem() {
  console.log('=== 완전한 시스템 테스트 ===\n');
  
  try {
    // Get some videos from the database
    const videos = await storage.getVideos();
    console.log(`데이터베이스에서 ${videos.length}개의 영상을 찾았습니다.`);
    
    if (videos.length === 0) {
      console.log('테스트할 영상이 없습니다. 채널을 추가해주세요.');
      return;
    }
    
    // Test with the first few videos
    const testVideos = videos.slice(0, 3);
    
    for (const video of testVideos) {
      console.log(`\n--- 테스트: ${video.title} ---`);
      console.log(`비디오 ID: ${video.videoId}`);
      console.log(`기존 요약: ${video.aiSummary ? '있음' : '없음'}`);
      
      if (!video.aiSummary) {
        console.log('AI 요약 생성 중...');
        
        try {
          const startTime = Date.now();
          const summary = await generateAISummary(
            video.title,
            video.description || '',
            'introduction',
            video.videoId
          );
          const endTime = Date.now();
          const duration = Math.round((endTime - startTime) / 1000);
          
          console.log(`✅ 요약 생성 완료 (${duration}초)`);
          console.log(`요약 내용: ${summary.substring(0, 200)}...`);
          
          // Update the video with the generated summary
          await storage.updateVideo(video.id, { aiSummary: summary });
          console.log('데이터베이스에 요약 저장됨');
          
        } catch (error) {
          console.log(`❌ 요약 생성 실패:`, error.message);
        }
      } else {
        console.log(`기존 요약: ${video.aiSummary.substring(0, 200)}...`);
      }
    }
    
  } catch (error) {
    console.error('시스템 테스트 실패:', error);
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testCompleteSystem().catch(console.error);