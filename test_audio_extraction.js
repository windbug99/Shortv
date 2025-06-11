// Test audio extraction directly
import { extractTranscriptWithWhisper } from './server/audioTranscriptor.js';

async function testAudioExtraction() {
  const videoId = 'y8JT-un-tP4'; // 5분 38초 영상
  console.log('=== 음성 추출 테스트 ===');
  console.log(`영상 ID: ${videoId}`);
  console.log('예상 소요 시간: 2-3분');
  
  try {
    const result = await extractTranscriptWithWhisper(videoId);
    
    if (result && result.length > 50) {
      console.log('✓ 음성 추출 성공');
      console.log(`텍스트 길이: ${result.length}자`);
      console.log('처음 200자:', result.substring(0, 200));
      
      // Check if it contains Korean
      const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(result);
      console.log('한국어 포함:', hasKorean ? '예' : '아니오');
      
    } else {
      console.log('✗ 음성 추출 실패 - 결과가 너무 짧거나 없음');
    }
  } catch (error) {
    console.log('✗ 음성 추출 오류:', error.message);
    console.log('오류 상세:', error);
  }
}

testAudioExtraction().catch(console.error);