import { GoogleGenAI } from '@google/genai';

export const askGemini = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    // The platform injects process.env.GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("Gemini API key not found. Please configure it in the settings.");
      throw new Error("Gemini API key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    
    return response.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const askGeminiVision = async (prompt: string, imageUrl: string): Promise<string> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Fetch image and convert to base64
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Failed to fetch image");
    const blob = await imageRes.blob();
    
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: blob.type,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });
    
    return response.text || '';
  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    throw error;
  }
};
