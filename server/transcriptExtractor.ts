import { YoutubeTranscript } from 'youtube-transcript';
import { extractTranscriptWithYouTubeAPI } from './youtubeApiTranscript.js';

interface TranscriptItem {
  text: string;
  start?: number;
  duration?: number;
}

export async function extractVideoTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`Extracting transcript for video: ${videoId}`);
    
    // Try to get transcript using youtube-transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      console.log(`No transcript available for video: ${videoId}`);
      return null;
    }
    
    // Process and clean the transcript text
    const cleanText = transcript
      .map((item: any) => item.text)
      .join(' ')
      .replace(/\[.*?\]/g, '') // Remove [music], [laughter], etc.
      .replace(/\n+/g, ' ') // Replace multiple newlines with space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    console.log(`Successfully extracted transcript for ${videoId}: ${cleanText.length} characters`);
    return cleanText;
    
  } catch (error) {
    console.warn(`Failed to extract transcript for ${videoId}:`, error);
    return null;
  }
}

export function preprocessTranscript(transcript: string): string {
  // Further text preprocessing for better AI analysis
  return transcript
    .replace(/\b(um|uh|er|ah)\b/gi, '') // Remove filler words
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