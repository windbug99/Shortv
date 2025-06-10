import { analyzeVideoHybrid, generateGPT4oSummary } from './server/hybridVideoAnalyzer.js';

async function testHybridAnalyzer() {
  console.log('=== Hybrid Video Analyzer 테스트 ===');
  console.log('YouTube 전사본 + GPT-4o 조합 테스트');
  console.log('');
  
  // Test with a video that likely has transcripts
  const videoId = 'DhnVAQRI7w0'; // 샤오미 칩 관련 영상
  const title = '샤오미 최초 모바일 자체칩 Xring O1 공개! 퀄컴 잡을 비밀병기 될까?';
  const description = '샤오미가 드디어 자체 모바일 칩을 공개했습니다. 퀄컴에 도전장을 내민 것일까요?';
  
  console.log(`비디오 ID: ${videoId}`);
  console.log(`제목: ${title}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    console.log('하이브리드 분석 시작...');
    const result = await analyzeVideoHybrid(videoId, title, description);
    
    const endTime = Date.now();
    const processingTime = Math.round((endTime - startTime) / 1000);
    
    console.log('');
    console.log('=== 분석 결과 ===');
    console.log(`처리 시간: ${processingTime}초`);
    console.log(`성공 여부: ${result.success}`);
    console.log(`분석 방법: ${result.method}`);
    
    if (result.transcript) {
      console.log('');
      console.log('전사본 추출 결과:');
      console.log(`전사본 길이: ${result.transcript.length}자`);
      console.log('전사본 샘플:');
      console.log(result.transcript.substring(0, 200) + (result.transcript.length > 200 ? '...' : ''));
    }
    
    if (result.summary) {
      console.log('');
      console.log('GPT-4o 요약 결과:');
      console.log(result.summary);
    }
    
    if (result.error) {
      console.log(`오류: ${result.error}`);
    }

    // Test integration functions
    console.log('');
    console.log('=== 통합 함수 테스트 ===');
    
    console.log('Introduction 요약 테스트...');
    const introSummary = await generateGPT4oSummary(title, description, 'introduction', videoId);
    console.log('Introduction 결과:');
    console.log(introSummary);
    
    console.log('');
    console.log('Detailed 요약 테스트...');
    const detailedSummary = await generateGPT4oSummary(title, description, 'detailed', videoId);
    console.log('Detailed 결과:');
    console.log(detailedSummary);
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testHybridAnalyzer();