import { generateAISummary } from './server/aiSummarizer.js';

async function testIntegratedSystem() {
  console.log('=== 통합 AI 요약 시스템 테스트 ===');
  console.log('GPT-4o (우선) + Gemini (백업) 시스템');
  console.log('');
  
  const videoId = 'DhnVAQRI7w0'; // 샤오미 칩 관련 영상
  const title = '샤오미 최초 모바일 자체칩 Xring O1 공개! 퀄컴 잡을 비밀병기 될까?';
  const description = '샤오미가 드디어 자체 모바일 칩을 공개했습니다. 퀄컴에 도전장을 내민 것일까요?';
  
  console.log(`비디오 ID: ${videoId}`);
  console.log(`제목: ${title}`);
  console.log('');
  
  try {
    // Test Introduction Summary
    console.log('1. Introduction 요약 테스트...');
    const startTime1 = Date.now();
    
    const introSummary = await generateAISummary(title, description, 'introduction', videoId);
    
    const endTime1 = Date.now();
    console.log(`처리 시간: ${Math.round((endTime1 - startTime1) / 1000)}초`);
    console.log('Introduction 결과:');
    console.log(introSummary);
    
    console.log('');
    console.log('2. Detailed 요약 테스트...');
    const startTime2 = Date.now();
    
    const detailedSummary = await generateAISummary(title, description, 'detailed', videoId);
    
    const endTime2 = Date.now();
    console.log(`처리 시간: ${Math.round((endTime2 - startTime2) / 1000)}초`);
    console.log('Detailed 결과:');
    console.log(detailedSummary);
    
    console.log('');
    console.log('=== 테스트 완료 ===');
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testIntegratedSystem();