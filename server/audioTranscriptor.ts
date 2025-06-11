import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AudioDownloadResult {
  audioPath: string;
  cleanup: () => void;
}

async function getVideoDuration(videoId: string): Promise<number> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const command = `yt-dlp --get-duration "${videoUrl}"`;
    
    const { stdout } = await execAsync(command, { timeout: 30000 });
    const durationStr = stdout.trim();
    
    // Parse duration (format: HH:MM:SS or MM:SS)
    const parts = durationStr.split(':').map(Number);
    let seconds = 0;
    
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      seconds = parts[0];
    }
    
    console.log(`Video duration: ${durationStr} (${seconds} seconds)`);
    return seconds;
  } catch (error) {
    console.warn('Failed to get video duration, defaulting to 300 seconds:', error);
    return 300; // Default to 5 minutes
  }
}

export async function downloadVideoAudioSegments(videoId: string): Promise<{ segments: string[], cleanup: () => void }> {
  const tempDir = path.join(process.cwd(), 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Getting video duration for: ${videoId}`);
  
  const totalDuration = await getVideoDuration(videoId);
  const segmentDuration = 300; // 5 minutes per segment
  const numSegments = Math.ceil(totalDuration / segmentDuration);
  
  console.log(`Video duration: ${totalDuration}s, will create ${numSegments} segments`);
  
  const segments: string[] = [];
  const segmentPaths: string[] = [];
  
  try {
    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const segmentPath = path.join(tempDir, `${videoId}_segment_${i}.mp3`);
      segmentPaths.push(segmentPath);
      
      console.log(`Downloading segment ${i + 1}/${numSegments} (${startTime}s-${startTime + segmentDuration}s)`);
      
      const command = `yt-dlp -x --audio-format mp3 --audio-quality 5 --postprocessor-args "ffmpeg:-ss ${startTime} -t ${segmentDuration} -ar 16000" -o "${segmentPath.replace('.mp3', '.%(ext)s')}" "${videoUrl}"`;
      
      const segmentStartTime = Date.now();
      await execAsync(command, { 
        timeout: 300000, // 5 minute timeout per segment
        maxBuffer: 1024 * 1024 * 50 // 50MB buffer
      });
      const segmentTime = Math.round((Date.now() - segmentStartTime) / 1000);
      
      if (fs.existsSync(segmentPath)) {
        const stats = fs.statSync(segmentPath);
        const fileSizeMB = stats.size / (1024 * 1024);
        console.log(`Segment ${i + 1} downloaded: ${fileSizeMB.toFixed(2)}MB in ${segmentTime}s`);
        segments.push(segmentPath);
      } else {
        console.warn(`Segment ${i + 1} was not created: ${segmentPath}`);
      }
    }
    
    if (segments.length === 0) {
      throw new Error('No audio segments were successfully downloaded');
    }
    
    console.log(`Successfully downloaded ${segments.length}/${numSegments} segments`);
    
    return {
      segments,
      cleanup: () => {
        segmentPaths.forEach(segmentPath => {
          try {
            if (fs.existsSync(segmentPath)) {
              fs.unlinkSync(segmentPath);
              console.log(`Cleaned up segment: ${segmentPath}`);
            }
          } catch (error) {
            console.warn(`Failed to clean up segment: ${segmentPath}`, error);
          }
        });
      }
    };
    
  } catch (error) {
    // Cleanup on error
    segmentPaths.forEach(segmentPath => {
      try {
        if (fs.existsSync(segmentPath)) {
          fs.unlinkSync(segmentPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    });
    
    console.error(`Failed to download audio segments for ${videoId}:`, error);
    throw error;
  }
}

export async function downloadVideoAudio(videoId: string): Promise<AudioDownloadResult> {
  const tempDir = path.join(process.cwd(), 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);
  
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Downloading audio for video: ${videoId}`);
    
    // Use yt-dlp with limited duration and better error handling
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 5 --postprocessor-args "ffmpeg:-t 300 -ar 16000" -o "${audioPath.replace('.mp3', '.%(ext)s')}" "${videoUrl}"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 180000, // 3 minute timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('[download]')) {
      console.warn('yt-dlp stderr:', stderr);
    }
    
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not created: ${audioPath}`);
    }
    
    // Check file size (Whisper has 25MB limit)
    const stats = fs.statSync(audioPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > 25) {
      throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)}MB (max 25MB)`);
    }
    
    console.log(`Audio downloaded successfully: ${fileSizeMB.toFixed(2)}MB`);
    
    return {
      audioPath,
      cleanup: () => {
        try {
          if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
            console.log(`Cleaned up audio file: ${audioPath}`);
          }
        } catch (error) {
          console.warn(`Failed to clean up audio file: ${audioPath}`, error);
        }
      }
    };
    
  } catch (error) {
    console.error(`Failed to download audio for ${videoId}:`, error);
    throw error;
  }
}

