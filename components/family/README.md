# Family Management Module

This module handles the creation and management of family spaces in Tết Connect.

## Components

### CreateFamilyForm

A form component for creating a new family space.

**Features:**
- Input validation (required, trimmed)
- Loading states during submission
- Error handling and display
- Automatic redirect to dashboard on success

**Usage:**
```tsx
import { CreateFamilyForm } from '@/components/family'

<CreateFamilyForm />
```

## API Routes

### POST /api/families

Creates a new family space.

**Request Body:**
```json
{
  "name": "Gia đình Nguyễn"
}
```

**Response (Success):**
```json
{
  "success": true,
  "family": {
    "id": "uuid",
    "name": "Gia đình Nguyễn",
    "invite_code": "ABC12345",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "Error message"
}
```

**Features:**
- Generates unique 8-character invite code (A-Z, 0-9)
- Automatically adds creator as admin
- Validates input (non-empty, trimmed)
- Requires authentication
- Handles duplicate invite codes with retry logic

## Pages

### /family/create

Page for creating a new family space.

**Features:**
- Protected route (requires authentication)
- Responsive design
- User-friendly interface

## Tests

### Unit Tests
- `tests/create-family.test.tsx` - CreateFamilyForm component tests
- `tests/families-api.test.ts` - API route tests

### Integration Tests
- `tests/create-family-integration.test.tsx` - Full flow tests

**Test Coverage:**
- Form validation
- API integration
- Error handling
- Loading states
- Redirect behavior

## Requirements Validated

This implementation validates the following requirements from the spec:

- **Requirement 2.2**: User can create a new family by entering a name
- **Requirement 2.3**: System generates unique invite code
- **Requirement 2.4**: Creator is automatically set as admin

## Implementation Details

### Invite Code Generation
- 8 characters long
- Uses uppercase letters (A-Z) and numbers (0-9)
- Uniqueness guaranteed with retry logic (max 10 attempts)

### Database Operations
1. Generate unique invite code
2. Create family record
3. Add creator to family_members with 'admin' role
4. Rollback family creation if member addition fails

### Security
- Requires authentication (checks session)
- Validates all inputs
- Uses Row Level Security (RLS) policies
- Trims whitespace from inputs
