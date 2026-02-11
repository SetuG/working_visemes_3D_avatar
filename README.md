# AI Avatar Platform - Next.js Frontend

This is a Next.js frontend for an AI avatar platform with text-to-speech and lip-sync capabilities, similar to navtalk.

## Features

- **Text Input Area**: Users can type questions/messages
- **Avatar Display**: Dedicated window for AI avatar video/animation
- **Chat Interface**: Conversation history with user and AI messages
- **Voice Input**: Button for voice-to-text input (implementation pending)
- **Python Backend Ready**: Structure prepared for Python API integration

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```



## Python Backend Integration

### API Endpoint Structure

The frontend is ready to connect to a Python backend at `/api/text-to-speech`.

**Request Format:**
```json
{
  "text": "User's input text"
}
```

**Expected Response Format:**
```json
{
  "audioUrl": "URL to generated audio file",
  "visemes": [
    { "time": 0.0, "viseme": "sil" },
    { "time": 0.1, "viseme": "PP" }
  ],
  "text": "Original text"
}
```

### Connecting Your Python Backend

1. Create a `.env.local` file:
```bash
cp .env.local.example .env.local
```

2. Update the Python API URL in `.env.local`:
```
PYTHON_API_URL=http://localhost:5000/api/text-to-speech
```

3. Uncomment the Python backend connection code in `app/api/text-to-speech/route.ts`

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Next Steps

1. **Avatar Integration**: 
   - Add video player or 3D avatar renderer
   - Implement lip-sync using viseme data

2. **Python Backend**:
   - Connect text-to-speech model
   - Generate viseme data for lip-sync
   - Return audio files

3. **Voice Input**:
   - Implement Web Speech API for voice-to-text

4. **Enhanced Features**:
   - Real-time streaming
   - Multiple avatar options
   - Conversation history persistence



```bash
npm run build
npm start
```

## License

MIT
