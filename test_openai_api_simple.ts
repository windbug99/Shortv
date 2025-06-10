import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testOpenAIAPI() {
  console.log('=== OpenAI API 연결 테스트 ===');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API 키가 설정되지 않았습니다.');
    return;
  }

  try {
    console.log('GPT-4o 모델 테스트 중...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: "안녕하세요. 간단한 응답을 해주세요."
        }
      ],
      max_tokens: 50,
      temperature: 0.3
    });

    console.log('GPT-4o 응답 성공:');
    console.log(response.choices[0].message.content);
    
    console.log('\n=== API 연결 정상 ===');
    console.log('OpenAI GPT-4o API가 정상적으로 작동합니다.');

  } catch (error) {
    console.error('OpenAI API 오류:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.log('\nAPI 키 문제일 수 있습니다. 올바른 OpenAI API 키가 설정되었는지 확인해주세요.');
      } else if (error.message.includes('quota')) {
        console.log('\nAPI 사용량 한도에 도달했을 수 있습니다.');
      } else if (error.message.includes('rate limit')) {
        console.log('\nAPI 호출 제한에 걸렸습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  }
}

testOpenAIAPI();