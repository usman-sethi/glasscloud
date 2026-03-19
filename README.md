# GlassCloud ☁️

GlassCloud is a modern, AI-enhanced cloud storage web application built with React, Vite, and Tailwind CSS. It features a beautiful glassmorphism-inspired interface and leverages Artificial Intelligence to help you manage, understand, and interact with your files more effectively.

## 🚀 Current Features

Here are the functions and capabilities currently implemented in the web application:

### File & Folder Management
* **Drag & Drop Uploads:** Seamlessly upload files by dragging them into the browser.
* **Chunked Uploads:** Supports large file uploads (up to 5GB) via Cloudinary integration.
* **Folder Organization:** Create folders, move files between folders, and navigate a hierarchical file system.
* **Rich Context Menu:** Right-click (or use the three-dots menu) to Rename, Download, Share, Move, or Delete files.
* **Bulk Actions:** Click and drag to multi-select files for bulk moving, downloading, or deletion.
* **Grid & List Views:** Toggle between a visual grid layout and a detailed list layout.

### AI Integration 🤖
* **Background AI Processing:** Automatically analyzes uploaded files to generate summaries, keywords, and smart tags.
* **Ask AI (File Chat):** Open a chat interface for any specific file to ask questions about its content.
* **AI Sidebar:** A dedicated AI assistant to help you navigate and query your entire cloud storage workspace.

### Advanced File Operations
* **Archive Handling:** Compress entire folders into `.zip` files, or extract `.zip` archives directly in the browser.
* **Media Previews:** Built-in lightbox for previewing images and videos without downloading them.
* **Folder Locking:** Secure specific folders by locking them.
* **Favorites:** Star important files and folders for quick access in the "Favorites" tab.
* **Trash/Recycle Bin:** Safely delete files with the ability to restore them later or permanently empty the trash.

---

## 🔮 Future Features (What should be in the project)

To make GlassCloud a complete, enterprise-ready cloud storage solution, the following features should be implemented in the future:

### 1. Advanced Sharing & Collaboration 🤝
* **Granular Permissions:** Share folders with specific users (View-only, Commenter, Editor).
* **Secure Links:** Generate shareable public links with optional password protection and expiration dates.
* **Real-time Collaboration:** See when other users are viewing or editing the same folder/file.

### 2. Enhanced Security & Privacy 🔐
* **End-to-End Encryption (E2EE):** Encrypt files on the client side before they are uploaded, ensuring zero-knowledge privacy.
* **Two-Factor Authentication (2FA):** Add an extra layer of security for user accounts.

### 3. Productivity & Editing 📝
* **In-App Document Editor:** Edit text, Markdown, and code files directly within the browser without downloading.
* **File Versioning:** Keep a history of file changes, allowing users to restore previous versions of a document.
* **PDF Annotation:** Highlight, draw, and add comments directly onto PDF files.

### 4. Advanced AI & Search 🔍
* **Semantic Global Search:** Search for files based on their *meaning* and content, rather than just matching the filename.
* **Smart Folders:** Folders that automatically group files based on AI-generated tags (e.g., "Invoices", "Travel Photos").
* **OCR (Optical Character Recognition):** Automatically extract and make text searchable from images and scanned PDFs.

### 5. Integrations & Sync 🔄
* **Desktop Sync Client:** A native app to automatically sync local folders with GlassCloud.
* **Third-Party Cloud Sync:** Import or backup files from Google Drive, Dropbox, or OneDrive.
* **PWA (Progressive Web App):** Install the web app on mobile devices for offline access and native-like performance.
