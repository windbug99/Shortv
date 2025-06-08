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
다음 YouTube 영상내용을 기반으로 핵심주제 중심으로 마크다운 형식으로 구조화된 요약을 작성해주세요.

제목: ${title}
설명: ${description}

요구사항:
- 마크다운 문법을 적극 활용 (헤딩, 불릿 포인트, 볼드, 이탤릭 등)
- 핵심내용을 중심으로 구조화된 요약
- 주요 섹션별로 명확하게 구분
- 실용적이고 이해하기 쉬운 내용
- 중요한 키워드는 **볼드** 처리
- 강조할 부분은 *이탤릭* 처리

출력 형식:
# 📋 핵심정리

## 🎯 핵심 주제
**주요 키워드**: 내용 요약

## 📌 주요 내용

### 1️⃣ 첫 번째 핵심 사항
- **주요 포인트**: 세부 설명
- **중요 정보**: 관련 내용
- *참고사항*: 추가 정보

### 2️⃣ 두 번째 핵심 사항  
- **주요 포인트**: 세부 설명
- **중요 정보**: 관련 내용

### 3️⃣ 세 번째 핵심 사항
- **주요 포인트**: 세부 설명
- **중요 정보**: 관련 내용

## 💡 핵심 인사이트
> **요약**: 영상의 가장 중요한 메시지나 결론

## 🔍 추가 고려사항
- 실무 적용 방법
- 관련 트렌드나 배경
- 향후 전망이나 시사점
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
