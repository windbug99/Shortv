import fetch from 'node-fetch';
import { youtubeOAuth } from './youtubeOAuth.js';

interface CaptionTrack {
  id: string;
  name: {
    simpleText: string;
  };
  languageCode: string;
  kind?: string;
}

interface CaptionListResponse {
  items: Array<{
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
    id: string;
  }>;
}

async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not configured');
  }

  const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get caption tracks: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as CaptionListResponse;
  
  return data.items.map(item => ({
    id: item.id,
    name: { simpleText: item.snippet.name },
    languageCode: item.snippet.language,
    kind: item.snippet.trackKind
  }));
}

async function downloadCaption(captionId: string): Promise<string> {
  if (!youtubeOAuth.isConfigured()) {
    throw new Error('YouTube OAuth not configured');
  }

  const accessToken = await youtubeOAuth.getAccessToken();
  
  const url = `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Caption download failed: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

export async function extractTranscriptWithYouTubeAPI(videoId: string): Promise<string> {
  console.log(`Extracting transcript with YouTube Data API v3: ${videoId}`);
  
  try {
    // Get available caption tracks
    const tracks = await getCaptionTracks(videoId);
    
    if (tracks.length === 0) {
      throw new Error('No caption tracks available');
    }

    // Prefer manual captions over auto-generated
    const manualTrack = tracks.find(track => track.kind !== 'asr');
    const selectedTrack = manualTrack || tracks[0];
    
    if (!selectedTrack) {
      throw new Error('No suitable caption track found');
    }
    
    console.log(`Found caption track: ${selectedTrack.languageCode} (${selectedTrack.kind || 'standard'}), ID: ${selectedTrack.id}`);
    
    // Download the caption
    const captionData = await downloadCaption(selectedTrack.id);
    
    // Convert SRT format to plain text
    const plainText = convertSRTToPlainText(captionData);
    
    return plainText;
  } catch (error) {
    console.error('YouTube API transcript extraction error:', error);
    throw error;
  }
}

function convertSRTToPlainText(srtContent: string): string {
  // Remove SRT timing and numbering, keep only text
  const lines = srtContent.split('\n');
  const textLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, numbers, and timestamp lines
    if (line === '' || /^\d+$/.test(line) || /^\d{2}:\d{2}:\d{2}/.test(line)) {
      continue;
    }
    
    // This should be actual caption text
    if (line.length > 0) {
      textLines.push(line);
    }
  }
  
  return textLines.join(' ').trim();
}