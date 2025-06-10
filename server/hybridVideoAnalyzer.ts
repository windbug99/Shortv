import OpenAI from "openai";
import { extractVideoTranscript, preprocessTranscript } from "./transcriptExtractor";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface HybridAnalysisResult {
  success: boolean;
  transcript?: string;
  summary?: string;
  error?: string;
  method: 'youtube_transcript_gpt4o' | 'title_description_gpt4o' | 'error';
}

export async function analyzeVideoHybrid(videoId: string, title: string, description: string): Promise<HybridAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: 'OpenAI API key required',
      method: 'error'
    };
  }

  console.log(`Analyzing video with Hybrid approach (YouTube transcript + GPT-4o): ${videoId}`);

  try {
    // Step 1: Try to extract YouTube's official transcript
    let transcript = await extractVideoTranscript(videoId);
    let method: 'youtube_transcript_gpt4o' | 'title_description_gpt4o' = 'title_description_gpt4o';

    if (transcript) {
      transcript = preprocessTranscript(transcript);
      method = 'youtube_transcript_gpt4o';
      console.log(`Using YouTube transcript for ${videoId}: ${transcript.length} characters`);
    } else {
      console.log(`No transcript available for ${videoId}, using title and description with GPT-4o`);
    }

    // Step 2: Generate enhanced summary with GPT-4o
    const summary = await generateEnhancedSummaryWithGPT4o(transcript, title, description);

    return {
      success: true,
      transcript: transcript ? transcript : undefined,
      summary,
      method
    };

  } catch (error) {
    console.error('Hybrid video analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'error'
    };
  }
}

async function generateEnhancedSummaryWithGPT4o(transcript: string | null, title: string, description: string): Promise<string> {
  try {
    const hasTranscript = !!transcript;
    const contentSource = hasTranscript 
      ? `전사본: ${transcript!.substring(0, 6000)}${transcript!.length > 6000 ? "..." : ""}`
      : `제목: ${title}\n설명: ${description}`;

    const analysisType = hasTranscript ? "전사본 기반 분석" : "제목/설명 기반 분석";
    const contentConstraint = hasTranscript 
      ? "전사본의 실제 내용만" 
      : "제목과 설명의 내용만";
    const avoidanceRule = hasTranscript 
      ? "전사본에 없는 내용은 언급하지 않음" 
      : "제목과 설명에 없는 내용은 언급하지 않음";

    const prompt = `
다음 YouTube 영상을 분석해서 한국어로 요약해주세요:

${contentSource}

분석 유형: ${analysisType}

출력 형식:
첫 줄: "${hasTranscript ? "스크립트 있음" : "스크립트 없음"}"

# 핵심정리

### 1. 주요 주제
- ${hasTranscript ? "전사본에서" : "제목과 설명에서"} 언급된 핵심 내용

### 2. 세부 분석
- 구체적인 내용과 중요 포인트

### 3. 실용적 정보
- 시청자에게 유용한 정보나 인사이트

## 핵심 결론
- ${hasTranscript ? "영상" : "제목과 설명"}에서 전달하는 주요 메시지

중요한 제약사항:
- ${contentConstraint} 사용
- 외부 정보나 추측 내용 절대 포함 금지
- ${avoidanceRule}
- 구체적이고 실용적인 내용 위주
- 전체 길이: 300-500자 목표
- 한국어 문어체 사용
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 YouTube 영상 분석 전문가입니다. 주어진 정보를 바탕으로 정확하고 유용한 한국어 요약을 작성합니다. 외부 정보를 추가하지 않고 오직 제공된 내용만을 사용합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.2
    });

    const summary = response.choices[0].message.content || "요약 생성 실패";
    console.log(`GPT-4o summary generated: ${summary.length} characters`);
    return summary;

  } catch (error) {
    console.error('GPT-4o enhanced summary error:', error);
    const hasTranscript = !!transcript;
    return hasTranscript 
      ? "스크립트 있음\n\n# 핵심정리\n\nGPT-4o 요약 생성 중 오류가 발생했습니다."
      : "스크립트 없음\n\n# 핵심정리\n\nGPT-4o 요약 생성 중 오류가 발생했습니다.";
  }
}

// Function to integrate with existing AI summarizer
export async function generateGPT4oSummary(
  title: string,
  description: string,
  type: "introduction" | "detailed",
  videoId?: string,
): Promise<string> {
  if (!videoId) {
    return type === "introduction"
      ? "AI 요약 기능을 사용하려면 비디오 ID가 필요합니다."
      : "# 핵심정리\n\nAI 요약 기능을 사용하려면 비디오 ID가 필요합니다.";
  }

  try {
    const result = await analyzeVideoHybrid(videoId, title, description);
    
    if (!result.success || !result.summary) {
      return type === "introduction"
        ? "GPT-4o 요약 생성에 실패했습니다."
        : "# 핵심정리\n\nGPT-4o 요약 생성에 실패했습니다.";
    }

    if (type === "introduction") {
      // Extract first line (script status) and create brief summary
      const lines = result.summary.split('\n');
      const scriptStatus = lines[0];
      const content = result.summary.replace(/^[^\n]*\n/, '').replace(/#+\s*/g, '').replace(/###?\s*/g, '');
      const briefContent = content.substring(0, 120).replace(/\n/g, ' ').trim();
      
      return `${scriptStatus}\n${briefContent}`;
    }

    return result.summary;

  } catch (error) {
    console.error('GPT-4o summary integration error:', error);
    return type === "introduction"
      ? "GPT-4o 요약 생성 중 오류가 발생했습니다."
      : "# 핵심정리\n\nGPT-4o 요약 생성 중 오류가 발생했습니다.";
  }
}