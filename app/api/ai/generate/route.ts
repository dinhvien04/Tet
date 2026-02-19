import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const client = new OpenAI({
  baseURL: 'https://ai.megallm.io/v1',
  apiKey: process.env.MEGALLM_API_KEY,
});

export async function POST(request: NextRequest) {
  console.log('🤖 AI Generate API called');
  
  try {
    const { type, recipientName, traits } = await request.json();
    
    console.log('📝 Request data:', { type, recipientName, traits });

    // Validate input
    if (!type || !recipientName || !traits) {
      return NextResponse.json(
        { error: 'Missing required fields: type, recipientName, traits' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['cau-doi', 'loi-chuc', 'thiep-tet'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: cau-doi, loi-chuc, thiep-tet' },
        { status: 400 }
      );
    }

    // Create prompts for different content types
    const prompts: Record<string, string> = {
      'cau-doi': `Hãy tạo MỘT câu đối Tết ngắn gọn cho ${recipientName}. Đặc điểm: ${traits}. Chỉ viết 2 câu đối xứng, mỗi câu 7-8 chữ.`,
      'loi-chuc': `Hãy viết lời chúc Tết ngắn gọn cho ${recipientName}. Đặc điểm: ${traits}. Chỉ 2-3 câu ngắn.`,
      'thiep-tet': `Hãy tạo nội dung thiệp Tết ngắn gọn cho ${recipientName}. Đặc điểm: ${traits}. Tối đa 4-5 câu.`
    };

    const model = process.env.MEGALLM_MODEL;
    
    if (!model) {
      console.error('❌ MEGALLM_MODEL not configured');
      return NextResponse.json(
        { error: 'MEGALLM_MODEL chưa được cấu hình trong .env' },
        { status: 500 }
      );
    }
    
    console.log('🚀 Calling MegaLLM API with model:', model);
    
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { 
          role: 'system', 
          content: 'Bạn là chuyên gia văn hóa Tết Việt Nam. Viết ngắn gọn, súc tích, dễ hiểu.' 
        },
        { 
          role: 'user', 
          content: prompts[type] 
        }
      ],
      temperature: 0.7,
      max_tokens: 150, // Giảm xuống 150 để ngắn hơn
    });

    console.log('✅ MegaLLM API response received');

    const content = response.choices[0]?.message?.content || '';

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('❌ AI generation error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    // Handle specific error types
    if (error.message?.includes('API key') || error.status === 401) {
      return NextResponse.json(
        { error: 'Cấu hình API key không hợp lệ' },
        { status: 500 }
      );
    }

    if (error.message?.includes('quota') || error.status === 429) {
      return NextResponse.json(
        { error: 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.' },
        { status: 429 }
      );
    }
    
    if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Request timeout. Vui lòng thử lại.' },
        { status: 504 }
      );
    }
    
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      return NextResponse.json(
        { error: 'Request bị hủy. Vui lòng thử lại.' },
        { status: 499 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Dịch vụ AI tạm thời gặp sự cố. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
