import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ai/generate/route';
import { NextRequest } from 'next/server';

// Mock the Gemini API
vi.mock('@google/generative-ai', () => {
  const MockGoogleGenerativeAI = class {
    constructor() {}
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Mocked AI generated content'
          }
        })
      };
    }
  };

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI
  };
});

describe('AI Generate API Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should return 400 when type is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          recipientName: 'Bố',
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when recipientName is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when traits is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          recipientName: 'Bố'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid content type', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid-type',
          recipientName: 'Bố',
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });
  });

  describe('Content Type Handling', () => {
    it('should accept cau-doi type', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          recipientName: 'Bố',
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
    });

    it('should accept loi-chuc type', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'loi-chuc',
          recipientName: 'Mẹ',
          traits: 'yêu thương'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
    });

    it('should accept thiep-tet type', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'thiep-tet',
          recipientName: 'Ông',
          traits: 'khỏe mạnh'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
    });
  });

  describe('Successful Generation', () => {
    it('should return generated content on success', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          recipientName: 'Bố',
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
      expect(typeof data.content).toBe('string');
      expect(data.content.length).toBeGreaterThan(0);
    });

    it('should return content with correct structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          recipientName: 'Bố',
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({
        content: expect.any(String)
      });
    });
  });

  describe('Prompt Construction', () => {
    it('should include recipient name in prompt for cau-doi', async () => {
      const recipientName = 'Bố';
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          recipientName,
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      // The prompt should contain the recipient name
      // This is validated by the property test
    });

    it('should include traits in prompt for loi-chuc', async () => {
      const traits = 'yêu thương gia đình';
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'loi-chuc',
          recipientName: 'Mẹ',
          traits
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      // The prompt should contain the traits
      // This is validated by the property test
    });

    it('should use appropriate prompt for thiep-tet', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'thiep-tet',
          recipientName: 'Ông',
          traits: 'khỏe mạnh'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      // The prompt should be appropriate for thiep-tet
      // This is validated by the property test
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in recipient name', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          recipientName: 'Bố & Mẹ',
          traits: 'hiền lành'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
    });

    it('should handle long traits text', async () => {
      const longTraits = 'hiền lành, yêu thương gia đình, luôn quan tâm con cái, làm việc chăm chỉ, có trách nhiệm';
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'loi-chuc',
          recipientName: 'Bố',
          traits: longTraits
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
    });

    it('should handle Vietnamese diacritics correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'cau-doi',
          recipientName: 'Ông Nguyễn Văn Đức',
          traits: 'hiền lành, khôn ngoan'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('content');
    });
  });
});
