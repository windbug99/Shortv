import { generateAISummary } from './server/aiSummarizer.js';

async function testSmartAnalyzer() {
  const videoId = 'yB68qccupGc';
  const title = '개발자라면 무조건 봐야 할 *무료* 툴 🍯 몽땅 알려드림';
  const description = '';
  
  console.log('=== Smart Video Analyzer Test ===');
  console.log(`Video: ${title}`);
  console.log(`ID: ${videoId}`);
  console.log('Testing enhanced analysis vs basic title/description summaries');
  console.log('');
  
  try {
    const startTime = Date.now();
    
    // Test both summary types
    const [introSummary, detailedSummary] = await Promise.all([
      generateAISummary(title, description, 'introduction', videoId),
      generateAISummary(title, description, 'detailed', videoId)
    ]);
    
    const endTime = Date.now();
    const processingTime = Math.round((endTime - startTime) / 1000);
    
    console.log('=== RESULTS ===');
    console.log(`Processing time: ${processingTime} seconds`);
    console.log('');
    console.log('Introduction Summary:');
    console.log(`Length: ${introSummary.length} characters`);
    console.log(introSummary);
    console.log('');
    console.log('Detailed Summary:');
    console.log(`Length: ${detailedSummary.length} characters`);
    console.log(detailedSummary);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSmartAnalyzer();