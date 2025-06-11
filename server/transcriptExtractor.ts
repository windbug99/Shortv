import { YoutubeTranscript } from 'youtube-transcript';

interface TranscriptItem {
  text: string;
  start?: number;
  duration?: number;
}

// Rate limiting state
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

export async function extractVideoTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`Extracting transcript for video: ${videoId}`);
    
    // Wait to avoid rate limiting
    await waitForRateLimit();
    
    // Try Korean transcript first
    try {
      const koreanTranscript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'ko'
      });
      
      if (koreanTranscript && koreanTranscript.length > 0) {
        const cleanText = koreanTranscript
          .map((item: any) => item.text)
          .join(' ');
        console.log(`Successfully extracted Korean transcript for ${videoId}: ${cleanText.length} characters`);
        return preprocessTranscript(cleanText);
      }
    } catch (koreanError) {
      console.log(`No Korean transcript found for ${videoId}, trying English...`);
    }
    
    // Wait between different language attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fallback to English transcript
    try {
      const englishTranscript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en'
      });
      
      if (englishTranscript && englishTranscript.length > 0) {
        const cleanText = englishTranscript
          .map((item: any) => item.text)
          .join(' ');
        console.log(`Successfully extracted English transcript for ${videoId}: ${cleanText.length} characters`);
        return preprocessTranscript(cleanText);
      }
    } catch (englishError) {
      console.log(`No English transcript found for ${videoId}, trying default...`);
    }
    
    // Wait before default attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Last resort: try default transcript (any language)
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (transcript && transcript.length > 0) {
        const cleanText = transcript
          .map((item: any) => item.text)
          .join(' ');
        console.log(`Successfully extracted default transcript for ${videoId}: ${cleanText.length} characters`);
        return preprocessTranscript(cleanText);
      }
    } catch (defaultError) {
      console.log(`Default transcript extraction also failed for ${videoId}`);
    }
    
    console.log(`No transcript available for video: ${videoId}`);
    return null;
    
  } catch (error) {
    console.warn(`Failed to extract transcript for ${videoId}:`, error);
    return null;
  }
}

export function preprocessTranscript(transcript: string): string {
  // Further text preprocessing for better AI analysis
  return transcript
    .replace(/\[.*?\]/g, '') // Remove [music], [laughter], etc.
    .replace(/\n+/g, ' ') // Replace multiple newlines with space
    .replace(/\b(um|uh|er|ah|음|어|그|아)\b/gi, '') // Remove filler words (EN/KO)
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

export function chunkTranscript(transcript: string, maxChunkSize: number = 8000): string[] {
  // Split long transcripts into manageable chunks for AI processing
  const words = transcript.split(' ');
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const word of words) {
    if ((currentChunk + ' ' + word).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + word;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}