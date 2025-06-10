import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAI as LangChainOpenAI } from '@langchain/openai';
import { loadSummarizationChain } from 'langchain/chains';
import { Document } from '@langchain/core/documents';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PracticalTranscriptionResult {
  success: boolean;
  transcript?: string;
  summary?: string;
  error?: string;
  method: 'none' | 'quick_audio' | 'fallback_analysis';
}

export async function practicalVideoTranscription(videoId: string, title: string, description: string): Promise<PracticalTranscriptionResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { 
      success: false, 
      error: 'OpenAI API key not available',
      method: 'none'
    };
  }

  console.log(`Starting practical transcription for video: ${videoId}`);

  // Quick audio extraction test (5 seconds max)
  const quickAudioResult = await quickAudioTest(videoId);
  
  if (quickAudioResult.canExtract) {
    console.log(`Audio extraction possible for ${videoId}, proceeding with transcription`);
    return await performAudioTranscription(videoId);
  } else {
    console.log(`Audio extraction not possible for ${videoId}, using enhanced content analysis`);
    return await enhancedContentAnalysis(title, description, videoId);
  }
}

async function quickAudioTest(videoId: string): Promise<{ canExtract: boolean }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ytDlp.kill('SIGKILL');
      resolve({ canExtract: false });
    }, 5000); // 5 second test

    const ytDlp = spawn('yt-dlp', [
      '--simulate',
      '--quiet',
      '--no-warnings',
      `https://www.youtube.com/watch?v=${videoId}`
    ]);

    ytDlp.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ canExtract: code === 0 });
    });

    ytDlp.on('error', () => {
      clearTimeout(timeout);
      resolve({ canExtract: false });
    });
  });
}

async function performAudioTranscription(videoId: string): Promise<PracticalTranscriptionResult> {
  const tempDir = path.join(process.cwd(), 'temp');
  const audioPath = path.join(tempDir, `${videoId}.wav`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extract first 3 minutes of audio only for efficiency
    const extracted = await extractAudioSegment(videoId, audioPath, 180); // 3 minutes
    if (!extracted) {
      return { 
        success: false, 
        error: 'Audio extraction failed',
        method: 'quick_audio'
      };
    }

    // Transcribe the audio segment
    const transcript = await transcribeAudioFile(audioPath);
    if (!transcript) {
      return { 
        success: false, 
        error: 'Audio transcription failed',
        method: 'quick_audio'
      };
    }

    // Generate summary using LangChain
    const summary = await generateLangChainSummary(transcript);

    return {
      success: true,
      transcript,
      summary: summary || undefined,
      method: 'quick_audio'
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'quick_audio'
    };
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    } catch {}
  }
}

async function extractAudioSegment(videoId: string, outputPath: string, durationSeconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ytDlp.kill('SIGKILL');
      resolve(false);
    }, 60000); // 1 minute max for extraction

    const ytDlp = spawn('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'wav',
      '--download-sections', `*0-${durationSeconds}`,
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

async function transcribeAudioFile(audioPath: string): Promise<string | null> {
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

async function generateLangChainSummary(transcript: string): Promise<string | null> {
  try {
    const model = new LangChainOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      temperature: 0.3
    });

    if (transcript.length < 2000) {
      // For short transcripts, use direct summarization
      const prompt = `다음 YouTube 영상의 전사 내용을 한국어로 요약해 주세요. 핵심 내용과 주요 포인트를 포함하여 간결하고 정확하게 요약하세요:\n\n${transcript}`;
      
      const result = await model.call(prompt);
      return result;
    } else {
      // For longer transcripts, use MapReduce
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 3000,
        chunkOverlap: 200
      });

      const docs = await textSplitter.createDocuments([transcript]);
      const chain = loadSummarizationChain(model, { type: "map_reduce" });
      const result = await chain.call({ input_documents: docs });
      
      return result.text || null;
    }
  } catch (error) {
    console.error('LangChain summarization error:', error);
    return null;
  }
}

async function enhancedContentAnalysis(title: string, description: string, videoId: string): Promise<PracticalTranscriptionResult> {
  try {
    // Use OpenAI to generate enhanced analysis based on title and description
    const model = new LangChainOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      temperature: 0.3
    });

    const prompt = `
다음 YouTube 영상의 제목과 설명을 분석하여 상세하고 정확한 내용 요약을 생성해 주세요.

제목: ${title}
설명: ${description || '설명 없음'}

요구사항:
1. 영상의 주요 내용과 목적을 분석
2. 대상 독자와 핵심 가치 제안 파악
3. 주요 키워드와 토픽 추출
4. 실용적이고 구체적인 정보 포함
5. 한국어로 자연스럽고 읽기 쉽게 작성

제목과 설명만으로도 충분히 유용한 요약을 만들어 주세요.
`;

    const summary = await model.call(prompt);

    return {
      success: true,
      summary,
      method: 'fallback_analysis'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Enhanced analysis failed',
      method: 'fallback_analysis'
    };
  }
}