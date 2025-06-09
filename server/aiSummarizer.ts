import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractVideoTranscript, preprocessTranscript, chunkTranscript } from "./transcriptExtractor";

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
      prompt = `
다음 YouTube 영상의 제목과 설명을 바탕으로 핵심주제를 정확히 88자 이상 98자 이하로 요약해 문어체로 작성해주세요.

제목: ${title}
설명: ${description}

중요한 제약사항:
- 반드시 88자 이상 98자 이하여야 함 (공백 포함)
- 98자를 초과하면 안 됨 (절대적 제한)
- 문어체 사용 필수
- 핵심 내용만 간결하게 정리
- 응답 전 글자 수를 직접 세어서 확인할 것

예시 길이 참고: "이 영상은 YouTube 채널 구독과 AI 요약 기능을 통해 개인화된 비디오 피드를 제공하는 혁신적인 플랫폼의 사용법과 주요 특징들을 상세히 소개하는 튜토리얼입니다." (98자)
`;
    } else {
      prompt = `
다음 YouTube 영상을 타임라인에 따라 핵심내용을 요약

제목: ${title}
설명: ${description}

요구사항:
- 영상 전체를 요약할 것
- 시간의 흐름에 따라 핵심내용을 도출할 것
- 마크다운 형식으로 작성하고 필요시 개조식, 볼드 활용
- 타임스탬프 생성 시 URL의 "?v=" 뒤에 videoID 값을 추가하여 "&t=" 123s 형식으로 작성
- 영상 URL 구조: https://www.youtube.com/watch?v=[videoID]
- 타임스탬프 구조: https://www.youtube.com/watch?v=[videoID]&t=[seconds]

출력 형식:
# 핵심정리

### 핵심내용 1

### 핵심내용 2

# 시사점
내용 요약
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
