import { generateAISummary } from './server/aiSummarizer.js';
import { storage } from './server/storage.js';

async function testCombinedStatus() {
  console.log('=== 스크립트없음 음성없음 표시 테스트 ===\n');
  
  // Get a real video from database
  const videos = await storage.getVideos();
  const testVideo = videos[videos.length - 1]; // Get latest video
  
  console.log(`테스트 영상: ${testVideo.title}`);
  console.log(`비디오 ID: ${testVideo.videoId}\n`);
  
  console.log('새로운 결합 상태 표시로 요약 생성 중...');
  
  const summary = await generateAISummary(
    testVideo.title,
    testVideo.description || '',
    'introduction',
    testVideo.videoId
  );
  
  console.log('\n=== 생성된 요약 ===');
  console.log(summary);
  
  console.log('\n=== 상태 분석 ===');
  const firstLine = summary.split('\n')[0];
  
  if (firstLine.includes('스크립트없음 음성없음')) {
    console.log('✓ 스크립트와 음성이 모두 없는 상태를 정확히 표시');
  } else if (firstLine.includes('스크립트있음')) {
    console.log('✓ YouTube 자막을 성공적으로 추출하여 사용');
  } else if (firstLine.includes('음성있음')) {
    console.log('✓ Whisper를 통한 음성 전사를 성공적으로 사용');
  } else if (firstLine.includes('스크립트없음')) {
    console.log('⚠ 단순 스크립트없음 표시 (음성 상태 미확인)');
  } else {
    console.log('⚠ 상태 표시 형식을 확인할 수 없음');
    console.log(`첫 줄: "${firstLine}"`);
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testCombinedStatus().catch(console.error);