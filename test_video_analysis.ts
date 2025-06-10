import { analyzeVideoWithGemini } from './server/videoAnalyzer.js';

async function testVideoAnalysis() {
  const videoId = '4DI3Ef1TN_c';
  const title = '개발자 필수 무료 도구 모음';
  const description = '코딩에 도움되는 무료 툴들을 소개합니다';
  
  console.log('=== Gemini 영상 분석 테스트 ===');
  console.log(`비디오 ID: ${videoId}`);
  console.log(`제목: ${title}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    console.log('영상 프레임 추출 및 분석 중...');
    const result = await analyzeVideoWithGemini(videoId, title, description);
    
    const endTime = Date.now();
    const processingTime = Math.round((endTime - startTime) / 1000);
    
    console.log('');
    console.log('=== 분석 결과 ===');
    console.log(`처리 시간: ${processingTime}초`);
    console.log(`성공 여부: ${result.success}`);
    console.log(`분석 방법: ${result.method}`);
    
    if (result.summary) {
      console.log('');
      console.log('영상 분석 요약:');
      console.log(result.summary);
    }
    
    if (result.error) {
      console.log(`오류: ${result.error}`);
    }
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testVideoAnalysis();