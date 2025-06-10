import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "",
);

export interface VideoAnalysisResult {
  success: boolean;
  summary?: string;
  error?: string;
  method: 'video_analysis' | 'error';
}

export async function analyzeVideoWithGemini(videoId: string, title: string, description: string): Promise<VideoAnalysisResult> {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    return {
      success: false,
      error: 'Gemini API key required',
      method: 'error'
    };
  }

  console.log(`Analyzing video thumbnail with Gemini vision: ${videoId}`);

  try {
    // Use YouTube thumbnail for analysis
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // Analyze thumbnail with Gemini Vision
    const summary = await analyzeThumbnailWithGemini(thumbnailUrl, title, description);

    return {
      success: true,
      summary,
      method: 'video_analysis'
    };

  } catch (error) {
    console.error('Video analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'error'
    };
  }
}

async function analyzeThumbnailWithGemini(thumbnailUrl: string, title: string, description: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  // Fetch thumbnail image
  const imageResponse = await fetch(thumbnailUrl);
  if (!imageResponse.ok) {
    throw new Error('Failed to fetch thumbnail');
  }
  
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageData = Buffer.from(imageBuffer).toString('base64');

  const imagePart = {
    inlineData: {
      data: imageData,
      mimeType: 'image/jpeg'
    }
  };

  const prompt = `
다음 YouTube 영상의 썸네일을 분석해서 요약해주세요:

제목: ${title}
설명: ${description}

형식:
첫 줄: "영상 분석"

# 핵심정리

### 1. 시각적 내용 분석
- 썸네일에서 보이는 주요 내용

### 2. 화면 구성 및 요소
- 텍스트, 그래프, 이미지 등 시각적 요소

## 핵심 결론
- 썸네일과 제목을 통해 예상되는 영상 내용

중요한 제약사항:
- 썸네일에서 실제로 보이는 내용만 분석
- 추측이나 외부 정보 포함 금지
- 화면에 없는 내용은 언급하지 않음
- 시각적으로 확인 가능한 정보만 포함
`;

  const result = await model.generateContent([prompt, imagePart]);
  const aiResponse = await result.response;
  return aiResponse.text();
}