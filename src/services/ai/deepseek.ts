export const askDeepSeek = async (prompt: string, systemPrompt?: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn("DeepSeek API key not found.");
    throw new Error("DeepSeek API key is missing.");
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages
      })
    });
    
    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const errorData = await res.json();
        if (errorData.error && errorData.error.message) {
          errorMsg = errorData.error.message;
        } else {
          errorMsg = JSON.stringify(errorData);
        }
      } catch (e) {
        // Ignore JSON parse error
      }
      throw new Error(`DeepSeek API error: ${res.status} ${errorMsg}`);
    }
    
    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("DeepSeek API Error:", error);
    throw error;
  }
};
