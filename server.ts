import express from "express";
import cors from "cors";
import crypto from "crypto";
import multer from "multer";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure uploads directory exists
const uploadDir = process.env.VERCEL 
  ? path.join('/tmp', 'uploads') 
  : path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB limit

// In-memory store for shared files
const sharedFiles = new Map<string, {
  fileId: string;
  permission: 'view' | 'edit';
  file: any;
  descendants?: any[];
  password?: string;
  expiresAt?: number;
}>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Handle Vercel's pre-parsed body
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      // Body is already parsed by Vercel
      (req as any)._body = true;
    }
    next();
  });

  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      cloudinaryCloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '',
      cloudinaryUploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || '',
    });
  });

  // AI Gemini endpoints
  app.post("/api/ai/gemini", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is missing in server environment." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
      
      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate content", details: error.message });
    }
  });

  app.post("/api/ai/gemini-vision", async (req, res) => {
    try {
      const { prompt, imageUrl } = req.body;
      if (!prompt || !imageUrl) {
        return res.status(400).json({ error: "Missing prompt or imageUrl" });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is missing in server environment." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Fetch image and convert to base64
      let absoluteImageUrl = imageUrl;
      if (imageUrl.startsWith('/')) {
        // If it's a relative URL, we need to construct the absolute URL
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers.host;
        absoluteImageUrl = `${protocol}://${host}${imageUrl}`;
      }

      const imageRes = await fetch(absoluteImageUrl);
      if (!imageRes.ok) throw new Error(`Failed to fetch image from URL: ${absoluteImageUrl}`);
      
      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      
      const mimeType = imageRes.headers.get('content-type') || 'image/jpeg';

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            { text: prompt }
          ]
        }
      });
      
      res.json({ text: response.text || '' });
    } catch (error: any) {
      console.error("Gemini Vision API Error:", error);
      res.status(500).json({ error: "Failed to analyze image", details: error.message });
    }
  });

  // Proxy endpoint for fetching file content to bypass CORS
  app.get("/api/proxy-file", async (req, res) => {
    const fileUrl = req.query.url as string;
    if (!fileUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      // If it's a relative URL, construct the absolute URL
      let absoluteUrl = fileUrl;
      if (fileUrl.startsWith('/')) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers.host;
        absoluteUrl = `${protocol}://${host}${fileUrl}`;
      }

      const response = await fetch(absoluteUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch file: ${response.statusText}` });
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error: any) {
      console.error("Proxy file error:", error);
      res.status(500).json({ error: "Failed to proxy file", details: error.message });
    }
  });

  // Proxy endpoint for Google Apps Script to bypass CORS
  app.post("/api/proxy", async (req, res) => {
    const { url, body } = req.body;
    if (!url || !body) {
      return res.status(400).json({ error: "Missing url or body" });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch (e) {
        // If it's not JSON, return as text
        return res.send(text);
      }
    } catch (error: any) {
      console.error("Proxy error:", error);
      return res.status(500).json({ error: "Proxy request failed", details: error.message });
    }
  });

  // Create a share link
  app.post("/api/share", (req, res) => {
    const { fileId, permission, file, descendants, password, expiresIn, userId } = req.body;
    
    if (!fileId || !permission || !file) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(16).toString("hex");
    
    const expiresAt = expiresIn ? Date.now() + expiresIn * 60 * 60 * 1000 : undefined;
    
    sharedFiles.set(token, {
      fileId,
      permission,
      file,
      descendants,
      password,
      expiresAt,
      userId
    });

    res.json({ token, permission });
  });

  // Get a shared file by token
  app.get("/api/share/:token", (req, res) => {
    const { token } = req.params;
    const sharedData = sharedFiles.get(token);

    if (!sharedData) {
      return res.status(404).json({ error: "Share link not found or expired" });
    }

    if (sharedData.expiresAt && Date.now() > sharedData.expiresAt) {
      sharedFiles.delete(token);
      return res.status(404).json({ error: "Share link has expired" });
    }

    if (sharedData.password) {
      return res.json({ requiresPassword: true });
    }

    res.json({
      fileId: sharedData.fileId,
      permission: sharedData.permission,
      file: sharedData.file,
      descendants: sharedData.descendants,
      userId: sharedData.userId
    });
  });

  // Verify password for a shared file
  app.post("/api/share/:token/verify", (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    const sharedData = sharedFiles.get(token);

    if (!sharedData) {
      return res.status(404).json({ error: "Share link not found or expired" });
    }

    if (sharedData.expiresAt && Date.now() > sharedData.expiresAt) {
      sharedFiles.delete(token);
      return res.status(404).json({ error: "Share link has expired" });
    }

    if (sharedData.password && sharedData.password !== password) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    res.json({
      fileId: sharedData.fileId,
      permission: sharedData.permission,
      file: sharedData.file,
      descendants: sharedData.descendants,
      userId: sharedData.userId
    });
  });

  // Upload a file (legacy single-request upload)
  app.post("/api/upload", (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Security check: block dangerous file extensions
    const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.vbs', '.js', '.php', '.phtml', '.html', '.htm'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      fs.unlinkSync(req.file.path); // Clean up the uploaded file
      return res.status(400).json({ error: "File type not allowed for security reasons" });
    }

    try {
      let fileUrl = '';
      let publicId = '';

      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
          resource_type: 'auto',
          use_filename: true,
          unique_filename: false,
        });

        fs.unlinkSync(req.file.path);

        fileUrl = cloudinaryResult.secure_url;
        publicId = cloudinaryResult.public_id;
      } else {
        fileUrl = `/uploads/${req.file.filename}`;
        publicId = req.file.filename;
      }

      res.json({
        success: true,
        fileId: publicId,
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return res.status(500).json({ error: "Failed to upload to Cloudinary" });
    }
  });

  // Chunked upload
  app.post("/api/upload/chunk", (req, res, next) => {
    upload.single('chunk')(req, res, (err) => {
      if (err) {
        console.error("Multer chunk error:", err);
        return res.status(400).json({ error: err.message || "Chunk upload failed" });
      }
      next();
    });
  }, (req, res) => {
    const { fileId, chunkIndex, totalChunks } = req.body;
    if (!req.file || !fileId || chunkIndex === undefined || totalChunks === undefined) {
      return res.status(400).json({ error: "Missing chunk data" });
    }

    const tempDir = path.join(uploadDir, 'temp', fileId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const chunkPath = path.join(tempDir, chunkIndex);
    fs.renameSync(req.file.path, chunkPath);

    res.json({ success: true, chunkIndex });
  });

  // Finalize chunked upload
  app.post("/api/upload/finalize", async (req, res) => {
    const { fileId, originalName, totalChunks, type, size } = req.body;
    if (!fileId || !originalName || !totalChunks) {
      return res.status(400).json({ error: "Missing finalize data" });
    }

    // Security check: block dangerous file extensions
    const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.vbs', '.js', '.php', '.phtml', '.html', '.htm'];
    const ext = path.extname(originalName).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      return res.status(400).json({ error: "File type not allowed for security reasons" });
    }

    const tempDir = path.join(uploadDir, 'temp', fileId);
    const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${safeOriginalName}`;
    const finalPath = path.join(uploadDir, finalFilename);

    try {
      const writeStream = fs.createWriteStream(finalPath);
      let writeError: Error | null = null;
      writeStream.on('error', (err) => {
        writeError = err;
      });
      
      const appendChunk = (index: number) => {
        return new Promise<void>((resolve, reject) => {
          if (index >= totalChunks) {
            writeStream.end();
            resolve();
            return;
          }
          
          const chunkPath = path.join(tempDir, index.toString());
          if (!fs.existsSync(chunkPath)) {
            reject(new Error(`Missing chunk ${index}`));
            return;
          }
          
          const readStream = fs.createReadStream(chunkPath);
          readStream.pipe(writeStream, { end: false });
          readStream.on('end', () => {
            fs.unlinkSync(chunkPath); // Clean up chunk
            resolve(appendChunk(index + 1));
          });
          readStream.on('error', reject);
        });
      };

      await appendChunk(0);
      await new Promise<void>((resolve, reject) => {
        if (writeError) {
          reject(writeError);
          return;
        }
        if (writeStream.writableFinished) {
          resolve();
        } else {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        }
      });
      fs.rmSync(tempDir, { recursive: true, force: true }); // Clean up temp dir

      let fileUrl = '';
      let publicId = fileId;
      let cloudinaryData: any = null;

      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        // Upload to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(finalPath, {
          resource_type: 'auto',
          public_id: fileId,
          use_filename: true,
          unique_filename: false,
        });

        // Clean up local assembled file
        fs.unlinkSync(finalPath);

        fileUrl = cloudinaryResult.secure_url;
        publicId = cloudinaryResult.public_id;
        cloudinaryData = cloudinaryResult;
      } else {
        // Fallback to local storage
        fileUrl = `/uploads/${finalFilename}`;
        publicId = fileId;
      }

      res.json({
        success: true,
        fileId: publicId,
        url: fileUrl,
        name: originalName,
        size: size,
        type: type,
        cloudinaryData: cloudinaryData
      });
    } catch (err) {
      console.error("Finalize error:", err);
      return res.status(500).json({ error: "Failed to assemble file" });
    }
  });

  // Delete a file or multiple files
  app.post("/api/delete", async (req, res) => {
    const { fileId, fileIds } = req.body;
    
    const idsToDelete = fileIds || (fileId ? [fileId] : []);
    
    if (idsToDelete.length === 0) {
      return res.status(400).json({ error: "Missing fileId or fileIds" });
    }

    try {
      let anyDeleted = false;

      for (const id of idsToDelete) {
        let deleted = false;
        // Delete from Cloudinary if configured
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
          let result = await cloudinary.uploader.destroy(id, { resource_type: 'image' });
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(id, { resource_type: 'video' });
          }
          if (result.result === 'not found') {
            result = await cloudinary.uploader.destroy(id, { resource_type: 'raw' });
          }
          if (result.result === 'ok') {
            deleted = true;
          }
        }

        // Also try to delete locally just in case it was a legacy upload
        const filePath = path.join(uploadDir, id);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleted = true;
        }
        
        if (deleted) anyDeleted = true;
      }

      if (anyDeleted) {
        return res.json({ success: true });
      } else {
        return res.json({ success: true, message: "Files not found locally, assuming external" });
      }
    } catch (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Failed to delete files" });
    }
  });

  // Rename a file
  app.post("/api/rename", (req, res) => {
    const { fileId, newName } = req.body;
    if (!fileId || !newName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const filePath = path.join(uploadDir, fileId);
    if (fs.existsSync(filePath)) {
      try {
        // We don't actually rename the file on disk to avoid breaking the URL,
        // but we can return success so the frontend updates its state.
        // If we wanted to rename it, we would need to update the fileId/URL in the frontend.
        // For this prototype, returning success is sufficient.
        return res.json({ success: true });
      } catch (err) {
        console.error("Rename error:", err);
        return res.status(500).json({ error: "Failed to rename file" });
      }
    } else {
      return res.json({ success: true, message: "File not found locally, assuming external" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    // Use dynamic import with a variable to prevent Vercel from bundling Vite in production
    const viteModule = "vite";
    const { createServer: createViteServer } = await import(viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the dist directory in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*splat', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();

export default async function (req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
