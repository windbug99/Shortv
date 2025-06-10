import { generateAISummary } from './server/aiSummarizer.js';

async function testGeminiIntegration() {
  console.log('=== Gemini 비전 통합 테스트 ===');
  
  // 스크립트가 없는 영상으로 테스트
  const videoId = 'DhnVAQRI7w0'; // 샤오미 칩 관련 영상
  const title = '샤오미 최초 모바일 자체칩 Xring O1 공개! 퀄컴 잡을 비밀병기 될까?';
  const description = '샤오미가 드디어 자체 모바일 칩을 공개했습니다. 퀄컴에 도전장을 내민 것일까요?';
  
  console.log(`비디오 ID: ${videoId}`);
  console.log(`제목: ${title}`);
  console.log('');
  
  try {
    // Introduction 요약 테스트
    console.log('Introduction 요약 생성 중...');
    const introSummary = await generateAISummary(title, description, 'introduction', videoId);
    
    console.log('=== Introduction 요약 결과 ===');
    console.log(introSummary);
    console.log('');
    
    // Detailed 요약 테스트
    console.log('Detailed 요약 생성 중...');
    const detailedSummary = await generateAISummary(title, description, 'detailed', videoId);
    
    console.log('=== Detailed 요약 결과 ===');
    console.log(detailedSummary);
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testGeminiIntegration();