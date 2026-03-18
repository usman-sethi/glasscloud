// GlassCloud Google Apps Script Backend
// Deploy as Web App -> Execute as: Me -> Who has access: Anyone

const SHEET_NAME = 'Files';
const USERS_SHEET_NAME = 'Users';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Files Sheet
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'fileId', 
      'name', 
      'type', 
      'size', 
      'date', 
      'url', 
      'parentId', 
      'userId', 
      'tags', 
      'summary', 
      'aiDescription',
      'metadata',
      'cloudinaryData',
      'keywords',
      'contentPreview'
    ]);
    sheet.setFrozenRows(1);
  }
  
  // Setup Users Sheet
  let usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(USERS_SHEET_NAME);
    usersSheet.appendRow([
      'userId',
      'email',
      'passwordHash',
      'createdAt'
    ]);
    usersSheet.setFrozenRows(1);
  }
}

function doPost(e) {
  if (typeof e === 'undefined') {
    return createJsonResponse({ error: 'No event object' });
  }

  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    switch (action) {
      case 'upload':
        return handleUpload(postData);
      case 'delete':
        return handleDelete(postData);
      case 'rename':
        return handleRename(postData);
      case 'createFolder':
        return handleCreateFolder(postData);
      case 'move':
      case 'update':
        return handleMove(postData);
      case 'getFiles':
        return handleGetFiles(postData);
      case 'register':
        return handleRegister(postData);
      case 'login':
        return handleLogin(postData);
      case 'updateAiMeta':
        return handleUpdateAiMeta(postData);
      default:
        return createJsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getFiles') {
      return handleGetFiles(e.parameter);
    }
    
    return createJsonResponse({ status: 'ok', message: 'GlassCloud API is running' });
  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  }
}

function handleUpload(data) {
  const sheet = getSheet(SHEET_NAME);
  
  // Check for duplicates
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.fileId) {
      return createJsonResponse({ error: 'Duplicate fileId' });
    }
  }
  
  sheet.appendRow([
    data.fileId,
    data.name,
    data.type,
    data.size,
    data.date,
    data.url || '',
    data.parentId || 'root',
    data.userId,
    data.tags || '',
    data.summary || '',
    data.aiDescription || '',
    data.metadata || '',
    data.cloudinaryData ? JSON.stringify(data.cloudinaryData) : '',
    data.keywords || '',
    data.contentPreview || ''
  ]);
  
  return createJsonResponse({ success: true, fileId: data.fileId });
}

function handleCreateFolder(data) {
  const sheet = getSheet(SHEET_NAME);
  const folderId = 'folder_' + Utilities.getUuid();
  
  sheet.appendRow([
    folderId,
    data.folderName,
    'folder',
    '0 B',
    data.date || new Date().toISOString(),
    '',
    data.parentId || 'root',
    data.userId,
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ]);
  
  return createJsonResponse({ success: true, folderId: folderId });
}

function handleGetFiles(data) {
  const sheet = getSheet(SHEET_NAME);
  const userId = data.userId;
  
  if (!userId) {
    return createJsonResponse({ error: 'userId is required' });
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  const files = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row[7] === userId) { // userId is at index 7
      let metadata = {};
      try {
        metadata = row[11] ? JSON.parse(row[11]) : {};
      } catch (e) {}

      let cloudinaryData = null;
      try {
        cloudinaryData = row[12] ? JSON.parse(row[12]) : null;
      } catch (e) {}

      const file = {
        id: row[0],
        name: row[1],
        type: row[2],
        size: row[3],
        date: row[4],
        url: row[5],
        parentId: row[6],
        userId: row[7],
        tags: row[8] ? row[8].split(',') : [],
        summary: row[9],
        aiDescription: row[10],
        metadata: metadata,
        cloudinaryData: cloudinaryData,
        keywords: row[13] ? row[13].split(',') : [],
        contentPreview: row[14] || ''
      };
      files.push(file);
    }
  }
  
  // Sort by date descending
  files.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Pagination
  const limit = parseInt(data.limit) || 50;
  const offset = parseInt(data.offset) || 0;
  
  const paginatedFiles = files.slice(offset, offset + limit);
  
  return createJsonResponse({ 
    success: true, 
    files: paginatedFiles,
    totalCount: files.length
  });
}

