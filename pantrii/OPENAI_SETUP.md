# Google AI (Gemini) Setup for AI-Powered Ingredient Detection - FREE!

## 🔑 Getting Your Google AI API Key (FREE)

1. **Go to Google AI Studio**: https://aistudio.google.com/
2. **Sign in** with your Google account
3. **Click "Get API Key"** in the left sidebar
4. **Create API key** (no payment required!)
5. **Copy the key**

## 🔧 Adding to Your Project

1. **Open your `.env.local` file** (create it if it doesn't exist)
2. **Add your API key**:
   ```
   GOOGLE_AI_API_KEY=your-key-here
   ```
3. **Restart your development server**:
   ```bash
   npm run dev
   ```

## 💰 Cost Information

- **Cost**: FREE! (No payment required)
- **Rate limits**: 15 requests per minute (generous)
- **No credit card needed**: Unlike OpenAI

## 🎯 How It Works

1. **AI First**: Tries OpenAI to detect ingredients intelligently
2. **Fallback**: If AI fails, uses the existing regex detection
3. **Smart Detection**: AI understands context and filters out metadata
4. **Better Results**: Should handle complex recipes much better

## 🧪 Testing

1. **Upload a recipe** with the problematic ingredients
2. **Check the console** for "Using AI-detected ingredients" message
3. **Compare results** between AI and regex detection
4. **Use "View Raw Data"** to see what the AI is working with

## 🚨 Troubleshooting

- **No API key**: Falls back to regex detection automatically
- **API errors**: Logged to console, falls back to regex
- **Rate limits**: OpenAI has generous limits for this use case

The AI should significantly improve ingredient detection accuracy!
