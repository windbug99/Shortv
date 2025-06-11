import { extractTranscriptWithWhisper } from './server/audioTranscriptor.js';
import { storage } from './server/storage.js';

async function testAudioExtraction() {
  console.log('=== yt-dlp 최신 버전 오디오 추출 테스트 ===\n');
  
  // Get a recent video for testing
  const videos = await storage.getVideos();
  const testVideo = videos.find(v => v.videoId && v.duration && !v.duration.includes('PT30S') && !v.duration.includes('PT1M'));
  
  if (!testVideo) {
    console.log('적합한 테스트 영상을 찾을 수 없습니다.');
    return;
  }
  
  console.log(`테스트 영상: ${testVideo.title}`);
  console.log(`비디오 ID: ${testVideo.videoId}`);
  console.log(`재생 시간: ${testVideo.duration}\n`);
  
  console.log('최신 yt-dlp로 오디오 추출 시도 중...');
  
  try {
    const transcript = await extractTranscriptWithWhisper(testVideo.videoId);
    
    if (transcript && transcript.length > 50) {
      console.log('\n✓ 오디오 추출 및 전사 성공!');
      console.log(`전사 텍스트 길이: ${transcript.length}자`);
      console.log('\n=== 전사 내용 일부 ===');
      console.log(transcript.substring(0, 200) + '...');
      
      // Update the video with the new transcript
      const { generateAISummary } = await import('./server/aiSummarizer.js');
      console.log('\n새로운 음성 기반 요약 생성 중...');
      
      const summary = await generateAISummary(
        testVideo.title,
        testVideo.description || '',
        'introduction',
        testVideo.videoId
      );
      
      console.log('\n=== 생성된 요약 ===');
      console.log(summary);
      
      if (summary.includes('음성있음')) {
        console.log('\n✓ "음성있음" 상태로 요약 생성 성공');
      }
      
      await storage.updateVideo(testVideo.id, { aiSummary: summary });
      console.log('데이터베이스 업데이트 완료');
      
    } else {
      console.log('\n⚠ 오디오 추출은 시도했지만 유효한 전사 결과를 얻지 못했습니다.');
      console.log('YouTube 접근 제한이 여전히 존재할 수 있습니다.');
    }
    
  } catch (error) {
    console.log('\n❌ 오디오 추출 실패:');
    console.log(error.message);
    
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log('\nYouTube 접근 제한으로 인한 실패입니다.');
    } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      console.log('\nAPI 요청 한도 초과로 인한 실패입니다.');
    }
  }
  
  console.log('\n=== 테스트 완료 ===');
}

testAudioExtraction().catch(console.error);