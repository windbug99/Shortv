import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  extractVideoTranscript,
  preprocessTranscript,
  chunkTranscript,
} from "./transcriptExtractor";
import { smartVideoAnalysis } from "./smartVideoAnalyzer";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "",
);

export async function generateAISummary(
  title: string,
  description: string,
  type: "introduction" | "detailed",
  videoId?: string,
): Promise<string> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
        console.warn("No Gemini API key found, returning placeholder summary");
        return type === "introduction"
          ? "AI 요약 기능을 사용하려면 Gemini API 키가 필요합니다."
          : "# 핵심정리\n\nAI 요약 기능을 사용하려면 Gemini API 키가 필요합니다.";
      }

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
      });

      // Try to extract video transcript for better analysis
      let transcript = null;
      if (videoId) {
        // Method 1: Try regular transcript extraction first
        transcript = await extractVideoTranscript(videoId);
        if (transcript) {
          transcript = preprocessTranscript(transcript);
          console.log(`Using regular transcript for ${videoId}: ${transcript.length} characters`);
        } else {
          // Method 2: Smart video analysis with audio transcription fallback
          console.log(`Regular transcript failed for ${videoId}, attempting smart video analysis...`);
          try {
            const smartResult = await smartVideoAnalysis(videoId, title, description);
            if (smartResult.success) {
              if (smartResult.transcript) {
                transcript = preprocessTranscript(smartResult.transcript);
                console.log(`Using ${smartResult.method} transcript for ${videoId}: ${transcript.length} characters`);
              }
              
              // Use enhanced summary for detailed summaries
              if (smartResult.enhancedSummary && type === "detailed") {
                console.log(`Using ${smartResult.method} enhanced summary for ${videoId}`);
                return smartResult.enhancedSummary;
              }
              
              // For introduction summaries with enhanced content, modify the prompt
              if (smartResult.enhancedSummary && type === "introduction") {
                console.log(`Using enhanced content analysis for ${videoId} introduction`);
                // Continue to use enhanced content in the prompt below
              }
            } else {
              console.log(`Smart analysis failed for ${videoId}: ${smartResult.error || 'Unknown error'}`);
            }
          } catch (error) {
            console.log(`Smart analysis error for ${videoId}:`, error);
          }
        }
      }

      let prompt: string;

      if (type === "introduction") {
        const transcriptText = transcript
          ? `\n스크립트: ${transcript.substring(0, 4000)}${transcript.length > 4000 ? "..." : ""}`
          : "";

        prompt = `
다음 YouTube 영상의 제목과 스크립트를 기반으로 핵심주제를 정확히 88자 이상 98자 이하로 요약해 문어체로 작성해주세요.

제목: ${title}
설명: ${description}${transcriptText}

중요한 제약사항:
- 반드시 88자 이상 98자 이하여야 함 (공백 포함)
- 98자를 초과하면 안 됨 (절대적 제한)
- 문어체 사용 필수
- 가이드 문자는 출력하지 않음
- ${transcript ? "스크립트의 실제 내용을 반영하여" : ""} 핵심 내용만 간결하게 정리
- 응답 전 글자 수를 직접 세어서 확인할 것
- 98자를 초과하면 문장을 줄여서 다시 작성할 것

정확한 길이 예시:
88자: "이 영상은 YouTube 채널 구독과 AI 요약 기능을 통해 개인화된 비디오 피드를 제공하는 혁신적인 플랫폼의 사용법을 소개한다."
98자: "이 영상은 YouTube 채널 구독과 AI 요약 기능을 통해 개인화된 비디오 피드를 제공하는 혁신적인 플랫폼의 사용법과 주요 특징들을 상세히 소개하는 튜토리얼입니다."
`;
      } else {
        const transcriptChunks = transcript
          ? chunkTranscript(transcript, 6000)
          : [];
        const transcriptContent =
          transcriptChunks.length > 0 ? transcriptChunks[0] : transcript;

        const analysisBase = transcript
          ? "실제 스크립트를 바탕으로"
          : "제목과 설명을 바탕으로";
        const transcriptSection = transcript
          ? `\n영상 스크립트: ${transcriptContent}`
          : "";
        const contentRequirement = transcript
          ? "실제 스크립트 내용을 기반으로"
          : "";
        const specificContent = transcript
          ? "스크립트에서 언급된 구체적인 내용과 주요 포인트를 포함할 것"
          : "";

        prompt = `
다음 YouTube 영상의 전체 스크립트를 기반으로 시간의 흐름에 따라 체계적인 핵심정리를 작성해주세요.

영상 ID: ${videoId || "unknown"}
제목: ${title}
설명: ${description}${transcriptSection}

핵심정리 작성 원칙:
- 정확한 정보제공이 목적
- 전체 스크립트 기반으로 시간의 흐름대로 명확한 내용 정리
- 시간대로 주요주제를 도출하고 관련 내용을 요약
- 스크립트에서 언급된 핵심키워드, 구체적인 사실, 데이터, 예시를 정확히 반영
- 마크다운 형식 사용
- 한국어 문어체를 기본으로 필요시 볼드와 리스트 활용

필수사항(반드시 준수):
- 절대 스크립트에 없는 내용은 포함하지 않음
- 과도한 축약은 지양
- 가이드 텍스트, 타임스탬프는 출력하지 않음

출력 형식 (반드시 준수):
# 핵심정리

### 1. [첫 번째 주요주제]
- 해당주제에 관련된 내용 정리
- 단락 내 주요 포인트 요약

### 2. [두 번째 주요주제]
- 해당주제에 관련된 내용 정리
- 단락 내 주요 포인트 요약

### 3. [세 번째 주요주제]
(스크립트 길이에 따라 단락 수는 조정 가능)

## 핵심 결론
- 영상에서 전달하고자 하는 주요 메시지
- 시청자가 얻을 수 있는 주요 인사이트
`;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log(
        `AI summary generated successfully on attempt ${attempt} for video ${videoId || "unknown"}`,
      );
      return text.trim();
    } catch (error) {
      lastError = error as Error;
      console.error(
        `AI summary generation failed on attempt ${attempt}/${maxRetries} for video ${videoId || "unknown"}:`,
        error,
      );

      // If this was the last attempt, we'll fall through to the final error handling
      if (attempt === maxRetries) {
        break;
      }

      // Wait a bit before retrying (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s delays
      console.log(`Retrying AI summary generation in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we get here, all attempts failed
  console.error(
    `All ${maxRetries} attempts failed for AI summary generation. Last error:`,
    lastError,
  );
  return type === "introduction"
    ? "AI 요약을 생성하는 중 오류가 발생했습니다."
    : "# 핵심정리\n\nAI 요약을 생성하는 중 오류가 발생했습니다.";
}
