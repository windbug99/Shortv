import fetch from 'node-fetch';
import { youtubeOAuth } from './youtubeOAuth.js';

interface CaptionTrack {
  id: string;
  snippet: {
    videoId: string;
    lastUpdated: string;
    trackKind: string;
    language: string;
    name: string;
    audioTrackType: string;
    isCC: boolean;
    isLarge: boolean;
    isAutoSynced: boolean;
    status: string;
  };
}

interface CaptionListResponse {
  items: CaptionTrack[];
}

async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get caption tracks: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as CaptionListResponse;
  return data.items || [];
}

async function downloadCaption(captionId: string, format: 'srt' | 'vtt' = 'srt'): Promise<string> {
  if (!youtubeOAuth.isConfigured()) {
    throw new Error('YouTube OAuth not configured');
  }

  const accessToken = await youtubeOAuth.getAccessToken();
  
  // Use tfmt parameter for format (srt, vtt, etc.)
  const url = `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=${format}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'text/plain',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Caption download error: ${response.status} - ${errorText}`);
    throw new Error(`Caption download failed: ${response.status} ${response.statusText}`);
  }

  const captionContent = await response.text();
  return captionContent;
}

export async function extractTranscriptWithYouTubeAPI(videoId: string): Promise<string> {
  console.log(`Extracting transcript with YouTube Data API v3: ${videoId}`);
  
  try {
    // Get available caption tracks
    const tracks = await getCaptionTracks(videoId);
    
    if (tracks.length === 0) {
      throw new Error('No caption tracks available');
    }

    console.log(`Found ${tracks.length} caption tracks for video ${videoId}`);
    
    // Prioritize tracks: Korean > English > Manual > Auto-generated
    const prioritizedTracks = tracks.sort((a, b) => {
      // Prefer Korean
      if (a.snippet.language === 'ko' && b.snippet.language !== 'ko') return -1;
      if (b.snippet.language === 'ko' && a.snippet.language !== 'ko') return 1;
      
      // Prefer English
      if (a.snippet.language === 'en' && b.snippet.language !== 'en') return -1;
      if (b.snippet.language === 'en' && a.snippet.language !== 'en') return 1;
      
      // Prefer manual over auto-generated
      if (a.snippet.trackKind !== 'asr' && b.snippet.trackKind === 'asr') return -1;
      if (b.snippet.trackKind !== 'asr' && a.snippet.trackKind === 'asr') return 1;
      
      return 0;
    });
    
    const selectedTrack = prioritizedTracks[0];
    
    console.log(`Selected caption track: ${selectedTrack.snippet.language} (${selectedTrack.snippet.trackKind || 'standard'}), ID: ${selectedTrack.id}`);
    
    // Try downloading in SRT format first, then VTT if SRT fails
    let captionData: string;
    try {
      captionData = await downloadCaption(selectedTrack.id, 'srt');
    } catch (srtError) {
      console.log('SRT download failed, trying VTT format...');
      captionData = await downloadCaption(selectedTrack.id, 'vtt');
    }
    
    // Convert caption format to plain text
    const plainText = convertCaptionToPlainText(captionData);
    
    if (!plainText || plainText.trim().length === 0) {
      throw new Error('Caption content is empty after processing');
    }
    
    console.log(`Successfully extracted transcript: ${plainText.length} characters`);
    return plainText;
    
  } catch (error) {
    console.error('YouTube API transcript extraction error:', error);
    throw error;
  }
}

function convertCaptionToPlainText(captionContent: string): string {
  // Handle both SRT and VTT formats
  const lines = captionContent.split('\n');
  const textLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (line === '') continue;
    
    // Skip SRT sequence numbers (just numbers)
    if (/^\d+$/.test(line)) continue;
    
    // Skip SRT timestamps (00:00:00,000 --> 00:00:00,000)
    if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) continue;
    
    // Skip VTT headers
    if (line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) continue;
    
    // Skip VTT timestamps (00:00:00.000 --> 00:00:00.000)
    if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(line)) continue;
    
    // Skip VTT cue settings
    if (line.includes('align:') || line.includes('position:') || line.includes('size:')) continue;
    
    // Remove HTML tags and styling
    const cleanLine = line
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Add valid text lines
    if (cleanLine.length > 0) {
      textLines.push(cleanLine);
    }
  }
  
  return textLines.join(' ').trim();
}