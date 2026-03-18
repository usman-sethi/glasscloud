import { askGemini, askGeminiVision } from './gemini';
import { extractFileContent } from '../contentExtractor';
import { FileItem } from '../../types';

export const AIRouter = {
  // 1. Ask Your Drive
  askAssistant: async (query: string, files: FileItem[]): Promise<string> => {
    const fileContext = files.map(f => `${f.name} (${f.type}) - Tags: ${f.tags?.join(', ') || 'none'} - Summary: ${f.summary || 'none'} - Keywords: ${f.keywords?.join(', ') || 'none'}`).join('\n');
    const prompt = `User query: ${query}\n\nFiles in drive:\n${fileContext}\n\nAnswer the user's query based on the files. Be concise and helpful.`;
    try {
      return await askGemini(prompt, "You are GlassCloud AI, a helpful assistant for a cloud storage drive.");
    } catch (e) {
      console.warn("Gemini failed", e);
      return "I'm sorry, I couldn't process that request at the moment.";
    }
  },

  // 2. AI File Summary
  generateSummary: async (file: FileItem, content?: string): Promise<{ summary: string, keyPoints: string[], keywords: string[], contentPreview: string }> => {
    let extractedText = content;
    if (!extractedText && file.url) {
      extractedText = await extractFileContent(file.url, file.name, file.size);
    }
    
    // For images, we might just get a placeholder, so we could use Gemini Vision
    if (extractedText === "[IMAGE CONTENT - Use Vision Model]" && file.url) {
      try {
        extractedText = await askGeminiVision("Describe this image in detail.", file.url);
      } catch (e) {
        console.warn("Gemini Vision failed", e);
        extractedText = "An image file.";
      }
    }

    const contentPreview = extractedText ? extractedText.substring(0, 500) : "";
    const prompt = `Summarize this file: ${file.name}.\nContent/Metadata: ${extractedText || file.type}\nProvide a short summary, key points, and important keywords in JSON format: { "summary": "...", "keyPoints": ["..."], "keywords": ["..."] }`;
    
    try {
      const res = await askGemini(prompt);
      const match = res.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { ...parsed, contentPreview };
      }
      throw new Error("Invalid JSON");
    } catch (e) {
      console.warn("Gemini failed", e);
      return { summary: "Could not generate summary.", keyPoints: [], keywords: [], contentPreview };
    }
  },

  // 3. AI Smart File Tags
  generateTags: async (file: FileItem, content?: string): Promise<string[]> => {
    let extractedText = content;
    if (!extractedText && file.url) {
      extractedText = await extractFileContent(file.url, file.name, file.size);
    }
    
    const prompt = `Generate 3-5 relevant tags for a file named "${file.name}" of type "${file.type}".\nContent: ${extractedText ? extractedText.substring(0, 1000) : 'N/A'}\nReturn ONLY a comma-separated list of tags in lowercase.`;
    try {
      const res = await askGemini(prompt);
      return res.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    } catch (e) {
      console.warn("Gemini failed", e);
      return ['document'];
    }
  },

  // 4. AI File Explanation
  explainFile: async (file: FileItem, content?: string): Promise<string> => {
    let extractedText = content;
    if (!extractedText && file.url) {
      extractedText = await extractFileContent(file.url, file.name, file.size);
    }
    
    const prompt = `Explain what a file named "${file.name}" of type "${file.type}" likely contains in a short, human-readable paragraph.\nContent: ${extractedText ? extractedText.substring(0, 2000) : 'N/A'}`;
    try {
      return await askGemini(prompt);
    } catch (e) {
      console.warn("Gemini failed", e);
      return "Could not explain this file.";
    }
  },

  // 5. Ask AI About This File
  askAboutFile: async (file: FileItem, query: string, content?: string): Promise<string> => {
    let extractedText = content;
    if (!extractedText && file.url) {
      extractedText = await extractFileContent(file.url, file.name, file.size);
    }
    
    if (extractedText === "[IMAGE CONTENT - Use Vision Model]" && file.url) {
      try {
        extractedText = await askGeminiVision("Describe this image in detail.", file.url);
      } catch (e) {
        console.warn("Gemini Vision failed", e);
        extractedText = "An image file.";
      }
    }

    const prompt = `You are answering a question about a file named "${file.name}" (type: ${file.type}).\n\nFile Content:\n${extractedText ? extractedText.substring(0, 15000) : 'Content not available.'}\n\nUser Question: ${query}\n\nAnswer the question based on the file content.`;
    
    try {
      return await askGemini(prompt, "You are a helpful AI assistant analyzing a file for the user.");
    } catch (e) {
      console.warn("Gemini failed", e);
      return "I'm sorry, I couldn't analyze the file at this moment.";
    }
  },

  // 6. AI Image Recognition
  analyzeImage: async (file: FileItem): Promise<string[]> => {
    if (!file.url || file.type !== 'image') return [];
    try {
      const caption = await askGeminiVision("Generate a comma-separated list of 5-10 descriptive keywords for this image.", file.url);
      return caption.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    } catch (e) {
      console.warn("Gemini Vision failed", e);
      return ['image'];
    }
  },

  // 7. AI Smart Search
  smartSearch: async (query: string, files: FileItem[]): Promise<string[]> => {
    const fileContext = JSON.stringify(files.map(f => ({ id: f.id, name: f.name, type: f.type, tags: f.tags })));
    const prompt = `User query: "${query}"\nFiles: ${fileContext}\nReturn a JSON array of file IDs that best match the query. ONLY return the JSON array, nothing else.`;
    try {
      const res = await askGemini(prompt);
      const match = res.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      return [];
    } catch (e) {
      console.warn("Gemini smart search failed", e);
      return [];
    }
  },

  // 8. AI Folder Organizer
  suggestFolders: async (files: FileItem[]): Promise<string[]> => {
    const fileNames = files.map(f => f.name).join('\n');
    const prompt = `Analyze these filenames and suggest 3-5 folder categories to organize them. Return ONLY a comma-separated list of folder names.\n\nFilenames:\n${fileNames}`;
    try {
      const res = await askGemini(prompt);
      return res.split(',').map(f => f.trim()).filter(Boolean);
    } catch (e) {
      console.warn("Gemini failed", e);
      return ['Documents', 'Images', 'Others'];
    }
  },

  // 9. AI Organize Files
  organizeFiles: async (files: FileItem[]): Promise<{ folderName: string, fileIds: string[] }[]> => {
    const fileContext = files.map(f => ({ id: f.id, name: f.name, type: f.type }));
    const prompt = `Analyze these files and organize them into logical folders based on their names and types.
Return a JSON array of objects, where each object has a "folderName" string and a "fileIds" array of strings.
ONLY return the JSON array, nothing else.

Files:
${JSON.stringify(fileContext, null, 2)}`;
    
    try {
      const res = await askGemini(prompt);
      const match = res.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return [];
    } catch (e) {
      console.warn("Gemini organize files failed", e);
      return [];
    }
  }
};
