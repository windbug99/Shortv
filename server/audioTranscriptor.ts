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
  let audioDownload: AudioDownloadResult | null = null;
  
  try {
    console.log(`Starting Whisper transcription for video: ${videoId}`);
    
    audioDownload = await downloadVideoAudio(videoId);
    const transcript = await transcribeAudioWithWhisper(audioDownload.audioPath);
    
    if (!transcript || transcript.length < 50) {
      console.log(`Transcript too short for ${videoId}: ${transcript?.length || 0} characters`);
      return null;
    }
    
    console.log(`Successfully transcribed ${videoId} with Whisper: ${transcript.length} characters`);
    return transcript;
    
  } catch (error) {
    console.error(`Whisper transcription failed for ${videoId}:`, error);
    return null;
  } finally {
    if (audioDownload) {
      audioDownload.cleanup();
    }
  }
}