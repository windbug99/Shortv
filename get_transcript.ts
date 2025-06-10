import { YoutubeTranscript } from 'youtube-transcript';

async function getTranscript() {
  const videoId = 'yB68qccupGc';
  console.log(`Extracting transcript for video: ${videoId}`);
  
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      console.log('No transcript available for this video.');
      return;
    }
    
    const cleanText = transcript
      .map((item: any) => item.text)
      .join(' ')
      .replace(/\[.*?\]/g, '') // Remove [music], [laughter], etc.
      .replace(/\n+/g, ' ') // Replace multiple newlines with space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    console.log('\n=== TRANSCRIPT ===');
    console.log(cleanText);
    console.log('\n=== END TRANSCRIPT ===');
    console.log(`\nTranscript length: ${cleanText.length} characters`);
    
  } catch (error) {
    console.error('Error extracting transcript:', error);
  }
}

getTranscript();