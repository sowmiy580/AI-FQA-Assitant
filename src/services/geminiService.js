const { GoogleGenAI } = require('@google/genai');

// Initialize the GoogleGenAI client
// If the key is not found, we will log a warning, but won't crash until a request is made.
const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.');
  }
  if (/^Bearer\s/i.test(apiKey) || /^ya29\./i.test(apiKey)) {
    throw new Error('GEMINI_API_KEY contains an OAuth access token. Use an API key created in Google AI Studio instead; do not include a Bearer prefix.');
  }
  return new GoogleGenAI({ apiKey });
};

const getGeminiErrorMessage = (error) => {
  const message = error?.message || String(error);
  if (/ACCESS_TOKEN_TYPE_UNSUPPORTED|UNAUTHENTICATED|\b401\b/i.test(message)) {
    return 'Google rejected GEMINI_API_KEY. Replace it with a valid API key from Google AI Studio (not an OAuth token), then restart the server.';
  }
  return message;
};

/**
 * Generates a concise answer for a user's question.
 * @param {string} question 
 * @returns {Promise<string>}
 */
const generateAnswer = async (question) => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful assistant. Provide a clear, concise, and direct answer to the following question. Do not include introductory text like "Sure, here is the answer" or markdown formatting. Just return the answer itself.

Question: ${question}`,
    });

    if (!response || !response.text) {
      throw new Error('No response text received from Gemini API');
    }

    return response.text.trim();
  } catch (error) {
    console.error('Error in geminiService.generateAnswer:', error);
    throw new Error(`AI Answer Generation failed: ${getGeminiErrorMessage(error)}`);
  }
};

/**
 * Generates a single FAQ question and answer pair for a topic.
 * @param {string} topic 
 * @returns {Promise<{question: string, answer: string}>}
 */
const generateFAQ = async (topic) => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a single frequently asked question (FAQ) and its comprehensive answer regarding the topic: "${topic}".`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            question: { 
              type: 'STRING', 
              description: 'A clear, common question that a user would ask about the topic.' 
            },
            answer: { 
              type: 'STRING', 
              description: 'A detailed, helpful, and accurate answer explaining the question.' 
            }
          },
          required: ['question', 'answer'],
        },
      },
    });

    if (!response || !response.text) {
      throw new Error('No response received from Gemini API');
    }

    // Parse the structured JSON response
    const faqPair = JSON.parse(response.text);
    return faqPair;
  } catch (error) {
    console.error('Error in geminiService.generateFAQ:', error);
    throw new Error(`AI FAQ Generation failed: ${getGeminiErrorMessage(error)}`);
  }
};

module.exports = {
  generateAnswer,
  generateFAQ,
};
