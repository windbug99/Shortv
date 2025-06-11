import { generateAISummary } from './server/aiSummarizer.js';
import { storage } from './server/storage.js';

async function testImprovedSummary() {
  console.log('=== 개선된 요약 로직 테스트 ===\n');
  
  // Test with a video that has no transcript to verify warning message
  const videos = await storage.getVideos();
  const testVideo = videos.find(v => v.aiSummary?.includes('음성없음') || v.aiSummary?.includes('스크립트없음')) || videos[0];
  
  console.log(`테스트 영상: ${testVideo.title}`);
  console.log(`비디오 ID: ${testVideo.videoId}\n`);
  
  console.log('제목/설명 기반 요약 생성 중 (경고 메시지 포함)...');
  
  const summary = await generateAISummary(
    testVideo.title,
    testVideo.description || '',
    'introduction',
    testVideo.videoId
  );
  
  console.log('\n=== 생성된 요약 ===');
  console.log(summary);
  
  console.log('\n=== 검증 결과 ===');
  const lines = summary.split('\n');
  const firstLine = lines[0];
  
  if (firstLine.includes('본 결과는 제목과 디스크립션 만으로 요약되었으니')) {
    console.log('✓ 경고 메시지가 정확히 첫 줄에 표시됨');
  }
  
  if (firstLine.includes('스크립트없음 음성없음')) {
    console.log('✓ 상태 표시가 정확히 포함됨');
  }
  
  if (lines.length >= 2 && lines[1].length >= 88 && lines[1].length <= 98) {
    console.log('✓ 요약 내용이 지정된 길이 범위 내에 있음');
  }
  
  // Update the video with new summary
  await storage.updateVideo(testVideo.id, { aiSummary: summary });
  console.log('\n데이터베이스 업데이트 완료');
  
  console.log('\n=== 테스트 완료 ===');
}

testImprovedSummary().catch(console.error);