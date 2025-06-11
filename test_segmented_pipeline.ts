import { extractVideoTranscript } from './server/transcriptExtractor.js';
import { generateAISummary } from './server/aiSummarizer.js';
import { storage } from './server/storage.js';

async function testSegmentedPipeline() {
  console.log('=== 세그먼트 기반 음성 추출 파이프라인 테스트 ===\n');
  
  // Get a video from database that doesn't have transcript yet
  const videos = await storage.getVideos();
  const testVideo = videos.find(v => !v.aiSummary || v.aiSummary.includes('스크립트 없음'));
  
  if (!testVideo) {
    console.log('테스트할 영상을 찾을 수 없습니다. 모든 영상이 이미 처리되었습니다.');
    return;
  }
  
  console.log(`테스트 영상: ${testVideo.title}`);
  console.log(`비디오 ID: ${testVideo.videoId}`);
  console.log(`기존 요약 상태: ${testVideo.aiSummary ? '있음' : '없음'}`);
  
  const overallStartTime = Date.now();
  
  try {
    // Phase 1: Transcript Extraction (includes segmented audio processing)
    console.log('\n=== Phase 1: 스크립트 추출 ===');
    const transcriptStartTime = Date.now();
    
    const transcript = await extractVideoTranscript(testVideo.videoId);
    
    const transcriptTime = Math.round((Date.now() - transcriptStartTime) / 1000);
    console.log(`Phase 1 완료: ${transcriptTime}s`);
    
    if (transcript) {
      console.log(`스크립트 추출 성공: ${transcript.length} 글자`);
      console.log(`미리보기: ${transcript.substring(0, 200)}...`);
    } else {
      console.log('스크립트 추출 실패: 모든 방법 시도했지만 추출 불가');
    }
    
    // Phase 2: AI Summary Generation
    console.log('\n=== Phase 2: AI 요약 생성 ===');
    const summaryStartTime = Date.now();
    
    const summary = await generateAISummary(
      testVideo.title,
      testVideo.description || '',
      'detailed',
      testVideo.videoId
    );
    
    const summaryTime = Math.round((Date.now() - summaryStartTime) / 1000);
    console.log(`Phase 2 완료: ${summaryTime}s`);
    console.log(`요약 생성: ${summary ? '성공' : '실패'}`);
    
    if (summary) {
      console.log('\n=== 생성된 요약 ===');
      console.log(summary);
      
      // Phase 3: Database Update
      console.log('\n=== Phase 3: 데이터베이스 업데이트 ===');
      const updateStartTime = Date.now();
      
      await storage.updateVideo(testVideo.id, { aiSummary: summary });
      
      const updateTime = Math.round((Date.now() - updateStartTime) / 1000);
      console.log(`Phase 3 완료: ${updateTime}s`);
    }
    
    // Final Statistics
    const totalTime = Math.round((Date.now() - overallStartTime) / 1000);
    console.log('\n=== 전체 성능 분석 ===');
    console.log(`총 처리 시간: ${totalTime}s`);
    console.log(`- 스크립트 추출: ${transcriptTime}s (${Math.round(transcriptTime/totalTime*100)}%)`);
    console.log(`- AI 요약 생성: ${summaryTime}s (${Math.round(summaryTime/totalTime*100)}%)`);
    
    if (transcript) {
      console.log(`스크립트 품질: ${transcript.length} 글자 추출됨`);
      console.log(`처리 효율성: ${Math.round(transcript.length/totalTime)} 글자/초`);
    }
    
  } catch (error) {
    const totalTime = Math.round((Date.now() - overallStartTime) / 1000);
    console.error(`\n테스트 실패 (${totalTime}s 경과):`, error.message);
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testSegmentedPipeline().catch(console.error);