import { extractTranscriptWithWhisper } from './server/audioTranscriptor.js';
import { generateAISummary } from './server/aiSummarizer.js';
import { storage } from './server/storage.js';

async function testDirectWhisper() {
  console.log('=== 직접 Whisper 세그먼트 테스트 ===\n');
  
  // Get a real video from the database
  const videos = await storage.getVideos();
  const testVideo = videos.find(v => v.videoId && v.title);
  
  if (!testVideo) {
    console.log('테스트할 영상을 찾을 수 없습니다.');
    return;
  }
  
  console.log(`테스트 영상: ${testVideo.title}`);
  console.log(`비디오 ID: ${testVideo.videoId}`);
  
  const overallStartTime = Date.now();
  
  try {
    // Direct Whisper transcription test
    console.log('\n=== 직접 Whisper 음성 추출 테스트 ===');
    const whisperStartTime = Date.now();
    
    const transcript = await extractTranscriptWithWhisper(testVideo.videoId);
    
    const whisperTime = Math.round((Date.now() - whisperStartTime) / 1000);
    console.log(`Whisper 처리 완료: ${whisperTime}s`);
    
    if (transcript) {
      console.log(`스크립트 추출 성공: ${transcript.length} 글자`);
      console.log(`미리보기: ${transcript.substring(0, 300)}...`);
      
      // Test AI summary with extracted transcript
      console.log('\n=== AI 요약 생성 테스트 ===');
      const summaryStartTime = Date.now();
      
      // Create a mock video summary test
      const summary = await generateAISummary(
        testVideo.title,
        testVideo.description,
        'detailed'
      );
      
      const summaryTime = Math.round((Date.now() - summaryStartTime) / 1000);
      console.log(`AI 요약 완료: ${summaryTime}s`);
      console.log(`요약 내용:\n${summary}`);
      
    } else {
      console.log('Whisper 스크립트 추출 실패');
    }
    
    const totalTime = Math.round((Date.now() - overallStartTime) / 1000);
    console.log(`\n=== 성능 분석 ===`);
    console.log(`총 처리 시간: ${totalTime}s`);
    console.log(`Whisper 처리: ${whisperTime}s`);
    
    if (transcript) {
      console.log(`처리 효율성: ${Math.round(transcript.length/whisperTime)} 글자/초`);
    }
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - overallStartTime) / 1000);
    console.error(`테스트 실패 (${totalTime}s 경과):`, error.message);
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testDirectWhisper().catch(console.error);