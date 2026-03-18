function doPost(e) {
  // Prevent crashes if no POST data
  if (!e || !e.postData) {
    return ContentService.createTextOutput(JSON.stringify({error: 'No POST data'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result = { success: false };

    // Open the spreadsheet (replace with your actual Spreadsheet ID)
    // var ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
    // For this example, we'll use the active spreadsheet if bound, or create one
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      // If not bound to a spreadsheet, you need to provide an ID
      // ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Spreadsheet not found. Please bind this script to a Google Sheet or provide a Spreadsheet ID.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var filesSheet = ss.getSheetByName('Files') || ss.insertSheet('Files');
    var usersSheet = ss.getSheetByName('Users') || ss.insertSheet('Users');

    // Initialize sheets if empty
    if (filesSheet.getLastRow() === 0) {
      filesSheet.appendRow(['id', 'userId', 'name', 'type', 'size', 'url', 'parentId', 'date', 'metadata']);
    }
    if (usersSheet.getLastRow() === 0) {
      usersSheet.appendRow(['userId', 'email', 'passwordHash', 'masterPassword']);
    }

    switch (action) {
      case 'register':
        var email = data.email;
        var passwordHash = data.passwordHash;
        var newUserId = Utilities.getUuid();
        
        // Check if user exists
        var userExists = false;
        var userRows = usersSheet.getDataRange().getValues();
        for (var i = 1; i < userRows.length; i++) {
          if (userRows[i][1] === email) {
            userExists = true;
            break;
          }
        }
        
        if (userExists) {
          result = { success: false, error: 'User already exists' };
        } else {
          usersSheet.appendRow([newUserId, email, passwordHash, '']);
          result = { success: true, userId: newUserId, hasMasterPassword: false };
        }
        break;

      case 'login':
        var email = data.email;
        var passwordHash = data.passwordHash;
        var userRows = usersSheet.getDataRange().getValues();
        var foundUser = null;
        var hasMasterPassword = false;
        var masterPassword = '';
        
        for (var i = 1; i < userRows.length; i++) {
          if (userRows[i][1] === email && userRows[i][2] === passwordHash) {
            foundUser = userRows[i][0];
            masterPassword = userRows[i][3] || '';
            hasMasterPassword = masterPassword !== '';
            break;
          }
        }
        
        if (foundUser) {
          result = { success: true, userId: foundUser, hasMasterPassword: hasMasterPassword, masterPassword: masterPassword };
        } else {
          result = { success: false, error: 'Invalid credentials' };
        }
        break;

      case 'setMasterPassword':
        var userId = data.userId;
        var masterPassword = data.masterPassword;
        var userRows = usersSheet.getDataRange().getValues();
        var updated = false;
        
        for (var i = 1; i < userRows.length; i++) {
          if (userRows[i][0] === userId) {
            usersSheet.getRange(i + 1, 4).setValue(masterPassword);
            updated = true;
            break;
          }
        }
        
        if (updated) {
          result = { success: true };
        } else {
          result = { success: false, error: 'User not found' };
        }
        break;

      case 'getFiles':
        var userId = data.userId;
        var limit = data.limit || 50;
        var offset = data.offset || 0;
        
        var fileRows = filesSheet.getDataRange().getValues();
        var files = [];
        
        // Start from 1 to skip header
        for (var i = 1; i < fileRows.length; i++) {
          if (fileRows[i][1] === userId) {
            files.push({
              id: fileRows[i][0],
              name: fileRows[i][2],
              type: fileRows[i][3],
              size: fileRows[i][4],
              url: fileRows[i][5],
              parentId: fileRows[i][6],
              date: fileRows[i][7],
              metadata: fileRows[i][8] ? JSON.parse(fileRows[i][8]) : {}
            });
          }
        }
        
        // Sort by date descending
        files.sort(function(a, b) {
          return new Date(b.date) - new Date(a.date);
        });
        
        // Apply pagination
        var paginatedFiles = files.slice(offset, offset + limit);
        
        result = { success: true, files: paginatedFiles, total: files.length };
        break;

      case 'upload':
        var userId = data.userId;
        var fileId = data.fileId;
        
        // Check for duplicate
        var fileRows = filesSheet.getDataRange().getValues();
        var isDuplicate = false;
        for (var i = 1; i < fileRows.length; i++) {
          if (fileRows[i][0] === fileId && fileRows[i][1] === userId) {
            isDuplicate = true;
            break;
          }
        }
        
        if (isDuplicate) {
          result = { success: false, error: 'Duplicate file ID' };
        } else {
          filesSheet.appendRow([
            fileId,
            userId,
            data.name,
            data.type,
            data.size,
            data.url,
            data.parentId || 'root',
            data.date,
            data.metadata || '{}'
          ]);
          result = { success: true };
        }
        break;

      case 'createFolder':
        var userId = data.userId;
        var folderId = Utilities.getUuid();
        
        filesSheet.appendRow([
          folderId,
          userId,
          data.folderName,
          'folder',
          '--',
          '',
          data.parentId || 'root',
          data.date || new Date().toISOString(),
          '{}'
        ]);
        
        result = { success: true, folderId: folderId };
        break;

      case 'delete':
        var userId = data.userId;
        var fileId = data.fileId;
        var fileRows = filesSheet.getDataRange().getValues();
        var deleted = false;
        
        for (var i = fileRows.length - 1; i >= 1; i--) {
          if (fileRows[i][0] === fileId && fileRows[i][1] === userId) {
            filesSheet.deleteRow(i + 1);
            deleted = true;
            break;
          }
        }
        
        if (deleted) {
          result = { success: true };
        } else {
          result = { success: false, error: 'File not found' };
        }
        break;

      case 'rename':
        var userId = data.userId;
        var fileId = data.fileId;
        var newName = data.newName;
        var fileRows = filesSheet.getDataRange().getValues();
        var renamed = false;
        
        for (var i = 1; i < fileRows.length; i++) {
          if (fileRows[i][0] === fileId && fileRows[i][1] === userId) {
            filesSheet.getRange(i + 1, 3).setValue(newName); // Column C is name
            renamed = true;
            break;
          }
        }
        
        if (renamed) {
          result = { success: true };
        } else {
          result = { success: false, error: 'File not found' };
        }
        break;

      case 'move':
      case 'update':
        var userId = data.userId;
        var fileId = data.fileId;
        var newParentId = data.newParentId || data.parentId;
        var fileRows = filesSheet.getDataRange().getValues();
        var moved = false;
        
        for (var i = 1; i < fileRows.length; i++) {
          if (fileRows[i][0] === fileId && fileRows[i][1] === userId) {
            filesSheet.getRange(i + 1, 7).setValue(newParentId); // Column G is parentId
            moved = true;
            break;
          }
        }
        
        if (moved) {
          result = { success: true };
        } else {
          result = { success: false, error: 'File not found' };
        }
        break;

      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (optional, for testing if the script is alive)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'GlassCloud API is running',
    message: 'Please use POST requests for API actions.'
  })).setMimeType(ContentService.MimeType.JSON);
}