export async function transcribeAudioWithWhisper(audioPath: string): Promise<string> {
  try {
    console.log(`Transcribing audio file: ${audioPath}`);
    
    const audioFile = fs.createReadStream(audioPath);
    
    // Try Korean first, then fallback to auto-detect
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'ko',
        response_format: 'text',
      });
      
      if (transcription && transcription.trim().length > 50) {
        console.log(`Korean transcription completed: ${transcription.length} characters`);
        return transcription.trim();
      }
    } catch (error) {
      console.log('Korean transcription failed, trying auto-detect...');
    }
    
    // Fallback to auto-detect language
    const audioFileRetry = fs.createReadStream(audioPath);
    const transcription = await openai.audio.transcriptions.create({
      file: audioFileRetry,
      model: 'whisper-1',
      response_format: 'text',
    });
    
    console.log(`Auto-detect transcription completed: ${transcription.length} characters`);
    return transcription.trim();
    
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw error;
  }
}

export async function extractTranscriptWithWhisper(videoId: string): Promise<string | null> {
  let segmentDownload: { segments: string[], cleanup: () => void } | null = null;
  
  try {
    console.log(`Starting segmented Whisper transcription for video: ${videoId}`);
    const totalStartTime = Date.now();
    
    // Step 1: Download audio segments
    console.log(`Step 1: Downloading audio segments...`);
    const downloadStartTime = Date.now();
    segmentDownload = await downloadVideoAudioSegments(videoId);
    const downloadTime = Math.round((Date.now() - downloadStartTime) / 1000);
    console.log(`Step 1 completed: ${segmentDownload.segments.length} segments downloaded in ${downloadTime}s`);
    
    // Step 2: Transcribe each segment
    console.log(`Step 2: Transcribing ${segmentDownload.segments.length} segments...`);
    const transcriptionStartTime = Date.now();
    const transcripts: string[] = [];
    
    for (let i = 0; i < segmentDownload.segments.length; i++) {
      const segmentPath = segmentDownload.segments[i];
      console.log(`Transcribing segment ${i + 1}/${segmentDownload.segments.length}...`);
      
      const segmentTranscriptStartTime = Date.now();
      try {
        const segmentTranscript = await transcribeAudioWithWhisper(segmentPath);
        const segmentTranscriptTime = Math.round((Date.now() - segmentTranscriptStartTime) / 1000);
        
        if (segmentTranscript && segmentTranscript.trim().length > 10) {
          transcripts.push(segmentTranscript.trim());
          console.log(`Segment ${i + 1} transcribed: ${segmentTranscript.length} chars in ${segmentTranscriptTime}s`);
        } else {
          console.log(`Segment ${i + 1} produced empty/short transcript in ${segmentTranscriptTime}s`);
        }
      } catch (segmentError) {
        console.warn(`Failed to transcribe segment ${i + 1}:`, segmentError);
      }
    }
    
    const transcriptionTime = Math.round((Date.now() - transcriptionStartTime) / 1000);
    console.log(`Step 2 completed: ${transcripts.length}/${segmentDownload.segments.length} segments transcribed in ${transcriptionTime}s`);
    
    // Step 3: Merge transcripts
    console.log(`Step 3: Merging transcripts...`);
    const mergeStartTime = Date.now();
    
    if (transcripts.length === 0) {
      console.log(`No transcripts to merge for ${videoId}`);
      return null;
    }
    
    const fullTranscript = transcripts.join(' ').trim();
    const mergeTime = Math.round((Date.now() - mergeStartTime) / 1000);
    const totalTime = Math.round((Date.now() - totalStartTime) / 1000);
    
    console.log(`Step 3 completed: Merged transcript has ${fullTranscript.length} characters in ${mergeTime}s`);
    console.log(`Total process time: ${totalTime}s (Download: ${downloadTime}s, Transcription: ${transcriptionTime}s, Merge: ${mergeTime}s)`);
    
    if (fullTranscript.length < 50) {
      console.log(`Final transcript too short for ${videoId}: ${fullTranscript.length} characters`);
      return null;
    }
    
    console.log(`Successfully transcribed ${videoId} with segmented Whisper: ${fullTranscript.length} characters`);
    return fullTranscript;
    
  } catch (error) {
    console.error(`Segmented Whisper transcription failed for ${videoId}:`, error);
    return null;
  } finally {
    if (segmentDownload) {
      segmentDownload.cleanup();
    }
  }
}