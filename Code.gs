
/* 
  CONFIGURATION
  Pastikan nama Sheet (Tab) di Google Spreadsheet sesuai dengan variabel di bawah ini.
*/
const SHEET_USERS = "Users"; // Khusus Siswa
const SHEET_ADMINS = "Admins"; // Khusus Admin (Pusat & Sekolah)
const SHEET_CONFIG = "Config";    
const SHEET_RESULTS = "Nilai";    
const SHEET_REKAP = "Rekap_Analisis"; 
const SHEET_JAWABAN = "Jawaban";      
const SHEET_RANKING = "Rangking";     
const SHEET_LOGS = "Logs";            

const SYSTEM_SHEETS = [SHEET_USERS, SHEET_ADMINS, SHEET_CONFIG, SHEET_RESULTS, SHEET_REKAP, SHEET_JAWABAN, SHEET_RANKING, SHEET_LOGS];

/* ENTRY POINT: doPost */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
        return responseJSON({ error: "Invalid Request: No postData" });
    }
    const params = JSON.parse(e.postData.contents);
    if (!params.action) return responseJSON({ error: "Missing action" });
    
    const result = processAction(params.action, params.args);
    return responseJSON(result);
  } catch (err) {
    return responseJSON({ error: "Server Error: " + err.toString() });
  }
}

/* ENTRY POINT: doGet */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
      try {
          const args = e.parameter.args ? JSON.parse(e.parameter.args) : [];
          return responseJSON(processAction(e.parameter.action, args));
      } catch (err) {
          return responseJSON({ error: err.toString() });
      }
  }
  return responseJSON({ status: "online", message: "CBT Backend Online", timestamp: new Date().toISOString() });
}

function processAction(action, args) {
    args = args || [];
    switch (action) {
      case 'login': return loginUser(args[0], args[1]);
      case 'startExam': return startExam(args[0], args[1], args[2]);
      case 'checkUserStatus': return checkUserStatus(args[0]); 
      case 'getSubjectList': return getSubjectList(); 
      case 'getTokenFromConfig': return getConfigValue('TOKEN', 'TOKEN');
      case 'getQuestionsFromSheet': return getQuestionsFromSheet(args[0]);
      case 'getRawQuestions': return adminGetQuestions(args[0]);
      case 'saveQuestion': return adminSaveQuestion(args[0], args[1]);
      case 'importQuestions': return adminImportQuestions(args[0], args[1]); 
      case 'deleteQuestion': return adminDeleteQuestion(args[0], args[1]);
      // UPDATED: submitAnswers now expects 7 arguments (startTime as last)
      case 'submitAnswers': return submitAnswers(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      case 'getDashboardData': return getDashboardData();
      case 'getUsers': return getUsers(); 
      case 'importUsers': return adminImportUsers(args[0]); 
      case 'saveUser': return adminSaveUser(args[0]); 
      case 'deleteUser': return adminDeleteUser(args[0]); 
      case 'saveToken': return saveConfig('TOKEN', args[0]);
      case 'saveConfig': return saveConfig(args[0], args[1]); 
      case 'assignTestGroup': return assignTestGroup(args[0], args[1], args[2]);
      case 'resetLogin': return resetLogin(args[0]);
      default: return { error: "Action not found: " + action };
    }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- LOGGING ---
function logUserActivity(username, fullname, action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEET_LOGS);
      logSheet.appendRow(["Timestamp", "Username", "Nama", "Action", "Details"]);
    }
    logSheet.appendRow([new Date(), username, fullname, action, details]);
  } catch (e) {
    console.error("Logging failed", e);
  }
}

// --- LOGIC ---

