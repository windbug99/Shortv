import OpenAI from "openai";
import fs from 'fs';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testWhisperGPT4oSimple() {
  console.log('=== Whisper + GPT-4o 간단 테스트 ===');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API 키가 필요합니다.');
    return;
  }

  // Create a simple test audio file using text-to-speech
  console.log('테스트 오디오 생성 중...');
  
  try {
    // Generate test audio using OpenAI TTS
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: "안녕하세요. 이것은 OpenAI Whisper와 GPT-4o를 테스트하기 위한 샘플 오디오입니다. 인공지능 기술의 발전으로 음성 인식과 텍스트 요약이 매우 정확해졌습니다. 이 테스트를 통해 한국어 음성 처리 능력을 확인할 수 있습니다.",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    const audioPath = './temp/test_audio.mp3';
    
    // Ensure temp directory exists
    if (!fs.existsSync('./temp')) {
      fs.mkdirSync('./temp', { recursive: true });
    }
    
    fs.writeFileSync(audioPath, buffer);
    console.log('테스트 오디오 생성 완료');

    // Test Whisper transcription
    console.log('Whisper 전사 시작...');
    const audioFile = fs.createReadStream(audioPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ko",
      response_format: "text"
    });

    console.log('');
    console.log('=== Whisper 전사 결과 ===');
    console.log(`전사본 길이: ${transcription.length}자`);
    console.log('전사본 내용:');
    console.log(transcription);

    // Test GPT-4o summarization
    console.log('');
    console.log('GPT-4o 요약 생성 중...');
    
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 YouTube 영상 요약 전문가입니다. 주어진 전사본을 바탕으로 정확하고 유용한 요약을 작성합니다."
        },
        {
          role: "user",
          content: `
다음 전사본을 바탕으로 요약해주세요:

제목: OpenAI Whisper + GPT-4o 테스트
설명: 음성 인식과 텍스트 요약 기능 테스트
전사본: ${transcription}

형식:
첫 줄: "스크립트 있음"

# 핵심정리

### 1. 주요 내용
- 전사본에서 언급된 핵심 내용

### 2. 기술적 특징
- 언급된 기술적 요소들

## 핵심 결론
- 전사본의 주요 메시지

중요한 제약사항:
- 전사본의 실제 내용만 사용
- 외부 정보나 추측 내용 절대 포함 금지
- 전사본에 없는 내용은 언급하지 않음
`
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    console.log('');
    console.log('=== GPT-4o 요약 결과 ===');
    console.log(summaryResponse.choices[0].message.content);

    // Clean up
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    console.log('');
    console.log('=== 테스트 완료 ===');
    console.log('Whisper와 GPT-4o가 정상적으로 작동합니다.');

  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testWhisperGPT4oSimple();