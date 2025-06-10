import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  extractVideoTranscript,
  preprocessTranscript,
  chunkTranscript,
} from "./transcriptExtractor";

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
        model: "gemini-2.5-flash-preview-05-20",
      });

      // Try to extract video transcript for better analysis
      let transcript = null;
      if (videoId) {
        // Method 1: Try regular transcript extraction first
        transcript = await extractVideoTranscript(videoId);
        if (transcript) {
          transcript = preprocessTranscript(transcript);
          console.log(
            `Using regular transcript for ${videoId}: ${transcript.length} characters`,
          );
        } else {
          console.log(
            `No transcript available for ${videoId}, proceeding with title and description only`,
          );
        }
      }

      let prompt: string;

      if (type === "introduction") {
        const transcriptText = transcript
          ? `\n스크립트: ${transcript.substring(0, 4000)}${transcript.length > 4000 ? "..." : ""}`
          : "";

        prompt = `
다음과 같이 요약해주세요:

제목: ${title}
설명: ${description}${transcriptText}

형식:
첫 줄: "${transcript ? "스크립트 있음" : "스크립트 없음"}"
둘째 줄부터: 88자 이상 98자 이하 요약 내용

중요한 제약사항:
- 첫 줄에 반드시 스크립트 상태 명시
- 요약은 88자 이상 98자 이하 (공백 포함)
- ${transcript ? "스크립트의 실제 내용만" : "제목과 설명의 내용만"} 사용
- 외부 정보나 추측 내용 절대 포함 금지
- 문어체 사용
- ${transcript ? "스크립트에 없는 내용은 언급하지 않음" : "제목과 설명에 없는 내용은 언급하지 않음"}
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
다음과 같이 요약해주세요:

제목: ${title}
설명: ${description}${transcriptSection}

형식:
첫 줄: "${transcript ? "스크립트 있음" : "스크립트 없음"}"

# 핵심정리

### 1. 섹션 제목
- 세부내용

### 2. 섹션 제목  
- 세부내용

## 핵심 결론
- 전체적인 결론

중요한 제약사항:
- 첫 줄에 반드시 스크립트 상태 명시
- ${transcript ? "스크립트의 실제 내용만" : "제목과 설명의 내용만"} 사용
- 외부 정보나 추측 내용 절대 포함 금지
- ${transcript ? "스크립트에 없는 내용은 언급하지 않음" : "제목과 설명에 없는 내용은 언급하지 않음"}
- 구체적이고 실용적인 내용 포함
- 전체 요약 길이: 300-500자

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

      // Return the text as is (스크립트 상태는 이미 프롬프트에서 포함됨)
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
