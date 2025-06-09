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
      transcript = await extractVideoTranscript(videoId);
      if (transcript) {
        transcript = preprocessTranscript(transcript);
      }
    }

    let prompt: string;

    if (type === "introduction") {
      const transcriptText = transcript ? `\n스크립트: ${transcript.substring(0, 4000)}${transcript.length > 4000 ? "..." : ""}` : "";
      
      prompt = `
다음 YouTube 영상의 제목과 스크립트를 기반으로 핵심주제를 정확히 88자 이상 98자 이하로 요약해 문어체로 작성해주세요.

제목: ${title}
설명: ${description}${transcriptText}

중요한 제약사항:
- 반드시 88자 이상 98자 이하여야 함 (공백 포함)
- 98자를 초과하면 안 됨 (절대적 제한)
- 문어체 사용 필수
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

      const analysisBase = transcript ? "실제 스크립트를 바탕으로" : "제목과 설명을 바탕으로";
      const transcriptSection = transcript ? `\n영상 스크립트: ${transcriptContent}` : '';
      const contentRequirement = transcript ? '실제 스크립트 내용을 기반으로' : '';
      const specificContent = transcript ? '스크립트에서 언급된 구체적인 내용과 주요 포인트를 포함할 것' : '';
      
      prompt = `
다음 YouTube 영상을 ${analysisBase} 체계적으로 내용을 요약정리

영상 ID: ${videoId || 'unknown'}
제목: ${title}
설명: ${description}${transcriptSection}

중요한 요구사항:
- ${contentRequirement} 영상 전체를 체계적으로 요약할 것
- 핵심내용을 논리적 순서로 도출할 것
- ${specificContent}
- 마크다운 형식으로 작성하고 필요시 개조식, 볼드 활용
- 타임스탬프나 시간 정보는 포함하지 않음

출력 형식 (반드시 준수):
# 핵심정리

### 주요 내용 1
- 핵심 요약
- **중요 포인트 강조**

### 주요 내용 2
- 핵심 요약
- **중요 포인트 강조**

### 시사점
스크립트 분석을 통한 핵심 메시지와 의미
`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return type === "introduction"
      ? "AI 요약을 생성하는 중 오류가 발생했습니다."
      : "# 핵심정리\n\nAI 요약을 생성하는 중 오류가 발생했습니다.";
  }
}
