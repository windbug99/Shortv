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
다음 YouTube 영상의 전체 스크립트를 기반으로 포괄적이고 체계적인 핵심정리를 작성해주세요.

영상 ID: ${videoId || 'unknown'}
제목: ${title}
설명: ${description}${transcriptSection}

핵심정리 작성 원칙:
- 전체 스크립트의 모든 주요 내용을 빠짐없이 포함
- 스크립트에서 언급된 구체적인 사실, 데이터, 예시를 정확히 반영
- 논리적 흐름에 따라 내용을 구조화하여 정리
- 영상의 핵심 메시지와 주요 포인트를 명확히 도출
- 마크다운 형식 사용, 필요시 볼드와 리스트 활용
- 타임스탬프나 시간 정보는 제외
- 한국어 문어체로 작성

출력 형식 (반드시 준수):
# 핵심정리

## 개요
영상의 전반적인 주제와 목적을 간략히 요약

## 주요 내용

### 1. [첫 번째 주요 주제]
- 스크립트에서 언급된 구체적 내용
- **핵심 포인트나 중요 데이터 강조**
- 관련 예시나 사례

### 2. [두 번째 주요 주제]
- 스크립트에서 언급된 구체적 내용
- **핵심 포인트나 중요 데이터 강조**
- 관련 예시나 사례

### 3. [세 번째 주요 주제]
(스크립트 내용에 따라 섹션 수는 조정 가능)

## 핵심 결론
- 영상에서 전달하고자 하는 주요 메시지
- 시청자가 얻을 수 있는 주요 인사이트
- 실용적 활용 방안이나 시사점
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
