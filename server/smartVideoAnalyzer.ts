import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI } from '@langchain/openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SmartAnalysisResult {
  success: boolean;
  transcript?: string;
  enhancedSummary?: string;
  method: 'none' | 'audio_whisper' | 'enhanced_analysis';
  error?: string;
}

export async function smartVideoAnalysis(videoId: string, title: string, description: string): Promise<SmartAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { 
      success: false, 
      error: 'OpenAI API key not available',
      method: 'none'
    };
  }

  console.log(`Smart analysis for video: ${videoId}`);

  // Quick check if audio extraction is feasible (10 seconds max)
  const canExtractAudio = await quickAudioAvailabilityCheck(videoId);
  
  if (canExtractAudio) {
    console.log(`Audio available for ${videoId}, extracting and transcribing`);
    return await extractAndTranscribe(videoId, title);
  } else {
    console.log(`Audio not available for ${videoId}, using enhanced content analysis`);
    return await performEnhancedAnalysis(title, description);
  }
}

async function quickAudioAvailabilityCheck(videoId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ytDlp.kill('SIGTERM');
      resolve(false);
    }, 10000); // 10 second check

    const ytDlp = spawn('yt-dlp', [
      '--simulate',
      '--quiet',
      '--get-duration',
      `https://www.youtube.com/watch?v=${videoId}`
    ]);

    let hasOutput = false;

    ytDlp.stdout.on('data', (data) => {
      const duration = data.toString().trim();
      if (duration && !duration.includes('ERROR')) {
        hasOutput = true;
      }
    });

    ytDlp.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0 && hasOutput);
    });

    ytDlp.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function extractAndTranscribe(videoId: string, title: string): Promise<SmartAnalysisResult> {
  const tempDir = path.join(process.cwd(), 'temp');
  const audioPath = path.join(tempDir, `${videoId}_smart.wav`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extract first 4 minutes of audio for transcription
    const extracted = await extractAudioQuickly(videoId, audioPath, 240);
    if (!extracted) {
      return await performEnhancedAnalysis(title, '');
    }

    // Transcribe using Whisper
    const transcript = await transcribeWithWhisper(audioPath);
    if (!transcript) {
      return await performEnhancedAnalysis(title, '');
    }

    // Generate enhanced summary using the transcript
    const enhancedSummary = await createTranscriptSummary(transcript, title);

    return {
      success: true,
      transcript,
      enhancedSummary,
      method: 'audio_whisper'
    };

  } catch (error) {
    console.log(`Audio transcription failed: ${error}`);
    return await performEnhancedAnalysis(title, '');
  } finally {
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    } catch {}
  }
}

async function extractAudioQuickly(videoId: string, outputPath: string, durationSeconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ytDlp.kill('SIGTERM');
      resolve(false);
    }, 90000); // 90 second max

    const ytDlp = spawn('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'wav',
      '--audio-quality', '5',
      '--postprocessor-args', `ffmpeg:-t ${durationSeconds}`,
      '--output', outputPath.replace('.wav', '.%(ext)s'),
      `https://www.youtube.com/watch?v=${videoId}`
    ]);

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

async function transcribeWithWhisper(audioPath: string): Promise<string | null> {
  try {
    const audioReadStream = fs.createReadStream(audioPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "ko",
      response_format: "text",
      temperature: 0
    });

    return transcription.toString().trim();
  } catch (error) {
    console.error('Whisper transcription failed:', error);
    return null;
  }
}

async function createTranscriptSummary(transcript: string, title: string): Promise<string> {
  try {
    // Use OpenAI directly for simpler implementation
    const summaryPrompt = transcript.length < 3000 
      ? `다음은 YouTube 영상 "${title}"의 실제 음성 전사 내용입니다.

전사 내용:
${transcript}

요구사항:
1. 실제 발화 내용을 바탕으로 정확한 요약 작성
2. 핵심 포인트와 주요 정보 추출
3. 구체적이고 실용적인 내용 포함
4. 한국어로 자연스럽고 읽기 쉽게 작성
5. 불필요한 반복이나 추측 제거

실제 내용을 반영한 상세하고 정확한 요약을 작성해 주세요.`
      : `다음은 YouTube 영상 "${title}"의 음성 전사 내용 일부입니다:

${transcript.substring(0, 4000)}

실제 발화 내용을 바탕으로 핵심 포인트와 주요 정보를 추출하여 한국어로 상세하고 정확한 요약을 작성해 주세요.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: summaryPrompt }],
      temperature: 0.2
    });

    return response.choices[0].message.content || `실제 음성 내용 기반 요약: ${transcript.substring(0, 500)}...`;

  } catch (error) {
    console.error('Transcript summary creation failed:', error);
    return `실제 음성 내용을 바탕으로 한 요약: ${transcript.substring(0, 500)}...`;
  }
}

async function performEnhancedAnalysis(title: string, description: string): Promise<SmartAnalysisResult> {
  try {
    const analysisPrompt = `
YouTube 영상의 제목과 설명을 심층 분석하여 실용적이고 구체적인 내용 예측 및 요약을 생성해 주세요.

제목: ${title}
설명: ${description || '설명 정보 없음'}

분석 요구사항:
1. 제목에서 드러나는 핵심 주제와 의도 파악
2. 대상 독자층과 제공될 가능성이 높은 정보 유형 분석
3. 키워드와 문맥을 통한 구체적 내용 추론
4. 실제로 다룰 것으로 예상되는 주요 포인트들 예측
5. 실용적 가치와 학습 목표 도출

단순한 제목 반복이 아닌, 깊이 있는 내용 분석과 예측을 통해 
실제 영상에서 다룰 것으로 예상되는 구체적이고 유용한 정보를 
한국어로 자연스럽게 정리해 주세요.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: analysisPrompt }],
      temperature: 0.3
    });

    const enhancedAnalysis = response.choices[0].message.content;

    return {
      success: true,
      enhancedSummary: enhancedAnalysis || undefined,
      method: 'enhanced_analysis'
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Enhanced analysis failed',
      method: 'enhanced_analysis'
    };
  }
}