import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ImprovedSummaryResult {
  success: boolean;
  transcript?: string;
  enhancedSummary?: string;
  method: 'none' | 'audio_transcription' | 'intelligent_analysis';
  error?: string;
}

export async function generateImprovedSummary(videoId: string, title: string, description: string): Promise<ImprovedSummaryResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { 
      success: false, 
      error: 'OpenAI API key required',
      method: 'none'
    };
  }

  console.log(`Generating improved summary for video: ${videoId}`);

  // Quick audio availability test (5 seconds)
  const audioAvailable = await testAudioAvailability(videoId);
  
  if (audioAvailable) {
    console.log(`Audio extraction possible, attempting transcription for ${videoId}`);
    return await performAudioTranscription(videoId, title);
  } else {
    console.log(`Audio not available, using intelligent content analysis for ${videoId}`);
    return await performIntelligentAnalysis(title, description);
  }
}

async function testAudioAvailability(videoId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (testProcess && !testProcess.killed) {
        testProcess.kill('SIGKILL');
      }
      resolve(false);
    }, 3000); // 3 second quick test

    const testProcess = spawn('yt-dlp', [
      '--simulate',
      '--quiet',
      '--no-warnings',
      `https://www.youtube.com/watch?v=${videoId}`
    ]);

    let hasError = false;

    testProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('403') || output.includes('Forbidden') || output.includes('ERROR')) {
        hasError = true;
        testProcess.kill('SIGKILL');
      }
    });

    testProcess.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0 && !hasError);
    });

    testProcess.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function performAudioTranscription(videoId: string, title: string): Promise<ImprovedSummaryResult> {
  const tempDir = path.join(process.cwd(), 'temp');
  const audioPath = path.join(tempDir, `${videoId}_improved.wav`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extract 3 minutes of audio for transcription
    const extracted = await extractAudioSegment(videoId, audioPath, 180);
    if (!extracted) {
      return await performIntelligentAnalysis(title, '');
    }

    // Transcribe using Whisper
    const transcript = await transcribeAudio(audioPath);
    if (!transcript) {
      return await performIntelligentAnalysis(title, '');
    }

    // Generate summary from transcript
    const enhancedSummary = await createSummaryFromTranscript(transcript, title);

    return {
      success: true,
      transcript,
      enhancedSummary,
      method: 'audio_transcription'
    };

  } catch (error) {
    console.log(`Audio transcription failed: ${error}`);
    return await performIntelligentAnalysis(title, '');
  } finally {
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    } catch {}
  }
}

async function extractAudioSegment(videoId: string, outputPath: string, durationSeconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (ytDlp && !ytDlp.killed) {
        ytDlp.kill('SIGTERM');
      }
      resolve(false);
    }, 60000); // 1 minute max

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

async function transcribeAudio(audioPath: string): Promise<string | null> {
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
    console.error('Whisper transcription error:', error);
    return null;
  }
}

async function createSummaryFromTranscript(transcript: string, title: string): Promise<string> {
  try {
    const prompt = `다음은 YouTube 영상 "${title}"의 실제 음성 전사 내용입니다.

전사 내용:
${transcript}

요구사항:
1. 실제 발화 내용을 바탕으로 정확한 요약 작성
2. 핵심 포인트와 주요 정보 추출
3. 구체적이고 실용적인 내용 포함
4. 한국어로 자연스럽고 읽기 쉽게 작성
5. 추측이나 추가 해석 없이 실제 내용만 반영

실제 내용을 정확히 반영한 상세한 요약을 작성해 주세요.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    return response.choices[0].message.content || `음성 전사 기반 요약: ${transcript.substring(0, 300)}...`;

  } catch (error) {
    console.error('Summary creation failed:', error);
    return `실제 음성 내용: ${transcript.substring(0, 300)}...`;
  }
}

async function performIntelligentAnalysis(title: string, description: string): Promise<ImprovedSummaryResult> {
  try {
    const prompt = `YouTube 영상의 제목과 설명을 깊이 분석하여 정확하고 구체적인 내용 요약을 생성해 주세요.

제목: ${title}
설명: ${description || '설명 없음'}

분석 지침:
1. 제목의 핵심 키워드와 의도 분석
2. 대상 독자와 예상 내용 유형 파악
3. 실제로 다룰 것으로 예상되는 구체적 정보 추론
4. 실용적 가치와 학습 포인트 도출
5. 단순 제목 반복 대신 심층적 내용 예측

제목과 맥락을 바탕으로 실제 영상에서 제공할 것으로 예상되는 구체적이고 유용한 정보를 한국어로 자연스럽게 요약해 주세요.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    return {
      success: true,
      enhancedSummary: response.choices[0].message.content || undefined,
      method: 'intelligent_analysis'
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Intelligent analysis failed',
      method: 'intelligent_analysis'
    };
  }
}