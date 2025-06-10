import { transcribeVideoAudio } from './server/audioTranscriber.js';
import { generateAISummary } from './server/aiSummarizer.js';

async function testAudioTranscription() {
  const videoId = 'yB68qccupGc';
  const title = '개발자라면 무조건 봐야 할 *무료* 툴 🍯 몽땅 알려드림';
  const description = '';
  
  console.log('Testing enhanced video summarization...');
  console.log(`Video: ${title}`);
  console.log(`Video ID: ${videoId}`);
  
  try {
    // Test the enhanced AI summary generation
    console.log('\n=== Testing Enhanced AI Summary ===');
    const summary = await generateAISummary(title, description, 'introduction', videoId);
    console.log('Summary:', summary);
    
    console.log('\n=== Testing Detailed Summary ===');
    const detailedSummary = await generateAISummary(title, description, 'detailed', videoId);
    console.log('Detailed Summary:', detailedSummary);
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

testAudioTranscription();