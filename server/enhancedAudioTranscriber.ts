import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAI as LangChainOpenAI } from '@langchain/openai';
import { loadSummarizationChain } from 'langchain/chains';
import { Document } from '@langchain/core/documents';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface EnhancedTranscriptionResult {
  success: boolean;
  transcript?: string;
  summary?: string;
  error?: string;
}

export async function enhancedVideoTranscription(videoId: string): Promise<EnhancedTranscriptionResult> {
  const tempDir = path.join(process.cwd(), 'temp');
  const audioPath = path.join(tempDir, `${videoId}.wav`);
  const chunksDir = path.join(tempDir, `chunks_${videoId}`);

  try {
    console.log(`Starting enhanced transcription for video: ${videoId}`);
    
    if (!process.env.OPENAI_API_KEY) {
      return { success: false, error: 'OpenAI API key not available' };
    }
    
    // Create temp directories
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // Step 1: Enhanced audio extraction with multiple strategies
    console.log('Extracting audio with enhanced methods...');
    const audioExtracted = await enhancedAudioExtraction(videoId, audioPath);
    if (!audioExtracted) {
      return { success: false, error: 'Failed to extract audio from video' };
    }

    // Step 2: Split audio into manageable chunks
    console.log('Processing audio chunks...');
    const chunkPaths = await splitAudioIntoChunks(audioPath, chunksDir, 600); // 10 minutes max
    if (chunkPaths.length === 0) {
      return { success: false, error: 'Failed to process audio chunks' };
    }

    // Step 3: Transcribe using Whisper with optimized settings
    console.log(`Transcribing ${chunkPaths.length} audio chunks with Whisper...`);
    const transcriptSegments: string[] = [];
    
    for (let i = 0; i < Math.min(chunkPaths.length, 5); i++) {
      const chunkPath = chunkPaths[i];
      console.log(`Processing chunk ${i + 1}/${Math.min(chunkPaths.length, 5)}`);
      
      try {
        const segment = await transcribeWithWhisper(chunkPath);
        if (segment) {
          transcriptSegments.push(segment);
        }
      } catch (error) {
        console.warn(`Failed to transcribe chunk ${i + 1}:`, error);
      }
    }

    if (transcriptSegments.length === 0) {
      return { success: false, error: 'Failed to transcribe any audio segments' };
    }

    // Step 4: Combine transcript segments
    const fullTranscript = transcriptSegments
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`Transcript extracted: ${fullTranscript.length} characters`);

    // Step 5: Use LangChain MapReduce for intelligent summarization
    console.log('Generating enhanced summary with LangChain...');
    const summary = await generateMapReduceSummary(fullTranscript);

    return {
      success: true,
      transcript: fullTranscript,
      summary: summary || undefined
    };

  } catch (error) {
    console.error('Enhanced transcription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transcription error'
    };
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      if (fs.existsSync(chunksDir)) {
        const files = fs.readdirSync(chunksDir);
        for (const file of files) {
          fs.unlinkSync(path.join(chunksDir, file));
        }
        fs.rmdirSync(chunksDir);
      }
    } catch (cleanupError) {
      console.warn('Cleanup warning:', cleanupError);
    }
  }
}

async function enhancedAudioExtraction(videoId: string, outputPath: string): Promise<boolean> {
  console.log(`Enhanced audio extraction for: ${videoId}`);
  
  // Strategy 1: yt-dlp with optimized settings
  const ytDlpSuccess = await tryYtDlpExtraction(videoId, outputPath);
  if (ytDlpSuccess) return true;

  // Strategy 2: Alternative extraction methods
  console.log('Trying alternative extraction methods...');
  return await tryAlternativeExtraction(videoId, outputPath);
}

async function tryYtDlpExtraction(videoId: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ytDlp.kill('SIGKILL');
      resolve(false);
    }, 45000); // 45 second timeout

    const ytDlp = spawn('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'wav',
      '--audio-quality', '0',
      '--max-filesize', '100M',
      '--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '--output', outputPath.replace('.wav', '.%(ext)s'),
      `https://www.youtube.com/watch?v=${videoId}`
    ]);

    let hasError = false;

    ytDlp.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('403') || output.includes('Forbidden') || output.includes('ERROR')) {
        hasError = true;
        ytDlp.kill('SIGKILL');
      }
    });

    ytDlp.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0 && !hasError && fs.existsSync(outputPath));
    });

    ytDlp.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function tryAlternativeExtraction(videoId: string, outputPath: string): Promise<boolean> {
  // Try with different yt-dlp parameters for restricted content
  const strategies = [
    ['--format', 'worst[height<=480]/worst'],
    ['--format', 'worstaudio'],
    ['--no-check-certificate', '--ignore-errors']
  ];

  for (const extraArgs of strategies) {
    console.log(`Trying alternative strategy with args: ${extraArgs.join(' ')}`);
    const success = await tryYtDlpWithArgs(videoId, outputPath, extraArgs);
    if (success) return true;
  }

  return false;
}

async function tryYtDlpWithArgs(videoId: string, outputPath: string, extraArgs: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ytDlp.kill('SIGKILL');
      resolve(false);
    }, 30000);

    const baseArgs = [
      '--extract-audio',
      '--audio-format', 'wav',
      '--output', outputPath.replace('.wav', '.%(ext)s')
    ];

    const ytDlp = spawn('yt-dlp', [...baseArgs, ...extraArgs, `https://www.youtube.com/watch?v=${videoId}`]);

    ytDlp.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0 && fs.existsSync(outputPath));
    });

    ytDlp.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function splitAudioIntoChunks(audioPath: string, chunksDir: string, maxDuration?: number): Promise<string[]> {
  return new Promise((resolve) => {
    const chunkPaths: string[] = [];
    const chunkDuration = 120; // 2 minutes per chunk
    
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        resolve([]);
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
          .on('error', () => {
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

async function transcribeWithWhisper(chunkPath: string): Promise<string | null> {
  try {
    const audioReadStream = fs.createReadStream(chunkPath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "ko",
      response_format: "text",
      temperature: 0 // For more consistent results
    });

    return transcription.toString().trim();
  } catch (error) {
    console.error('Whisper transcription error:', error);
    return null;
  }
}

async function generateMapReduceSummary(transcript: string): Promise<string | null> {
  try {
    // Initialize LangChain OpenAI model
    const model = new LangChainOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      temperature: 0.3
    });

    // Split text into manageable chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4000,
      chunkOverlap: 200
    });

    const docs = await textSplitter.createDocuments([transcript]);
    
    if (docs.length === 0) {
      return null;
    }

    // Use MapReduce chain for large document summarization
    const chain = loadSummarizationChain(model, { 
      type: "map_reduce",
      verbose: false
    });

    const result = await chain.call({
      input_documents: docs
    });

    return result.text || null;
  } catch (error) {
    console.error('LangChain summarization error:', error);
    return null;
  }
}