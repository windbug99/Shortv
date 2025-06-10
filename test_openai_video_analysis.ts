import { analyzeVideoWithOpenAI } from './server/openaiVideoAnalyzer.js';

async function testOpenAIVideoAnalysis() {
  console.log('=== OpenAI Whisper + GPT-4o 영상 분석 테스트 ===');
  
  // 테스트할 영상 - 짧은 영상으로 시작
  const videoId = 'iNHjU3M-YoA'; // 화웨이 AI 서버 관련 짧은 영상 (59초)
  const title = '화웨이... NVIDIA보다 빠른 AI 서버 가졌다는 분석 나와';
  const description = '화웨이가 NVIDIA보다 빠른 AI 서버를 개발했다는 분석이 나왔습니다.';
  
  console.log(`비디오 ID: ${videoId}`);
  console.log(`제목: ${title}`);
  console.log('');
  
  try {
    const startTime = Date.now();
    
    console.log('오디오 추출 및 Whisper 전사 시작...');
    const result = await analyzeVideoWithOpenAI(videoId, title, description);
    
    const endTime = Date.now();
    const processingTime = Math.round((endTime - startTime) / 1000);
    
    console.log('');
    console.log('=== 분석 결과 ===');
    console.log(`처리 시간: ${processingTime}초`);
    console.log(`성공 여부: ${result.success}`);
    console.log(`분석 방법: ${result.method}`);
    
    if (result.transcript) {
      console.log('');
      console.log('Whisper 전사 결과:');
      console.log(`전사본 길이: ${result.transcript.length}자`);
      console.log('전사본 내용:');
      console.log(result.transcript.substring(0, 500) + (result.transcript.length > 500 ? '...' : ''));
    }
    
    if (result.summary) {
      console.log('');
      console.log('GPT-4o 요약 결과:');
      console.log(result.summary);
    }
    
    if (result.error) {
      console.log(`오류: ${result.error}`);
    }
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testOpenAIVideoAnalysis();