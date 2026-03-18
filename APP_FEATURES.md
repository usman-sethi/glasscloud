# GlassCloud

## 1. Project Overview

GlassCloud is a modern, Google Drive-style cloud storage web application designed to provide users with a seamless, secure, and intuitive platform for managing their files and folders. It offers a robust set of features for organizing, previewing, and securing digital assets in a highly responsive and visually appealing interface.

## 2. Technology Stack

*   **Frontend:** React + TypeScript + Tailwind CSS + Vite
    *   *Why:* React provides a dynamic and component-based UI, TypeScript ensures type safety and reduces runtime errors, Tailwind CSS enables rapid and consistent styling, and Vite offers a blazing-fast development experience and optimized production builds.
*   **Backend:** Google Apps Script (REST API)
    *   *Why:* Provides a serverless, easily deployable backend that integrates natively with Google Workspace services like Google Sheets.
*   **Database:** Google Sheets
    *   *Why:* Acts as a lightweight, accessible, and free database for storing file metadata, folder structures, and user information.
*   **Storage:** Cloudinary
    *   *Why:* A powerful cloud-based image and video management service that handles file uploads, storage, and optimized delivery (including on-the-fly transformations and video streaming).
*   **APIs:** Custom REST API via Google Apps Script
    *   *Why:* Facilitates communication between the React frontend and the Google Sheets database/Cloudinary storage.

---

## 3. Core Features (Version 1)

*   **File uploads:** Users can upload various file types directly to the cloud.
*   **Folder creation:** Create custom folders to organize files logically.
*   **Folder tree structure:** Navigate through a hierarchical folder system.
*   **File previews:** Preview images, documents, and other supported file types directly in the browser.
*   **Video streaming:** Stream uploaded videos without needing to download them first.
*   **Image thumbnails:** Automatically generated thumbnails for image files for quick visual identification.
*   **File metadata storage:** Store essential information like file name, size, upload date, and parent folder in Google Sheets.
*   **Move files between folders:** Easily reorganize files by moving them to different folders.
*   **Search system:** Search for files and folders by name.
*   **Folder locking:** Secure sensitive folders with a master password.
*   **Responsive UI:** A design that adapts seamlessly to desktop, tablet, and mobile screens.
*   **Drag & drop uploads:** Intuitive drag-and-drop interface for quick file uploads.
*   **Cloudinary storage integration:** Reliable and scalable file storage.
*   **Google Sheets metadata storage:** Efficient and accessible metadata management.

---

## 4. Advanced Features (Version 2)

*   **Large file uploads (up to 5GB):** Support for uploading significantly larger files.
*   **Resumable uploads:** Ability to pause and resume uploads, ensuring reliability over unstable connections.
*   **Faster loading:** Optimized data fetching and rendering for a snappier user experience.
*   **Batch file actions:** Perform actions like move, delete, and download on multiple files simultaneously.
*   **Multi-select system:** Select multiple items using Ctrl+Click, Shift+Click, checkboxes, or long-press on mobile.
*   **Improved search:** More accurate and faster search capabilities.
*   **Better folder navigation:** Enhanced breadcrumbs and sidebar navigation.
*   **Mobile responsive improvements:** A refined mobile experience with touch-friendly controls and layouts.

---

## 5. Architecture Overview

**Frontend → API → Google Apps Script → Google Sheets → Cloudinary**

*   **File upload flow:**
    1.  User selects a file on the Frontend.
    2.  Frontend uploads the file directly to Cloudinary using the Cloudinary API.
    3.  Cloudinary returns the file URL and metadata.
    4.  Frontend sends this metadata to the Google Apps Script API.
    5.  Google Apps Script saves the metadata as a new row in Google Sheets.
*   **Metadata storage flow:**
    1.  Frontend sends a request (e.g., create folder, rename file) to the Google Apps Script API.
    2.  Google Apps Script processes the request and updates the corresponding row(s) in Google Sheets.
    3.  Google Apps Script returns a success/failure response to the Frontend.
*   **Folder hierarchy logic:**
    *   Each file and folder in Google Sheets has a `parentId` column.
    *   The root folder has a specific ID (e.g., 'root').
    *   The Frontend fetches all metadata and constructs the folder tree based on these `parentId` relationships.
*   **File retrieval process:**
    1.  Frontend requests the file list from the Google Apps Script API.
    2.  Google Apps Script reads the data from Google Sheets and returns it as JSON.
    3.  Frontend renders the files and folders, using the Cloudinary URLs for previews and downloads.

---

## 6. Security Considerations

*   **Folder locking logic:** Folders can be locked using a master password. The password hash or verification logic is handled securely to prevent unauthorized access to the folder's contents.
*   **File access protection:** Files are associated with specific user IDs, ensuring users can only access their own files.
*   **API validation:** The Google Apps Script API validates incoming requests to ensure required parameters (like `userId` and `fileId`) are present and valid.
*   **Upload size limits:** Enforced on the frontend and potentially via Cloudinary settings to prevent abuse.
*   **Input validation:** All user inputs (file names, folder names, search queries) are sanitized to prevent injection attacks.

---

## 7. Deployment Guide

### Frontend deployment:

**Vercel / Netlify:**
1.  Connect your GitHub repository to Vercel or Netlify.
2.  Set the build command to `npm run build`.
3.  Set the output directory to `dist`.
4.  Add the required environment variables (see below).
5.  Deploy the application.

### Backend deployment:

**Google Apps Script Web App:**
1.  Open the Google Apps Script editor.
2.  Paste the backend code (`google-apps-script.js`).
3.  Click "Deploy" -> "New deployment".
4.  Select type "Web app".
5.  Execute as: "Me".
6.  Who has access: "Anyone".
7.  Deploy and copy the Web App URL.

### Configuration steps:

1.  **Cloudinary setup:** Create a Cloudinary account, get your Cloud Name, API Key, and Upload Preset.
2.  **Google Sheets setup:** Create a new Google Sheet, name the first tab "Files", and set up the columns as expected by the backend script. Note the Spreadsheet ID.
3.  **API endpoint configuration:** Update the Google Apps Script with the Spreadsheet ID. Update the Frontend environment variables with the Web App URL.

---

## 8. Future Features — Version 3 (Next Level)

**AI Features:**
*   **AI file search:** Semantic search based on file content and context.
*   **AI document summarization:** Automatically generate summaries for text documents and PDFs.
*   **AI automatic file tagging:** Automatically analyze images and documents to assign relevant tags for easier organization.

**Storage Features:**
*   **Folder compression (ZIP download):** Download entire folders as a single ZIP file.
*   **File version history:** Keep track of changes to files and restore previous versions.
*   **Trash & recovery system:** A dedicated trash bin with a 30-day retention policy before permanent deletion.

**Collaboration Features:**
*   **File sharing links:** Generate public or password-protected links to share files with others.
*   **Permission system:** Granular control over who can view, edit, or comment on shared files.
*   **Team workspaces:** Shared folders for collaborative projects.

**Performance:**
*   **CDN caching:** Leverage Cloudinary's CDN and potentially a frontend CDN for faster asset delivery globally.
*   **Chunk uploads:** Implement chunked uploads for massive files to improve reliability and resume capabilities.
*   **WebSocket realtime updates:** Push updates to the client instantly when files are added, moved, or deleted by other users or processes.

**UI/UX:**
*   **Grid / List view toggle:** Allow users to switch between grid and list layouts for file browsing.
*   **Activity history panel:** A sidebar showing recent actions (uploads, moves, deletions).
*   **Storage usage analytics dashboard:** Visual breakdown of storage space used by file type and folder.
