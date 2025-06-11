import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AudioDownloadResult {
  audioPath: string;
  cleanup: () => void;
}

export async function downloadVideoAudio(videoId: string): Promise<AudioDownloadResult> {
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);
  
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log(`Downloading audio for video: ${videoId}`);
    
    // Use yt-dlp to download audio
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 5 -o "${audioPath.replace('.mp3', '.%(ext)s')}" "${videoUrl}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.warn('yt-dlp stderr:', stderr);
    }
    
    // Check if file was created
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not created: ${audioPath}`);
    }
    
    console.log(`Audio downloaded successfully to: ${audioPath}`);
    
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
    
    // Check file size (Whisper has a 25MB limit)
    const stats = fs.statSync(audioPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > 25) {
      throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)}MB (max 25MB)`);
    }
    
    const audioFile = fs.createReadStream(audioPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ko', // Try Korean first
      response_format: 'text',
    });
    
    console.log(`Transcription completed: ${transcription.length} characters`);
    return transcription;
    
  } catch (error) {
    console.error('Whisper transcription error:', error);
    
    // If Korean fails, try without language specification
    try {
      console.log('Retrying transcription without language specification...');
      const audioFile = fs.createReadStream(audioPath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
      });
      
      console.log(`Transcription completed on retry: ${transcription.length} characters`);
      return transcription;
      
    } catch (retryError) {
      console.error('Whisper transcription failed on retry:', retryError);
      throw retryError;
    }
  }
}

export async function extractTranscriptWithWhisper(videoId: string): Promise<string | null> {
  let audioDownload: AudioDownloadResult | null = null;
  
  try {
    console.log(`Starting Whisper transcription for video: ${videoId}`);
    
    // Download audio
    audioDownload = await downloadVideoAudio(videoId);
    
    // Transcribe with Whisper
    const transcript = await transcribeAudioWithWhisper(audioDownload.audioPath);
    
    if (!transcript || transcript.trim().length === 0) {
      console.log(`Empty transcript received for ${videoId}`);
      return null;
    }
    
    console.log(`Successfully transcribed ${videoId} with Whisper: ${transcript.length} characters`);
    return transcript.trim();
    
  } catch (error) {
    console.error(`Whisper transcription failed for ${videoId}:`, error);
    return null;
  } finally {
    // Always cleanup the audio file
    if (audioDownload) {
      audioDownload.cleanup();
    }
  }
}