function handleDelete(data) {
  const sheet = getSheet(SHEET_NAME);
  const userId = data.userId;
  
  if (!userId) {
    return createJsonResponse({ error: 'userId is required' });
  }
  
  const fileIds = data.fileIds || (data.fileId ? [data.fileId] : []);
  if (fileIds.length === 0) {
    return createJsonResponse({ error: 'fileId or fileIds required' });
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Delete from bottom to top to avoid shifting index issues
  let deletedCount = 0;
  for (let i = values.length - 1; i >= 1; i--) {
    if (fileIds.includes(values[i][0]) && values[i][7] === userId) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    return createJsonResponse({ success: true, deletedCount: deletedCount });
  }
  
  return createJsonResponse({ error: 'Files not found or unauthorized' });
}

function handleRename(data) {
  const sheet = getSheet(SHEET_NAME);
  const fileId = data.fileId;
  const userId = data.userId;
  const newName = data.newName;
  
  if (!fileId || !userId || !newName) {
    return createJsonResponse({ error: 'fileId, userId, and newName are required' });
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === fileId && values[i][7] === userId) {
      sheet.getRange(i + 1, 2).setValue(newName); // name is column 2
      
      // Also update parentId if provided (fallback for move)
      if (data.newParentId || data.parentId) {
        sheet.getRange(i + 1, 7).setValue(data.newParentId || data.parentId);
      }
      
      return createJsonResponse({ success: true });
    }
  }
  
  return createJsonResponse({ error: 'File not found or unauthorized' });
}

function handleMove(data) {
  const sheet = getSheet(SHEET_NAME);
  const userId = data.userId;
  const newParentId = data.newParentId || data.parentId || data.folderId || data.targetFolderId || data.targetId;
  
  if (!userId || newParentId === undefined) {
    return createJsonResponse({ error: 'userId and newParentId are required' });
  }
  
  const fileIds = data.fileIds || (data.fileId ? [data.fileId] : []);
  if (fileIds.length === 0) {
    return createJsonResponse({ error: 'fileId or fileIds required' });
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let updatedCount = 0;
  for (let i = 1; i < values.length; i++) {
    if (fileIds.includes(values[i][0]) && values[i][7] === userId) {
      sheet.getRange(i + 1, 7).setValue(newParentId); // parentId is column 7
      updatedCount++;
    }
  }
  
  if (updatedCount > 0) {
    return createJsonResponse({ success: true, updatedCount: updatedCount });
  }
  
  return createJsonResponse({ error: 'Files not found or unauthorized' });
}

function handleRegister(data) {
  const sheet = getSheet(USERS_SHEET_NAME);
  const email = data.email;
  const passwordHash = data.passwordHash;
  
  if (!email || !passwordHash) {
    return createJsonResponse({ error: 'email and passwordHash are required' });
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === email) {
      return createJsonResponse({ error: 'Email already exists' });
    }
  }
  
  const userId = 'user_' + Utilities.getUuid();
  sheet.appendRow([
    userId,
    email,
    passwordHash,
    new Date().toISOString()
  ]);
  
  return createJsonResponse({ success: true, userId: userId });
}

function handleLogin(data) {
  const sheet = getSheet(USERS_SHEET_NAME);
  const email = data.email;
  const passwordHash = data.passwordHash;
  
  if (!email || !passwordHash) {
    return createJsonResponse({ error: 'email and passwordHash are required' });
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === email && values[i][2] === passwordHash) {
      return createJsonResponse({ success: true, userId: values[i][0] });
    }
  }
  
  return createJsonResponse({ error: 'Invalid email or password' });
}

function handleUpdateAiMeta(data) {
  const sheet = getSheet(SHEET_NAME);
  const fileId = data.fileId;
  const userId = data.userId;
  
  if (!fileId || !userId) {
    return createJsonResponse({ error: 'fileId and userId are required' });
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === fileId && values[i][7] === userId) {
      if (data.tags !== undefined) {
        const tagsStr = Array.isArray(data.tags) ? data.tags.join(',') : data.tags;
        sheet.getRange(i + 1, 9).setValue(tagsStr);
      }
      if (data.summary !== undefined) sheet.getRange(i + 1, 10).setValue(data.summary);
      if (data.aiDescription !== undefined) sheet.getRange(i + 1, 11).setValue(data.aiDescription);
      if (data.keywords !== undefined) {
        const keywordsStr = Array.isArray(data.keywords) ? data.keywords.join(',') : data.keywords;
        sheet.getRange(i + 1, 14).setValue(keywordsStr);
      }
      if (data.contentPreview !== undefined) sheet.getRange(i + 1, 15).setValue(data.contentPreview);
      
      return createJsonResponse({ success: true });
    }
  }
  
  return createJsonResponse({ error: 'File not found or unauthorized' });
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(sheetName);
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
