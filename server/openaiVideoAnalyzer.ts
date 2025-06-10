import OpenAI from "openai";
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface OpenAIVideoAnalysisResult {
  success: boolean;
  transcript?: string;
  summary?: string;
  error?: string;
  method: 'openai_whisper' | 'error';
}

export async function analyzeVideoWithOpenAI(videoId: string, title: string, description: string): Promise<OpenAIVideoAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: 'OpenAI API key required',
      method: 'error'
    };
  }

  console.log(`Analyzing video with OpenAI Whisper + GPT-4o: ${videoId}`);

  try {
    // Step 1: Extract audio from video
    const audioPath = await extractAudioFromVideo(videoId);
    if (!audioPath) {
      return {
        success: false,
        error: 'Failed to extract audio from video',
        method: 'error'
      };
    }

    // Step 2: Transcribe audio with Whisper
    const transcript = await transcribeWithWhisper(audioPath);
    
    // Clean up audio file
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    } catch {}

    if (!transcript) {
      return {
        success: false,
        error: 'Failed to transcribe audio',
        method: 'error'
      };
    }

    // Step 3: Generate summary with GPT-4o
    const summary = await generateSummaryWithGPT4o(transcript, title, description);

    return {
      success: true,
      transcript,
      summary,
      method: 'openai_whisper'
    };

  } catch (error) {
    console.error('OpenAI video analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'error'
    };
  }
}

async function extractAudioFromVideo(videoId: string): Promise<string | null> {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (ytDlpProcess && !ytDlpProcess.killed) {
        ytDlpProcess.kill('SIGKILL');
      }
      resolve(null);
    }, 120000); // 2 minute timeout

    // Use yt-dlp to get direct video URL and extract audio
    const ytDlpProcess = spawn('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', audioPath.replace('.mp3', '.%(ext)s'),
      `https://www.youtube.com/watch?v=${videoId}`
    ]);

    ytDlpProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0 && fs.existsSync(audioPath)) {
        console.log(`Audio extracted successfully: ${audioPath}`);
        resolve(audioPath);
      } else {
        console.log(`Failed to extract audio for ${videoId}, code: ${code}`);
        resolve(null);
      }
    });

    ytDlpProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.error('yt-dlp error:', error);
      resolve(null);
    });

    ytDlpProcess.stderr.on('data', (data) => {
      console.log(`yt-dlp stderr: ${data}`);
    });
  });
}

async function transcribeWithWhisper(audioPath: string): Promise<string | null> {
  try {
    console.log(`Transcribing audio with Whisper: ${audioPath}`);
    
    // Check file size (Whisper has a 25MB limit)
    const stats = fs.statSync(audioPath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`Audio file size: ${fileSizeInMB.toFixed(2)} MB`);
    
    if (fileSizeInMB > 24) {
      console.log('Audio file too large, splitting into chunks...');
      return await transcribeLargeFile(audioPath);
    }

    const audioFile = fs.createReadStream(audioPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ko", // Korean language
      response_format: "text"
    });

    console.log(`Transcription completed: ${transcription.length} characters`);
    return transcription;

  } catch (error) {
    console.error('Whisper transcription error:', error);
    return null;
  }
}

async function transcribeLargeFile(audioPath: string): Promise<string | null> {
  try {
    // Split audio into smaller chunks
    const chunks = await splitAudioFile(audioPath);
    if (chunks.length === 0) {
      return null;
    }

    const transcripts: string[] = [];
    
    for (const chunkPath of chunks) {
      try {
        const audioFile = fs.createReadStream(chunkPath);
        
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "ko",
          response_format: "text"
        });
        
        transcripts.push(transcription);
        
        // Clean up chunk
        if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
        
      } catch (error) {
        console.error(`Error transcribing chunk ${chunkPath}:`, error);
      }
    }

    return transcripts.join(' ');

  } catch (error) {
    console.error('Large file transcription error:', error);
    return null;
  }
}

async function splitAudioFile(audioPath: string, chunkDurationMinutes: number = 10): Promise<string[]> {
  const tempDir = path.dirname(audioPath);
  const baseName = path.basename(audioPath, path.extname(audioPath));
  const chunkPattern = path.join(tempDir, `${baseName}_chunk_%03d.mp3`);
  
  return new Promise((resolve) => {
    const ffmpegProcess = spawn('ffmpeg', [
      '-i', audioPath,
      '-f', 'segment',
      '-segment_time', (chunkDurationMinutes * 60).toString(),
      '-c', 'copy',
      chunkPattern
    ]);

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        // Find all chunk files
        const chunks: string[] = [];
        let i = 0;
        while (true) {
          const chunkPath = path.join(tempDir, `${baseName}_chunk_${String(i).padStart(3, '0')}.mp3`);
          if (fs.existsSync(chunkPath)) {
            chunks.push(chunkPath);
            i++;
          } else {
            break;
          }
        }
        resolve(chunks);
      } else {
        resolve([]);
      }
    });

    ffmpegProcess.on('error', () => {
      resolve([]);
    });
  });
}

async function generateSummaryWithGPT4o(transcript: string, title: string, description: string): Promise<string> {
  try {
    const prompt = `
다음 YouTube 영상의 전사본을 바탕으로 요약해주세요:

제목: ${title}
설명: ${description}
전사본: ${transcript.substring(0, 8000)}${transcript.length > 8000 ? "..." : ""}

형식:
첫 줄: "스크립트 있음"

# 핵심정리

### 1. 주요 주제
- 전사본에서 언급된 핵심 내용

### 2. 세부 내용
- 구체적인 설명과 예시

## 핵심 결론
- 영상의 주요 메시지

중요한 제약사항:
- 전사본의 실제 내용만 사용
- 외부 정보나 추측 내용 절대 포함 금지
- 전사본에 없는 내용은 언급하지 않음
- 구체적이고 실용적인 내용 포함
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 YouTube 영상 요약 전문가입니다. 주어진 전사본을 바탕으로 정확하고 유용한 요약을 작성합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    return response.choices[0].message.content || "요약 생성 실패";

  } catch (error) {
    console.error('GPT-4o summary generation error:', error);
    return "GPT-4o 요약 생성 중 오류가 발생했습니다.";
  }
}