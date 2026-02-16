# AI Content Generation Components

This directory contains components for AI-powered content generation using Gemini API.

## Components

### AIContentForm
Form component for generating Vietnamese Tet content (couplets, wishes, cards) using AI.

**Features:**
- Three content types: Câu đối (couplets), Lời chúc (wishes), Thiệp Tết (cards)
- Input validation
- Loading states
- Error handling with retry
- 30-second timeout
- Generated content preview

**Usage:**
```tsx
import { AIContentForm } from '@/components/ai';

<AIContentForm 
  onContentGenerated={(content, type) => {
    // Handle generated content
  }}
/>
```

**Props:**
- `onContentGenerated?: (content: string, type: ContentType) => void` - Callback when content is generated

**Requirements:**
- Validates: Requirements 4.1, 4.2, 4.4
