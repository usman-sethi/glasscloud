export const askMistral = async (prompt: string, systemPrompt?: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
  if (!apiKey) {
    console.warn("Mistral API key not found.");
    throw new Error("Mistral API key is missing.");
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages
      })
    });
    
    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const errorData = await res.json();
        if (errorData.message) {
          errorMsg = errorData.message;
        } else {
          errorMsg = JSON.stringify(errorData);
        }
      } catch (e) {
        // Ignore JSON parse error
      }
      throw new Error(`Mistral API error: ${res.status} ${errorMsg}`);
    }
    
    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Mistral API Error:", error);
    throw error;
  }
};
