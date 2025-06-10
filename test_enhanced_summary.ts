import { generateAISummary } from './server/aiSummarizer.js';

async function testEnhancedSummary() {
  const videoId = 'yB68qccupGc';
  const title = '개발자라면 무조건 봐야 할 *무료* 툴 🍯 몽땅 알려드림';
  const description = '';
  
  console.log('=== Testing Enhanced Video Summarization ===');
  console.log(`Video: ${title}`);
  console.log(`Video ID: ${videoId}`);
  console.log('This video has no regular transcript, so it will test Whisper audio transcription.');
  console.log('');
  
  try {
    console.log('Generating AI summary with enhanced transcription...');
    const startTime = Date.now();
    
    const summary = await generateAISummary(title, description, 'introduction', videoId);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('');
    console.log('=== RESULTS ===');
    console.log(`Processing time: ${duration} seconds`);
    console.log(`Summary length: ${summary.length} characters`);
    console.log('');
    console.log('Generated Summary:');
    console.log(summary);
    console.log('');
    console.log('=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error during enhanced summarization test:', error);
  }
}

testEnhancedSummary();