export interface YouTubeApiTranscriptResult {
  success: boolean;
  transcript?: string;
  error?: string;
  method: 'youtube_api_captions' | 'error';
}

export async function extractTranscriptWithYouTubeAPI(videoId: string): Promise<YouTubeApiTranscriptResult> {
  if (!process.env.YOUTUBE_API_KEY) {
    return {
      success: false,
      error: 'YouTube API key required',
      method: 'error'
    };
  }

  console.log(`Extracting transcript with YouTube Data API v3: ${videoId}`);

  try {
    // Step 1: Get captions list for the video
    const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${process.env.YOUTUBE_API_KEY}`;
    
    const captionsResponse = await fetch(captionsListUrl);
    if (!captionsResponse.ok) {
      throw new Error(`Captions API failed: ${captionsResponse.status} ${captionsResponse.statusText}`);
    }

    const captionsData = await captionsResponse.json();
    
    if (!captionsData.items || captionsData.items.length === 0) {
      return {
        success: false,
        error: 'No captions available for this video',
        method: 'error'
      };
    }

    // Step 2: Find the best caption track (preferably Korean, then auto-generated)
    let selectedCaption = null;
    
    // Priority 1: Korean manual captions
    selectedCaption = captionsData.items.find((caption: any) => 
      caption.snippet.language === 'ko' && caption.snippet.trackKind === 'standard'
    );
    
    // Priority 2: Korean auto-generated captions
    if (!selectedCaption) {
      selectedCaption = captionsData.items.find((caption: any) => 
        caption.snippet.language === 'ko' && caption.snippet.trackKind === 'ASR'
      );
    }
    
    // Priority 3: English manual captions
    if (!selectedCaption) {
      selectedCaption = captionsData.items.find((caption: any) => 
        caption.snippet.language === 'en' && caption.snippet.trackKind === 'standard'
      );
    }
    
    // Priority 4: English auto-generated captions
    if (!selectedCaption) {
      selectedCaption = captionsData.items.find((caption: any) => 
        caption.snippet.language === 'en' && caption.snippet.trackKind === 'ASR'
      );
    }
    
    // Priority 5: Any available captions
    if (!selectedCaption) {
      selectedCaption = captionsData.items[0];
    }

    const captionId = selectedCaption.id;
    const language = selectedCaption.snippet.language;
    const trackKind = selectedCaption.snippet.trackKind;
    
    console.log(`Found caption track: ${language} (${trackKind}), ID: ${captionId}`);

    // Step 3: Download the caption content
    const captionDownloadUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${process.env.YOUTUBE_API_KEY}&tfmt=srt`;
    
    const transcriptResponse = await fetch(captionDownloadUrl);
    if (!transcriptResponse.ok) {
      throw new Error(`Caption download failed: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
    }

    const srtContent = await transcriptResponse.text();
    
    // Step 4: Parse SRT format and extract text only
    const transcript = parseSRTContent(srtContent);
    
    if (!transcript || transcript.length < 10) {
      return {
        success: false,
        error: 'Downloaded transcript is too short or empty',
        method: 'error'
      };
    }

    console.log(`Transcript extracted successfully: ${transcript.length} characters (${language})`);
    
    return {
      success: true,
      transcript,
      method: 'youtube_api_captions'
    };

  } catch (error) {
    console.error('YouTube API transcript extraction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'error'
    };
  }
}

function parseSRTContent(srtContent: string): string {
  try {
    // SRT format parsing - extract only the text content
    const lines = srtContent.split('\n');
    const textLines: string[] = [];
    
    let isTextLine = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        isTextLine = false;
        continue;
      }
      
      // Skip sequence numbers (just numbers)
      if (/^\d+$/.test(trimmedLine)) {
        isTextLine = false;
        continue;
      }
      
      // Skip timestamps (format: 00:00:00,000 --> 00:00:00,000)
      if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(trimmedLine)) {
        isTextLine = true;
        continue;
      }
      
      // Collect text lines
      if (isTextLine && trimmedLine) {
        // Clean up HTML tags and special characters
        const cleanedText = trimmedLine
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        
        if (cleanedText) {
          textLines.push(cleanedText);
        }
      }
    }
    
    // Join all text and clean up
    const fullText = textLines.join(' ')
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim();
    
    return fullText;
    
  } catch (error) {
    console.error('SRT parsing error:', error);
    return '';
  }
}

// Function to check if YouTube API key is available
export function isYouTubeAPIAvailable(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}