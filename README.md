# AI Avatar Platform 



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

### Connecting Python Backend

1. Create a `.env.local` file:
```bash
cp .env.local.example .env.local
```

2. Update the Python API URL in `.env.local`:
```
PYTHON_API_URL=http://localhost:5000/api/text-to-speech
```




