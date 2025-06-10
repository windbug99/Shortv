import { extractVideoTranscript } from './server/transcriptExtractor.js';

async function main() {
  const videoId = 'yB68qccupGc';
  console.log(`Extracting transcript for video: ${videoId}`);
  
  try {
    const transcript = await extractVideoTranscript(videoId);
    if (transcript) {
      console.log('\n=== TRANSCRIPT ===');
      console.log(transcript);
      console.log('\n=== END TRANSCRIPT ===');
    } else {
      console.log('No transcript available for this video.');
    }
  } catch (error) {
    console.error('Error extracting transcript:', error);
  }
}

main();