function loginUser(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputUser = String(username).trim().toLowerCase();
  const inputPass = String(password).trim();

  // 1. Check Admins Sheet First
  const adminSheet = ss.getSheetByName(SHEET_ADMINS);
  if (adminSheet) {
    const data = adminSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        const dbUser = String(data[i][1]).trim().toLowerCase();
        const dbPass = String(data[i][2]).trim();

        if (dbUser === inputUser && dbPass === inputPass) {
             const role = data[i][3];
             return {
                success: true,
                user: { 
                    username: data[i][1], 
                    role: role, 
                    fullname: data[i][4], 
                    gender: data[i][5] || '-', 
                    school: data[i][6] || '-' 
                }
             };
        }
    }
  }

  // 2. Check Students (Users) Sheet
  const userSheet = ss.getSheetByName(SHEET_USERS);
  if (userSheet) {
    const data = userSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (!data[i][1]) continue;
      const dbUser = String(data[i][1]).trim().toLowerCase();
      const dbPass = String(data[i][2]).trim();

      if (dbUser === inputUser && dbPass === inputPass) {
        // Students are always 'siswa' even if column says otherwise (security)
        const fullname = data[i][4] || dbUser;
        const gender = data[i][5] || '-';
        const school = data[i][6] || '-';
        const active_exam = data[i][7] || '-'; // Column H: Active Exam
        const session = data[i][8] || '-';     // Column I: Session
        
        logUserActivity(dbUser, fullname, "LOGIN", "Success");
        
        return {
          success: true,
          user: { 
              username: data[i][1], 
              role: 'siswa', 
              fullname: fullname, 
              gender: gender, 
              school: school,
              active_exam: active_exam,
              session: session
          }
        };
      }
    }
  }
  
  return { success: false, message: "Username/Password salah" };
}

// UPDATED: Start Exam with Resume Logic
function startExam(username, fullname, subject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(SHEET_LOGS);
  let startTime = new Date().getTime(); // Default to now
  let isResuming = false;

  if (logSheet) {
    const data = logSheet.getDataRange().getValues();
    
    for (let i = data.length - 1; i >= 1; i--) {
        const rowUser = String(data[i][1]).toLowerCase();
        const rowAction = String(data[i][3]).toUpperCase();
        const rowDetail = String(data[i][4]); // Subject usually here

        if (rowUser === String(username).toLowerCase()) {
            if (rowAction === 'FINISH' && rowDetail.includes(subject)) {
                break; 
            }
            if (rowAction === 'START' && rowDetail === subject) {
                // Found an active start for this subject
                startTime = new Date(data[i][0]).getTime();
                isResuming = true;
                break;
            }
        }
    }
  }

  // Always log the "Attempt" to start/resume
  logUserActivity(username, fullname, isResuming ? "RESUME" : "START", subject);

  return { success: true, startTime: startTime, isResuming: isResuming };
}

// NEW: Check User Status (For Force Logout)
function checkUserStatus(username) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) return { status: 'OK' };

    const data = logSheet.getDataRange().getValues();
    // Scan backwards to find the LAST action for this user
    for (let i = data.length - 1; i >= 1; i--) {
        const rowUser = String(data[i][1]).toLowerCase();
        if (rowUser === String(username).toLowerCase()) {
            const action = String(data[i][3]).toUpperCase();
            if (action === 'RESET') {
                return { status: 'RESET' };
            }
            if (action === 'FINISH') {
                return { status: 'FINISHED' };
            }
            // If START, LOGIN, RESUME -> OK
            return { status: 'OK' };
        }
    }
    return { status: 'OK' };
}

function assignTestGroup(usernames, examId, session) {
  // Only for Students in SHEET_USERS
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  if (!sheet) return { success: false, message: "Sheet Users not found" };
  
  const data = sheet.getDataRange().getValues();
  if (data[0].length < 9) {
     sheet.getRange(1, 8).setValue("Active_Exam");
     sheet.getRange(1, 9).setValue("Session");
  }

  const userMap = new Map();
  usernames.forEach(u => userMap.set(String(u).toLowerCase(), true));

  for (let i = 1; i < data.length; i++) {
    const dbUser = String(data[i][1]).toLowerCase();
    if (userMap.has(dbUser)) {
        sheet.getRange(i + 1, 8).setValue(examId); 
        sheet.getRange(i + 1, 9).setValue(session); 
    }
  }
  
  return { success: true };
}

function resetLogin(username) {
  // Just logs a RESET. The frontend polls for this and the dashboard interprets it as Offline.
  logUserActivity(username, "Admin Reset", "RESET", "Manual Reset by Admin");
  return { success: true };
}

function getUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = [];

  // 1. Fetch Students
  const uSheet = ss.getSheetByName(SHEET_USERS);
  if (uSheet) {
      const data = uSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        users.push({
          id: data[i][0] || `U${i}`,
          username: data[i][1],
          password: data[i][2],
          role: 'siswa',
          fullname: data[i][4],
          gender: data[i][5],
          school: data[i][6],
          active_exam: data[i][7] || '-', 
          session: data[i][8] || '-'      
        });
      }
  }

  // 2. Fetch Admins
  const aSheet = ss.getSheetByName(SHEET_ADMINS);
  if (aSheet) {
      const data = aSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        users.push({
          id: data[i][0] || `A${i}`,
          username: data[i][1],
          password: data[i][2],
          role: data[i][3], // admin_pusat or admin_sekolah
          fullname: data[i][4],
          gender: data[i][5],
          school: data[i][6],
          active_exam: '-', 
          session: '-'      
        });
      }
  }

  return users;
}

