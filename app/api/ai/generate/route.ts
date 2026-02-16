import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { type, recipientName, traits } = await request.json();

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
      'cau-doi': `Hãy tạo một câu đối Tết Nguyên Đán cho ${recipientName}. 
                Đặc điểm: ${traits}. 
                Câu đối phải có 2 câu đối xứng, ý nghĩa tốt đẹp, phù hợp văn hóa Việt Nam.`,
      'loi-chuc': `Hãy viết lời chúc Tết Nguyên Đán chân thành cho ${recipientName}. 
                 Đặc điểm: ${traits}. 
                 Lời chúc nên ấm áp, cá nhân hóa, độ dài 3-4 câu.`,
      'thiep-tet': `Hãy tạo nội dung thiệp Tết cho ${recipientName}. 
                  Đặc điểm: ${traits}. 
                  Bao gồm lời mở đầu, lời chúc chính, và lời kết.`
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompts[type]);
    const content = result.response.text();

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('AI generation error:', error);

    // Handle specific error types
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Cấu hình API key không hợp lệ' },
        { status: 500 }
      );
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Dịch vụ AI tạm thời gặp sự cố. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
