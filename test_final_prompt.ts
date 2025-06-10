import { generateAISummary } from './server/aiSummarizer.js';

async function testFinalPrompt() {
  const videoId = '4DI3Ef1TN_c';
  const title = '개발자 필수 무료 도구 모음';
  const description = '코딩에 도움되는 무료 툴들을 소개합니다';
  
  console.log('=== 최종 프롬프트 테스트 ===');
  console.log('');
  
  try {
    console.log('소개 요약:');
    const introSummary = await generateAISummary(title, description, 'introduction', videoId);
    console.log(introSummary);
    console.log('');
    
    console.log('상세 요약:');
    const detailedSummary = await generateAISummary(title, description, 'detailed', videoId);
    console.log(detailedSummary);
    console.log('');
    
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testFinalPrompt();