// Helper to remove row by ID from a specific sheet
function removeUserFromSheet(sheetName, userId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    for(let i=1; i<data.length; i++) {
        if(String(data[i][0]) === String(userId)) {
            sheet.deleteRow(i+1);
            return true;
        }
    }
    return false;
}

// NEW: Save User (Create or Update)
function adminSaveUser(userData) {
    const isStudent = (userData.role === 'siswa');
    const targetSheetName = isStudent ? SHEET_USERS : SHEET_ADMINS;
    const otherSheetName = isStudent ? SHEET_ADMINS : SHEET_USERS;

    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(targetSheetName);
        if (isStudent) {
            sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session"]);
        } else {
            sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School"]);
        }
    }

    // Check if ID exists in the OTHER sheet (meaning role changed), delete it there
    if (userData.id) {
        removeUserFromSheet(otherSheetName, userData.id);
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    // Check if updating existing user in TARGET sheet
    if (userData.id) {
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]) === String(userData.id)) {
                rowIndex = i + 1;
                break;
            }
        }
    }

    // New ID generation if creating
    const id = userData.id || (isStudent ? 'U' : 'A') + new Date().getTime();
    
    let rowValues = [];
    if (isStudent) {
        rowValues = [
            id,
            userData.username,
            userData.password,
            'siswa',
            userData.fullname,
            userData.gender || '-',
            userData.school || '-',
            userData.active_exam || '-',
            userData.session || '-'
        ];
    } else {
        // Admin
        rowValues = [
            id,
            userData.username,
            userData.password,
            userData.role,
            userData.fullname,
            userData.gender || '-',
            userData.school || '-'
        ];
    }

    if (rowIndex > 0) {
        // Update existing row
        // Preserve existing fields if not provided/modified (mostly relevant for Students active_exam/session)
        if (isStudent) {
             // If we are strictly saving profile, keep active_exam/session from DB if frontend sent empty/default
             // Frontend sends current values if available, so overwriting is usually fine.
             // But let's be safe:
             if (!userData.active_exam && data[rowIndex-1][7]) rowValues[7] = data[rowIndex-1][7];
             if (!userData.session && data[rowIndex-1][8]) rowValues[8] = data[rowIndex-1][8];
        }
        
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
        // Append new row
        sheet.appendRow(rowValues);
    }

    return { success: true, message: "User saved successfully" };
}

// NEW: Delete User
function adminDeleteUser(userId) {
    // Try delete from Users
    if (removeUserFromSheet(SHEET_USERS, userId)) return { success: true, message: "Student deleted" };
    // Try delete from Admins
    if (removeUserFromSheet(SHEET_ADMINS, userId)) return { success: true, message: "Admin deleted" };
    
    return { success: false, message: "User not found" };
}

function adminImportUsers(usersList) {
    if (!Array.isArray(usersList) || usersList.length === 0) {
        return { success: false, message: "Data kosong" };
    }

    const students = [];
    const admins = [];

    usersList.forEach((u, index) => {
        const isStudent = (u.role === 'siswa');
        const id = u.id || (isStudent ? 'U' : 'A') + new Date().getTime() + '-' + index;
        
        if (isStudent) {
            students.push([
                id, u.username, u.password, 'siswa', u.fullname, u.gender || '-', u.school || '-', '-', '-'
            ]);
        } else {
            admins.push([
                id, u.username, u.password, u.role, u.fullname, u.gender || '-', u.school || '-'
            ]);
        }
    });

    // Save Students
    if (students.length > 0) {
        let sSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
        if (!sSheet) {
            sSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_USERS);
            sSheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session"]);
        }
        sSheet.getRange(sSheet.getLastRow() + 1, 1, students.length, 9).setValues(students);
    }

    // Save Admins
    if (admins.length > 0) {
        let aSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMINS);
        if (!aSheet) {
            aSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_ADMINS);
            aSheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School"]);
        }
        aSheet.getRange(aSheet.getLastRow() + 1, 1, admins.length, 7).setValues(admins);
    }

    return { success: true, message: `Berhasil mengimpor ${students.length} siswa dan ${admins.length} admin.` };
}

function getSubjectList() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const subjects = sheets.map(s => s.getName()).filter(n => !SYSTEM_SHEETS.includes(n));
  const duration = getConfigValue('DURATION', 60);
  return { subjects: subjects, duration: Number(duration) };
}

function getConfigValue(key, defaultValue) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return defaultValue;
  const data = sheet.getDataRange().getValues();
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]).toUpperCase() === key.toUpperCase()) return data[i][1];
  }
  return defaultValue;
}

function saveConfig(key, value) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_CONFIG);
    sheet.appendRow(["Key", "Value"]);
  }
  const data = sheet.getDataRange().getValues();
  let found = false;
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]).toUpperCase() === key.toUpperCase()) {
      sheet.getRange(i+1, 2).setValue(value);
      found = true; 
      break;
    }
  }
  if (!found) sheet.appendRow([key.toUpperCase(), value]);
  return { success: true, value: value };
}

function getQuestionsFromSheet(subject) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(subject);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const questions = [];
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === "") continue;
    const qId = String(data[i][0]);
    const options = [];
    const letters = ['A', 'B', 'C', 'D'];
    
    const type = data[i][2] || 'PG';
    
    if (type === 'PG' || type === 'PGK') {
      for(let j=0; j<4; j++) {
         if(data[i][4+j]) options.push({ id: `${qId}-${letters[j]}`, text_jawaban: data[i][4+j] });
      }
    } else if (type === 'BS') {
       for(let j=0; j<4; j++) {
         if(data[i][4+j]) options.push({ id: `${qId}-S${j+1}`, text_jawaban: data[i][4+j] });
      }
    }
    
    questions.push({
      id: qId,
      text: data[i][1],
      type: type,
      image: data[i][3],
      options: options,
      bobot_nilai: data[i][9] ? Number(data[i][9]) : 10
    });
  }
  return questions;
}

function adminGetQuestions(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const res = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    res.push({
      id: data[i][0], text_soal: data[i][1], tipe_soal: data[i][2] || "PG", gambar: data[i][3],
      opsi_a: data[i][4], opsi_b: data[i][5], opsi_c: data[i][6], opsi_d: data[i][7],
      kunci_jawaban: data[i][8], bobot: data[i][9] ? Number(data[i][9]) : 0
    });
  }
  return res;
}

function adminSaveQuestion(sheetName, qData) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot"]);
  }
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(qData.id)) { rowIndex = i + 1; break; }
  }
  const rowVals = [qData.id, qData.text_soal, qData.tipe_soal, qData.gambar||"", qData.opsi_a||"", qData.opsi_b||"", qData.opsi_c||"", qData.opsi_d||"", qData.kunci_jawaban, qData.bobot];
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, 10).setValues([rowVals]);
  else sheet.appendRow(rowVals);
  
  return { success: true, message: "Saved" };
}

function adminImportQuestions(sheetName, questionsList) {
  if (!Array.isArray(questionsList) || questionsList.length === 0) {
    return { success: false, message: "Data kosong" };
  }

  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot"]);
  }

  const newRows = questionsList.map(q => [
      q.id, q.text_soal, q.tipe_soal || 'PG', q.gambar || '',
      q.opsi_a || '', q.opsi_b || '', q.opsi_c || '', q.opsi_d || '',
      q.kunci_jawaban || '', q.bobot || 10
  ]);

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, newRows.length, 10).setValues(newRows);
  
  return { success: true, message: `Berhasil mengimpor ${newRows.length} soal.` };
}

function adminDeleteQuestion(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false };
}

