export const askHuggingFaceVision = async (imageUrl: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn("HuggingFace API key not found.");
    throw new Error("HuggingFace API key is missing.");
  }

  try {
    // Fetch image as blob
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Failed to fetch image");
    const blob = await imageRes.blob();

    const res = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream"
      },
      body: blob
    });
    
    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const errorData = await res.json();
        if (errorData.error) {
          errorMsg = errorData.error;
        } else {
          errorMsg = JSON.stringify(errorData);
        }
      } catch (e) {
        // Ignore JSON parse error
      }
      throw new Error(`HuggingFace API error: ${res.status} ${errorMsg}`);
    }
    
    const data = await res.json();
    return data[0]?.generated_text || "";
  } catch (error) {
    console.error("HuggingFace API Error:", error);
    throw error;
  }
};
