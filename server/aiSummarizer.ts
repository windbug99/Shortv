import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "",
);

export async function generateAISummary(
  title: string,
  description: string,
  type: "introduction" | "detailed",
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
      console.warn("No Gemini API key found, returning placeholder summary");
      return type === "introduction"
        ? "AI 요약 기능을 사용하려면 Gemini API 키가 필요합니다."
        : "# 핵심정리\n\nAI 요약 기능을 사용하려면 Gemini API 키가 필요합니다.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    let prompt: string;

    if (type === "introduction") {
      prompt = `
다음 YouTube 영상의 제목과 설명을 바탕으로 핵심주제를 88자 이상 98자 이하로 요약해 문어체로 작성해주세요.

제목: ${title}
설명: ${description}

요구사항:
- 88자 이상 98자 이하
- 문어체 사용
- 핵심 내용만 간결하게 정리
`;
    } else {
      prompt = `
다음 YouTube 영상내용을 기반으로 핵심주제 중심으로 요약하고 개조식을 충분히 활용해주세요.

제목: ${title}
설명: ${description}

요구사항:
- 핵심내용을 중심으로 구조화된 요약
- 개조식(불릿 포인트) 활용
- 마크다운 형식으로 작성
- 주요 섹션별로 구분
- 실용적이고 이해하기 쉬운 내용
- 주요 내용 항목에 시작시간 타임스탬프를 대괄호([])로 묶어 출력하고 링크 연결(videoURL&t=시작시간s)

출력 형식:
# 핵심정리

## 주요 내용 1
- 요점 1
- 요점 2
- 요점 3

## 주요 내용 2
- 요점 1
- 요점 2

## 핵심 시사점
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