function submitAnswers(username, fullname, school, subject, answers, scoreInfo, startTimeEpoch) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Server-side current time (Realtime Finish)
  const now = new Date(); 
  const timeZone = "Asia/Jakarta"; 
  
  answers = answers || {};

  const qSheet = ss.getSheetByName(subject);
  if (!qSheet) return { success: false, message: "Mapel tidak ditemukan" };
  
  // Calculate Duration Logic (Realtime Server)
  // startTimeEpoch passed from client, but it originated from server startExam
  const startDt = new Date(Number(startTimeEpoch));
  const diff = Math.max(0, now.getTime() - startDt.getTime());
  
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const durationStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  
  // Create readable strings for spreadsheet
  const timestamp = now;
  // NOTE: We don't rely on client string formats anymore to ensure consistency
  // startStr/endStr aren't columns in all sheets, mainly durationStr is used
  
  const qData = qSheet.getDataRange().getValues();
  
  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  
  const itemAnalysis = {};      
  const itemAnalysisRow = [];   
  const rawAnswersRow = [];     

  // We loop starting from row 1 (header is 0)
  for (let i = 1; i < qData.length; i++) {
    const row = qData[i];
    // Skip empty rows
    if (String(row[0]) === "") continue;

    const qId = String(row[0]);
    const qType = row[2];
    const keyRaw = String(row[8] || "").toUpperCase().trim();
    const weight = row[9] ? Number(row[9]) : 10;
    
    let isCorrect = false;
    const userAns = answers[qId];
    let ansStr = ""; 

    if (userAns !== undefined && userAns !== null) {
        if (qType === 'PG') {
            const val = String(userAns).split('-').pop(); 
            ansStr = val;
            if (val === keyRaw) isCorrect = true;
        } 
        else if (qType === 'PGK') {
            const keys = keyRaw.split(',').map(k=>k.trim());
            const uVals = Array.isArray(userAns) ? userAns.map(u => u.split('-').pop()) : [];
            ansStr = uVals.join(',');
            if (uVals.length === keys.length && keys.every(k => uVals.includes(k))) {
                isCorrect = true;
            }
        } 
        else if (qType === 'BS') {
            const keys = keyRaw.split(',').map(k=>k.trim());
            const uVals = []; 
            let allMatch = true;
            if (keys.length > 0) {
                for(let k=0; k<keys.length; k++) {
                   const subId = `${qId}-S${k+1}`;
                   const uBool = userAns[subId]; 
                   const keyBool = (keys[k] === 'B' || keys[k] === 'TRUE');
                   uVals.push(uBool ? 'B' : 'S');
                   if (uBool !== keyBool) allMatch = false;
                }
                ansStr = uVals.join(',');
                if (allMatch) isCorrect = true;
            }
        }
    } else {
        ansStr = "-";
    }

    // Scoring Logic
    if (isCorrect) {
        totalScore += weight;
        correctCount++;
    } else {
        wrongCount++;
    }

    // Analysis Logic (Strictly Number 1 or 0)
    const scoreVal = isCorrect ? 1 : 0;
    itemAnalysis[qId] = scoreVal;
    
    // Ensure we push strictly numbers to avoid weird formatting in sheets
    if (itemAnalysisRow.length < 100) { // Limit to 100 Questions
        itemAnalysisRow.push(scoreVal); 
    }
    
    if (rawAnswersRow.length < 100) {
        rawAnswersRow.push(ansStr);
    }
  }

  // Fill remaining slots with empty string or 0 to align columns in spreadsheet
  // We use empty string to not clutter the view for unused columns
  while(itemAnalysisRow.length < 100) itemAnalysisRow.push("");
  while(rawAnswersRow.length < 100) rawAnswersRow.push("");

  const finalScore = totalScore;

  // --- WRITE TO SHEET_RESULTS (Nilai) ---
  let shNilai = ss.getSheetByName(SHEET_RESULTS);
  if (!shNilai) {
      shNilai = ss.insertSheet(SHEET_RESULTS);
      shNilai.appendRow(["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Nilai", "Analisis_JSON", "Durasi"]);
  }
  shNilai.appendRow([timestamp, username, fullname, school, subject, finalScore, JSON.stringify(itemAnalysis), durationStr]);
  
  // --- WRITE TO SHEET_REKAP (Rekap_Analisis) ---
  let shRekap = ss.getSheetByName(SHEET_REKAP);
  if (!shRekap) {
      shRekap = ss.insertSheet(SHEET_REKAP);
      const h = ["Waktu Selesai", "Nama Peserta", "Asal Sekolah", "Mapel", "Durasi", "Benar", "Salah", "Nilai", "Detail Penilaian"];
      for(let k=1; k<=100; k++) h.push(`Q${k}`);
      shRekap.appendRow(h);
  }
  
  const rekapRow = [timestamp, fullname, school, subject, durationStr, correctCount, wrongCount, finalScore, JSON.stringify(itemAnalysis)];
  // Combine arrays: Metadata + Item Analysis (0/1)
  shRekap.appendRow(rekapRow.concat(itemAnalysisRow));

  // --- WRITE TO SHEET_JAWABAN (Raw Answers) ---
  let shJawab = ss.getSheetByName(SHEET_JAWABAN);
  if (!shJawab) {
      shJawab = ss.insertSheet(SHEET_JAWABAN);
      const h = ["Waktu Selesai", "Nama Peserta", "Asal Sekolah", "Mapel", "Nilai"];
      for(let k=1; k<=100; k++) h.push(`Q${k}`);
      shJawab.appendRow(h);
  }
  const jawabRow = [timestamp, fullname, school, subject, finalScore];
  shJawab.appendRow(jawabRow.concat(rawAnswersRow));
  
  // --- WRITE TO SHEET_RANKING (Ranking) ---
  let shRank = ss.getSheetByName(SHEET_RANKING);
  if (!shRank) {
      shRank = ss.insertSheet(SHEET_RANKING);
      shRank.appendRow(["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Durasi", "Nilai"]);
  }
  shRank.appendRow([timestamp, username, fullname, school, subject, durationStr, finalScore]);

  logUserActivity(username, fullname, "FINISH", `${subject}: ${finalScore}`);
  
  return { success: true, score: finalScore };
}

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName(SHEET_USERS);
  const users = {};
  let totalUsers = 0;
  
  if (uSheet) {
    const d = uSheet.getDataRange().getDisplayValues();
    for(let i=1; i<d.length; i++) {
        const role = String(d[i][3]).toLowerCase();
        if (role === 'siswa') {
            users[String(d[i][1]).toLowerCase()] = { 
                username: d[i][1], 
                fullname: d[i][4], 
                school: d[i][6], 
                status: 'OFFLINE',
                active_exam: d[i][7] || '-', 
                session: d[i][8] || '-' 
            };
            totalUsers++;
        }
    }
  }

  const rSheet = ss.getSheetByName(SHEET_RESULTS);
  const students = [];
  const qMap = {};
  
  if (rSheet) {
    const d = rSheet.getDataRange().getDisplayValues();
    for(let i=1; i<d.length; i++) {
       if(!d[i][0]) continue;
       const uname = String(d[i][1]).toLowerCase();
       let analysis = {};
       try { analysis = JSON.parse(d[i][6]); } catch(e){}
       
       students.push({
           timestamp: d[i][0], username: d[i][1], fullname: d[i][2], school: d[i][3], 
           subject: d[i][4], score: Number(d[i][5]), itemAnalysis: analysis, duration: d[i][7]
       });
       
       if(users[uname]) {
           users[uname].status = 'FINISHED';
           users[uname].score = d[i][5];
       }
       
       if (!qMap[d[i][4]]) qMap[d[i][4]] = Object.keys(analysis).map(k=>({id:k}));
    }
  }

  const lSheet = ss.getSheetByName(SHEET_LOGS);
  const feed = [];
  const seenUsersInFeed = new Set(); 

  if (lSheet) {
      const d = lSheet.getDataRange().getDisplayValues(); 
      for(let i=d.length-1; i>=1; i--) {
          const uname = String(d[i][1]).toLowerCase();
          const act = String(d[i][3]).toUpperCase();

          if (users[uname] && users[uname].status !== 'FINISHED') {
             if (!seenUsersInFeed.has(uname)) {
                  if (act === 'START' || act === 'RESUME') users[uname].status = 'WORKING';
                  else if (act === 'LOGIN') users[uname].status = 'LOGGED_IN';
                  else if (act === 'RESET') users[uname].status = 'OFFLINE'; 
             }
          }

          if (!seenUsersInFeed.has(uname)) {
              seenUsersInFeed.add(uname);
              if (feed.length < 20) {
                  const school = users[uname] ? users[uname].school : '-';
                  let subject = '-';
                  if (act === 'START' || act === 'RESUME') {
                      subject = d[i][4];
                  } else if (act === 'FINISH') {
                      const det = String(d[i][4]);
                      subject = det.includes(':') ? det.split(':')[0] : det;
                  }

                  feed.push({ 
                      timestamp: d[i][0], 
                      username: d[i][1], 
                      fullname: d[i][2], 
                      action: act, 
                      details: d[i][4],
                      school: school,
                      subject: subject
                  });
              }
          }
      }
  }

  const counts = { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
  Object.values(users).forEach(u => {
      if (counts[u.status] !== undefined) {
         counts[u.status]++;
      }
  });

  const token = getConfigValue('TOKEN', 'TOKEN');
  const duration = getConfigValue('DURATION', 60);

  return { 
    students, 
    questionsMap: qMap, 
    totalUsers, 
    token: token, 
    duration: duration,
    statusCounts: counts, 
    activityFeed: feed,
    allUsers: Object.values(users)
  };
}