import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AudioTranscriptionResult {
  success: boolean;
  transcript?: string;
  error?: string;
}

export async function transcribeVideoAudio(videoId: string): Promise<AudioTranscriptionResult> {
  const tempDir = path.join(process.cwd(), 'temp');
  const audioPath = path.join(tempDir, `${videoId}.wav`);
  const chunksDir = path.join(tempDir, `chunks_${videoId}`);

  try {
    console.log(`Starting audio transcription for video: ${videoId}`);
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: 'OpenAI API key not available for Whisper transcription' };
    }
    
    // Create temp directories
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // Step 1: Extract audio using yt-dlp with timeout
    console.log('Extracting audio from video...');
    const audioExtracted = await Promise.race([
      extractAudio(videoId, audioPath),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 60000)) // 1 minute timeout for faster fallback
    ]);
    
    if (!audioExtracted) {
      return { success: false, error: 'Failed to extract audio from video or timeout exceeded' };
    }

    // Step 2: Split audio into chunks (limit to first 10 minutes for efficiency)
    console.log('Splitting audio into chunks...');
    const chunkPaths = await splitAudioIntoChunks(audioPath, chunksDir, 600); // 10 minutes max
    if (chunkPaths.length === 0) {
      return { success: false, error: 'Failed to split audio into chunks' };
    }

    // Step 3: Transcribe chunks (limit to first 5 chunks for efficiency)
    const maxChunks = Math.min(chunkPaths.length, 5);
    console.log(`Transcribing ${maxChunks} audio chunks...`);
    const transcripts: string[] = [];
    
    for (let i = 0; i < maxChunks; i++) {
      const chunkPath = chunkPaths[i];
      console.log(`Transcribing chunk ${i + 1}/${maxChunks}`);
      
      try {
        const chunkTranscript = await transcribeAudioChunk(chunkPath);
        if (chunkTranscript) {
          transcripts.push(chunkTranscript);
        }
      } catch (error) {
        console.warn(`Failed to transcribe chunk ${i + 1}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    if (transcripts.length === 0) {
      return { success: false, error: 'Failed to transcribe any audio chunks' };
    }

    // Step 4: Combine and clean up transcript
    const fullTranscript = transcripts
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`Successfully transcribed audio: ${fullTranscript.length} characters from ${transcripts.length} chunks`);

    return {
      success: true,
      transcript: fullTranscript
    };

  } catch (error) {
    console.error('Error in audio transcription process:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during transcription'
    };
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      if (fs.existsSync(chunksDir)) {
        const files = fs.readdirSync(chunksDir);
        for (const file of files) {
          fs.unlinkSync(path.join(chunksDir, file));
        }
        fs.rmdirSync(chunksDir);
      }
    } catch (cleanupError) {
      console.warn('Error cleaning up temporary files:', cleanupError);
    }
  }
}

async function extractAudio(videoId: string, outputPath: string): Promise<boolean> {
  // Try multiple extraction strategies
  const strategies = [
    // Strategy 1: Basic extraction with user agent
    {
      name: 'basic',
      args: [
        '--extract-audio',
        '--audio-format', 'wav',
        '--audio-quality', '5',
        '--max-filesize', '50M',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        '--output', outputPath.replace('.wav', '.%(ext)s'),
        `https://www.youtube.com/watch?v=${videoId}`
      ]
    },
    // Strategy 2: With format selection
    {
      name: 'format-select',
      args: [
        '--extract-audio',
        '--audio-format', 'wav',
        '--audio-quality', '5',
        '--format', 'worst[ext=mp4]/worst',
        '--max-filesize', '50M',
        '--output', outputPath.replace('.wav', '.%(ext)s'),
        `https://www.youtube.com/watch?v=${videoId}`
      ]
    },
    // Strategy 3: Minimal options
    {
      name: 'minimal',
      args: [
        '--extract-audio',
        '--audio-format', 'wav',
        '--output', outputPath.replace('.wav', '.%(ext)s'),
        `https://www.youtube.com/watch?v=${videoId}`
      ]
    }
  ];

  for (const strategy of strategies) {
    console.log(`Trying audio extraction strategy: ${strategy.name}`);
    const success = await tryExtractAudio(strategy.args, outputPath);
    if (success) {
      console.log(`Audio extraction successful with strategy: ${strategy.name}`);
      return true;
    }
    console.log(`Strategy ${strategy.name} failed, trying next...`);
  }

  console.log('All audio extraction strategies failed');
  return false;
}

async function tryExtractAudio(args: string[], outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('Audio extraction timeout for current strategy');
      ytDlp.kill('SIGTERM');
      resolve(false);
    }, 120000); // 2 minute timeout per strategy

    const ytDlp = spawn('yt-dlp', args);
    let hasError = false;

    ytDlp.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ERROR') || output.includes('403') || output.includes('Forbidden')) {
        console.log('Audio extraction error:', output.trim());
        hasError = true;
      }
    });

    ytDlp.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Deleting original file')) {
        console.log('Audio extraction in progress...');
      }
    });

    ytDlp.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && !hasError && fs.existsSync(outputPath)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    ytDlp.on('error', (error) => {
      clearTimeout(timeout);
      console.log('yt-dlp spawn error:', error);
      resolve(false);
    });
  });
}

async function splitAudioIntoChunks(audioPath: string, chunksDir: string, maxDuration?: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const chunkPaths: string[] = [];
    const chunkDuration = 120; // 2 minutes per chunk
    
    // First, get audio duration
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const actualDuration = metadata.format.duration || 0;
      const limitedDuration = maxDuration ? Math.min(actualDuration, maxDuration) : actualDuration;
      const numberOfChunks = Math.ceil(limitedDuration / chunkDuration);
      let completedChunks = 0;

      if (numberOfChunks === 0) {
        resolve([]);
        return;
      }

      for (let i = 0; i < numberOfChunks; i++) {
        const startTime = i * chunkDuration;
        const chunkPath = path.join(chunksDir, `chunk_${i.toString().padStart(3, '0')}.wav`);
        chunkPaths.push(chunkPath);

        ffmpeg(audioPath)
          .seekInput(startTime)
          .duration(chunkDuration)
          .output(chunkPath)
          .on('end', () => {
            completedChunks++;
            if (completedChunks === numberOfChunks) {
              resolve(chunkPaths.filter(p => fs.existsSync(p)));
            }
          })
          .on('error', (error) => {
            console.warn(`Error creating chunk ${i}:`, error);
            completedChunks++;
            if (completedChunks === numberOfChunks) {
              resolve(chunkPaths.filter(p => fs.existsSync(p)));
            }
          })
          .run();
      }
    });
  });
}

async function transcribeAudioChunk(chunkPath: string): Promise<string | null> {
  try {
    const audioReadStream = fs.createReadStream(chunkPath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "ko", // Korean language hint
      response_format: "text"
    });

    return transcription.toString().trim();
  } catch (error) {
    console.error('Error transcribing audio chunk:', error);
    throw error;
  }
}