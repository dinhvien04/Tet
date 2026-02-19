/**
 * Script để test MegaLLM API
 * Chạy: node scripts/test-megallm-api.js
 */

const OpenAI = require('openai').default;
require('dotenv').config({ path: '.env.local' });

const client = new OpenAI({
  baseURL: 'https://ai.megallm.io/v1',
  apiKey: process.env.MEGALLM_API_KEY,
});

async function testAPI() {
  console.log('🧪 Testing MegaLLM API...\n');
  
  // Check environment variables
  console.log('📋 Configuration:');
  console.log(`   API Key: ${process.env.MEGALLM_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   Model: ${process.env.MEGALLM_MODEL || '✗ Not set'}\n`);
  
  if (!process.env.MEGALLM_API_KEY) {
    console.error('❌ MEGALLM_API_KEY is not set in .env.local');
    process.exit(1);
  }
  
  if (!process.env.MEGALLM_MODEL) {
    console.error('❌ MEGALLM_MODEL is not set in .env.local');
    process.exit(1);
  }
  
  try {
    console.log('🚀 Sending test request...');
    
    const response = await client.chat.completions.create({
      model: process.env.MEGALLM_MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'Bạn là một chuyên gia về văn hóa Tết Việt Nam.' 
        },
        { 
          role: 'user', 
          content: 'Hãy tạo một câu đối Tết ngắn gọn cho gia đình.' 
        }
      ],
      temperature: 0.8,
      max_tokens: 200,
    });
    
    console.log('\n✅ API Response Success!\n');
    console.log('📝 Generated Content:');
    console.log('─'.repeat(50));
    console.log(response.choices[0]?.message?.content || 'No content');
    console.log('─'.repeat(50));
    console.log('\n📊 Response Details:');
    console.log(`   Model: ${response.model}`);
    console.log(`   Tokens: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`   Finish Reason: ${response.choices[0]?.finish_reason || 'N/A'}`);
    
  } catch (error) {
    console.error('\n❌ API Error:\n');
    
    if (error.status) {
      console.error(`   Status: ${error.status}`);
      console.error(`   Type: ${error.type || 'Unknown'}`);
      console.error(`   Code: ${error.code || 'Unknown'}`);
      console.error(`   Message: ${error.message}`);
      
      if (error.status === 403) {
        console.error('\n💡 Suggestion:');
        console.error('   Your tier does not have access to this model.');
        console.error('   Try changing MEGALLM_MODEL in .env.local to:');
        console.error('   - gpt-3.5-turbo (usually free)');
        console.error('   - Check MegaLLM dashboard for available models');
      }
      
      if (error.status === 401) {
        console.error('\n💡 Suggestion:');
        console.error('   Invalid API key. Check MEGALLM_API_KEY in .env.local');
      }
    } else {
      console.error(`   ${error.message}`);
    }
    
    process.exit(1);
  }
}

testAPI();
