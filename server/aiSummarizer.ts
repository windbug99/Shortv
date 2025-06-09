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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
    });

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
다음 YouTube 영상내용 전체를 타임라인에 따라 핵심내용을 요약

제목: ${title}
설명: ${description}

요구사항:
- 타임라인에 따라 핵심내용 중심으로 요약
- 필요시 개조식(불릿 포인트) 활용
- 마크다운 형식으로 작성

출력 형식:
# 핵심정리

### 핵심내용 1

### 핵심내용 2

### 시사점
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
