import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const extractFileContent = async (url: string, fileName: string, sizeStr: string): Promise<string> => {
  try {
    if (!url || url === '#' || url === '') {
      return "[Content not available for this file]";
    }

    // Check size limit (rough estimate from size string e.g., "2.5 MB")
    if (sizeStr.includes('MB')) {
      const sizeMB = parseFloat(sizeStr);
      if (sizeMB > 10) {
        throw new Error("File too large for AI processing (limit 10MB)");
      }
    }

    // Fetch the file
    let response;
    try {
      // First try fetching directly
      response = await fetch(url);
      if (!response.ok) throw new Error("Not OK");
    } catch (e) {
      // If direct fetch fails (e.g., CORS), use our backend proxy
      try {
        response = await fetch(`/api/proxy-file?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Backend Proxy Not OK");
      } catch (e2) {
        return "[Content not available: Unable to access file due to network or CORS restrictions]";
      }
    }

    const blob = await response.blob();
    
    if (blob.size > MAX_FILE_SIZE) {
      throw new Error("File too large for AI processing (limit 10MB)");
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // Extract based on type
    if (ext === 'pdf') {
      return await extractPdfContent(blob);
    } else if (ext === 'docx' || ext === 'doc') {
      return await extractDocxContent(blob);
    } else if (ext === 'pptx') {
      return await extractPptxContent(blob);
    } else if (ext === 'xlsx') {
      return await extractXlsxContent(blob);
    } else if (['txt', 'md', 'csv', 'json', 'js', 'ts', 'html', 'css', 'py', 'java', 'c', 'cpp'].includes(ext)) {
      return await extractTextContent(blob);
    } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      // For images, we rely on HuggingFace vision model in the router, 
      // but we can return a placeholder here to indicate it's an image.
      return "[IMAGE CONTENT - Use Vision Model]";
    }

    return "[Unsupported file type for text extraction]";
  } catch (error) {
    console.error("Content extraction error:", error);
    return `[Extraction Error: ${(error as Error).message}]`;
  }
};

const extractPdfContent = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  const numPages = Math.min(pdf.numPages, 20); // Limit to 20 pages to avoid huge payloads
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText.substring(0, 15000); // Limit total characters
};

const extractDocxContent = async (blob: Blob): Promise<string> => {
  const arrayBuffer = await blob.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.substring(0, 15000);
};

const extractPptxContent = async (blob: Blob): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    let fullText = '';
    
    // Find all slide files
    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
    
    for (const slideFile of slideFiles) {
      const content = await zip.file(slideFile)?.async('string');
      if (content) {
        // Extract text from <a:t> tags
        const matches = content.match(/<a:t>([^<]*)<\/a:t>/g);
        if (matches) {
          const slideText = matches.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ');
          fullText += slideText + '\n\n';
        }
      }
    }
    
    return fullText.substring(0, 15000);
  } catch (e) {
    console.error("PPTX extraction error:", e);
    return "[Error extracting PPTX content]";
  }
};

const extractXlsxContent = async (blob: Blob): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    let fullText = '';
    
    // In XLSX, most text is stored in sharedStrings.xml
    const sharedStringsFile = zip.file('xl/sharedStrings.xml');
    if (sharedStringsFile) {
      const content = await sharedStringsFile.async('string');
      // Extract text from <t> tags
      const matches = content.match(/<t[^>]*>([^<]*)<\/t>/g);
      if (matches) {
        fullText = matches.map(m => m.replace(/<t[^>]*>|<\/t>/g, '')).join('\n');
      }
    }
    
    return fullText.substring(0, 15000);
  } catch (e) {
    console.error("XLSX extraction error:", e);
    return "[Error extracting XLSX content]";
  }
};

const extractTextContent = async (blob: Blob): Promise<string> => {
  const text = await blob.text();
  return text.substring(0, 15000);
};
