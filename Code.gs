
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
const SHEET_SCHEDULE = "Jadwal_Sekolah"; // Kolom: Nama_Sekolah, Gelombang, Tanggal_Mulai, Tanggal_Selesai
// New Sheets for Survey
const SHEET_SURVEY_KARAKTER = "Survey_Karakter";
const SHEET_SURVEY_LINGKUNGAN = "Survey_Lingkungan";
const SHEET_REKAP_SURVEY = "Rekap_Survey";

const SYSTEM_SHEETS = [
    SHEET_USERS, SHEET_ADMINS, SHEET_CONFIG, SHEET_RESULTS, SHEET_REKAP, SHEET_JAWABAN, SHEET_RANKING, SHEET_LOGS, SHEET_SCHEDULE,
    SHEET_REKAP_SURVEY
];

/* ENTRY POINT: doPost */
function doPost(e) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);

  if (!hasLock) {
    return responseJSON({ error: "Server Busy (Lock Timeout). Please try again." });
  }

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
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
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
      case 'submitAnswers': return submitAnswers(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
      case 'getDashboardData': return getDashboardData();
      case 'getUsers': return getUsers(); 
      case 'importUsers': return adminImportUsers(args[0]); 
      case 'saveUser': return adminSaveUser(args[0]); 
      case 'deleteUser': return adminDeleteUser(args[0]); 
      case 'saveToken': return saveConfig('TOKEN', args[0]);
      case 'saveConfig': return saveConfig(args[0], args[1]); 
      case 'assignTestGroup': return assignTestGroup(args[0], args[1], args[2]);
      case 'updateUserSessions': return updateUserSessions(args[0]); 
      case 'resetLogin': return resetLogin(args[0]);
      case 'getSchoolSchedules': return getSchoolSchedules();
      case 'saveSchoolSchedules': return saveSchoolSchedules(args[0]);
      case 'submitSurvey': return submitSurvey(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      case 'adminGetSurveyRecap': return adminGetSurveyRecap(args[0]);
      case 'getRecapData': return getRecapData(); 
      case 'getAnalysisData': return getAnalysisData(args[0]); 
      case 'saveMaxQuestions': return saveConfig('MAX_QUESTIONS', args[0]);
      case 'saveDuration': return saveConfig('DURATION', args[0]);
      case 'saveSurveyDuration': return saveConfig('SURVEY_DURATION', args[0]);
      default: return { error: "Action not found: " + action };
    }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- HELPER FUNCTIONS ---

function toSheetValue(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.length > 1 && str.startsWith('0') && /^\d+$/.test(str)) {
    return "'" + str;
  }
  return val;
}

function saveImageToDrive(base64Data, filename) {
  try {
    if (!base64Data || !base64Data.includes(",")) return "";
    const folderName = "CBT_User_Photos";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) folder = folders.next();
    else {
      folder = DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    const splitData = base64Data.split(",");
    const type = splitData[0].split(':')[1].split(';')[0];
    const base64Content = splitData[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), type, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://drive.google.com/uc?id=" + file.getId();
  } catch (e) {
    console.error("Image upload failed: " + e.toString());
    return "";
  }
}

function logUserActivity(username, fullname, action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEET_LOGS);
      logSheet.appendRow(["Timestamp", "Username", "Nama", "Action", "Details"]);
    }
    logSheet.appendRow([new Date(), username, fullname, action, details]);
  } catch (e) { console.error("Logging failed", e); }
}

// Helper to set status in User Sheet (Column 12 / Index 11)
function setUserStatus(username, status) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
    if (!sheet) return;
    
    // Check/Add Header if missing
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.length < 12) {
        sheet.getRange(1, 12).setValue("Status");
    }

    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]).toLowerCase().trim() === String(username).toLowerCase().trim()) {
        sheet.getRange(i + 1, 12).setValue(status);
        return;
      }
    }
  } catch(e) { console.error("Set Status Failed", e); }
}

// --- AUTH & USER MANAGEMENT ---

function loginUser(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputUser = String(username).trim().toLowerCase();
  const inputPass = String(password).trim();

  const adminSheet = ss.getSheetByName(SHEET_ADMINS);
  if (adminSheet) {
    const data = adminSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        const dbUser = String(data[i][1]).trim().toLowerCase();
        const dbPass = String(data[i][2]).trim();
        if (dbUser === inputUser && dbPass === inputPass) {
             const role = data[i][3];
             const schoolName = data[i][6] || '-';
             if (role === 'admin_sekolah') {
                 const schSheet = ss.getSheetByName(SHEET_SCHEDULE);
                 if (schSheet) {
                     const schData = schSheet.getDataRange().getDisplayValues();
                     const todayDate = new Date();
                     const todayStr = Utilities.formatDate(todayDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
                     let scheduleFound = false;
                     let isDateMatch = false;
                     let scheduledStart = "-";
                     let scheduledEnd = "-";
                     for(let k=1; k<schData.length; k++) {
                         if (String(schData[k][0]).toLowerCase() === String(schoolName).toLowerCase()) {
                             scheduleFound = true;
                             scheduledStart = schData[k][2];
                             scheduledEnd = schData[k][3] || scheduledStart;
                             if (todayStr >= scheduledStart && todayStr <= scheduledEnd) isDateMatch = true;
                             break;
                         }
                     }
                     if (scheduleFound && !isDateMatch) {
                         const msgDate = (scheduledStart === scheduledEnd) ? scheduledStart : `${scheduledStart} s.d ${scheduledEnd}`;
                         return { success: false, message: `Login Ditolak. Jadwal ujian sekolah Anda adalah ${msgDate}, hari ini ${todayStr}. Hubungi Admin Pusat.` };
                     }
                 }
             }
             return { success: true, user: { username: data[i][1], role: role, fullname: data[i][4], gender: data[i][5] || '-', school: schoolName, kecamatan: data[i][7] || '-', photo_url: data[i][8] || '' } };
        }
    }
  }

  const userSheet = ss.getSheetByName(SHEET_USERS);
  if (userSheet) {
    const data = userSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (!data[i][1]) continue;
      const dbUser = String(data[i][1]).trim().toLowerCase();
      const dbPass = String(data[i][2]).trim();
      if (dbUser === inputUser && dbPass === inputPass) {
        logUserActivity(dbUser, data[i][4], "LOGIN", "Success");
        setUserStatus(dbUser, "LOGGED_IN"); // Update status column
        return { success: true, user: { username: data[i][1], role: 'siswa', fullname: data[i][4], gender: data[i][5] || '-', school: data[i][6] || '-', kecamatan: data[i][9] || '-', active_exam: data[i][7] || '-', session: data[i][8] || '-', photo_url: data[i][10] || '' } };
      }
    }
  }
  return { success: false, message: "Username/Password salah" };
}

function getUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = [];
  const uSheet = ss.getSheetByName(SHEET_USERS);
  if (uSheet) {
      const data = uSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        users.push({ id: data[i][0] || `U${i}`, username: data[i][1], password: data[i][2], role: 'siswa', fullname: data[i][4], gender: data[i][5], school: data[i][6], active_exam: data[i][7] || '-', session: data[i][8] || '-', kecamatan: data[i][9] || '-', photo_url: data[i][10] || '' });
      }
  }
  const aSheet = ss.getSheetByName(SHEET_ADMINS);
  if (aSheet) {
      const data = aSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1]) continue;
        users.push({ id: data[i][0] || `A${i}`, username: data[i][1], password: data[i][2], role: data[i][3], fullname: data[i][4], gender: data[i][5], school: data[i][6], kecamatan: data[i][7] || '-', active_exam: '-', session: '-', photo_url: data[i][8] || '' });
      }
  }
  return users;
}

function removeUserFromSheet(sheetName, userId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return false;
    const data = sheet.getDataRange().getDisplayValues();
    for(let i=1; i<data.length; i++) { if(String(data[i][0]) === String(userId)) { sheet.deleteRow(i+1); return true; } }
    return false;
}

function adminSaveUser(userData) {
    const isStudent = (userData.role === 'siswa');
    const targetSheetName = isStudent ? SHEET_USERS : SHEET_ADMINS;
    const otherSheetName = isStudent ? SHEET_ADMINS : SHEET_USERS;
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(targetSheetName);
        if (isStudent) sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session", "Kecamatan", "Photo", "Status"]);
        else sheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Kecamatan", "Photo"]);
    }
    if (userData.id) removeUserFromSheet(otherSheetName, userData.id);
    const data = sheet.getDataRange().getDisplayValues();
    let rowIndex = -1;
    if (userData.id) { for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(userData.id)) { rowIndex = i + 1; break; } } }
    const id = userData.id || (isStudent ? 'U' : 'A') + new Date().getTime();
    let photoUrl = "";
    if (userData.photo && userData.photo.startsWith("data:image")) {
        const fileName = `${id}_${userData.username}.jpg`;
        photoUrl = saveImageToDrive(userData.photo, fileName);
    } else if (userData.photo_url) { photoUrl = userData.photo_url; } 
    else if (rowIndex > 0) { 
        const colIndex = isStudent ? 10 : 8; 
        if (data[rowIndex - 1][colIndex]) photoUrl = data[rowIndex - 1][colIndex]; 
    }
    
    // Preserve existing status if updating
    let currentStatus = "";
    if (isStudent && rowIndex > 0 && data[rowIndex-1].length > 11) {
        currentStatus = data[rowIndex-1][11];
    }

    let rowValues = [];
    if (isStudent) { rowValues = [ toSheetValue(id), toSheetValue(userData.username), toSheetValue(userData.password), 'siswa', userData.fullname, userData.gender || '-', userData.school || '-', userData.active_exam || '-', userData.session || '-', userData.kecamatan || '-', photoUrl, currentStatus ]; } 
    else { rowValues = [ toSheetValue(id), toSheetValue(userData.username), toSheetValue(userData.password), userData.role, userData.fullname, userData.gender || '-', userData.school || '-', userData.kecamatan || '-', photoUrl ]; }
    
    if (rowIndex > 0) {
        if (isStudent) { if (!userData.active_exam && data[rowIndex-1][7]) rowValues[7] = data[rowIndex-1][7]; if (!userData.session && data[rowIndex-1][8]) rowValues[8] = data[rowIndex-1][8]; }
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else { sheet.appendRow(rowValues); }
    return { success: true, message: "User saved successfully" };
}

function adminDeleteUser(userId) {
    if (removeUserFromSheet(SHEET_USERS, userId)) return { success: true, message: "Student deleted" };
    if (removeUserFromSheet(SHEET_ADMINS, userId)) return { success: true, message: "Admin deleted" };
    return { success: false, message: "User not found" };
}

function adminImportUsers(usersList) {
    if (!Array.isArray(usersList) || usersList.length === 0) return { success: false, message: "Data kosong" };
    const students = []; const admins = [];
    usersList.forEach((u, index) => {
        const isStudent = (u.role === 'siswa');
        const id = u.id || (isStudent ? 'U' : 'A') + new Date().getTime() + '-' + index;
        if (isStudent) { students.push([ toSheetValue(id), toSheetValue(u.username), toSheetValue(u.password), 'siswa', u.fullname, u.gender || '-', u.school || '-', '-', '-', u.kecamatan || '-', u.photo_url || '', '' ]); } // Empty status
        else { admins.push([ toSheetValue(id), toSheetValue(u.username), toSheetValue(u.password), u.role, u.fullname, u.gender || '-', u.school || '-', u.kecamatan || '-', '' ]); }
    });
    if (students.length > 0) {
        let sSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
        if (!sSheet) { sSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_USERS); sSheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Active_Exam", "Session", "Kecamatan", "Photo", "Status"]); }
        sSheet.getRange(sSheet.getLastRow() + 1, 1, students.length, 12).setValues(students);
    }
    if (admins.length > 0) {
        let aSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMINS);
        if (!aSheet) { aSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_ADMINS); aSheet.appendRow(["ID", "Username", "Password", "Role", "Fullname", "Gender", "School", "Kecamatan", "Photo"]); }
        aSheet.getRange(aSheet.getLastRow() + 1, 1, admins.length, 9).setValues(admins);
    }
    return { success: true, message: `Berhasil mengimpor ${students.length} siswa dan ${admins.length} admin.` };
}

// --- EXAM & QUESTION MANAGEMENT ---

function getSubjectList() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  const subjects = sheets.map(s => s.getName()).filter(n => !SYSTEM_SHEETS.includes(n) && n !== SHEET_SURVEY_KARAKTER && n !== SHEET_SURVEY_LINGKUNGAN);
  
  const duration = getConfigValue('DURATION', 60);
  const maxQuestions = getConfigValue('MAX_QUESTIONS', 0);
  const surveyDuration = getConfigValue('SURVEY_DURATION', 30);
  
  return { 
      subjects: subjects, 
      duration: Number(duration), 
      maxQuestions: Number(maxQuestions),
      surveyDuration: Number(surveyDuration)
  };
}

function getConfigValue(key, defaultValue) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return defaultValue;
  const data = sheet.getDataRange().getDisplayValues();
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
  const data = sheet.getDataRange().getDisplayValues();
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
  const data = sheet.getDataRange().getDisplayValues();
  const questions = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === "") continue;
    const qId = String(data[i][0]);
    const options = [];
    const letters = ['A', 'B', 'C', 'D'];
    const type = data[i][2] || 'PG';
    if (type === 'PG' || type === 'PGK') {
      for(let j=0; j<4; j++) { if(data[i][4+j]) options.push({ id: `${qId}-${letters[j]}`, text_jawaban: data[i][4+j] }); }
    } else if (type === 'BS') {
       for(let j=0; j<4; j++) { if(data[i][4+j]) options.push({ id: `${qId}-S${j+1}`, text_jawaban: data[i][4+j] }); }
    } else if (type === 'LIKERT') {
       const pLabels = ['P1', 'P2', 'P3', 'P4'];
       for(let j=0; j<4; j++) { if(data[i][4+j]) options.push({ id: `${qId}-${pLabels[j]}`, text_jawaban: data[i][4+j] }); }
    }
    
    // index 10 is 'keterangan_gambar' (new field)
    questions.push({ 
        id: qId, 
        text: data[i][1], 
        type: type, 
        image: data[i][3], 
        options: options, 
        bobot_nilai: data[i][9] ? Number(data[i][9]) : 10,
        keterangan_gambar: data[i][10] || "" // Added caption
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
        id: data[i][0], 
        text_soal: data[i][1], 
        tipe_soal: data[i][2] || "PG", 
        gambar: data[i][3], 
        opsi_a: data[i][4], 
        opsi_b: data[i][5], 
        opsi_c: data[i][6], 
        opsi_d: data[i][7], 
        kunci_jawaban: data[i][8], 
        bobot: data[i][9] ? Number(data[i][9]) : 0,
        keterangan_gambar: data[i][10] || "" // Added caption
    });
  }
  return res;
}

function adminSaveQuestion(sheetName, qData) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) { 
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName); 
      sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot", "Ket. Gambar"]); 
  }
  const data = sheet.getDataRange().getDisplayValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(qData.id)) { rowIndex = i + 1; break; } }
  
  const rowVals = [
      toSheetValue(qData.id), 
      qData.text_soal, 
      qData.tipe_soal, 
      qData.gambar||"", 
      qData.opsi_a||"", 
      qData.opsi_b||"", 
      qData.opsi_c||"", 
      qData.opsi_d||"", 
      qData.kunci_jawaban, 
      qData.bobot,
      qData.keterangan_gambar || "" // Added caption
  ];
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowVals.length).setValues([rowVals]);
  else sheet.appendRow(rowVals);
  
  return { success: true, message: "Saved" };
}

function adminImportQuestions(sheetName, questionsList) {
  if (!Array.isArray(questionsList) || questionsList.length === 0) return { success: false, message: "Data kosong" };
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) { 
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName); 
      sheet.appendRow(["ID Soal", "Teks Soal", "Tipe Soal", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot", "Ket. Gambar"]); 
  }
  
  const newRows = questionsList.map(q => [ 
      toSheetValue(q.id), 
      q.text_soal, 
      q.tipe_soal || 'PG', 
      q.gambar || '', 
      q.opsi_a || '', 
      q.opsi_b || '', 
      q.opsi_c || '', 
      q.opsi_d || '', 
      q.kunci_jawaban || '', 
      q.bobot || 10,
      q.keterangan_gambar || '' // Added caption
  ]);
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, newRows.length, 11).setValues(newRows);
  return { success: true, message: `Berhasil mengimpor ${newRows.length} soal.` };
}

function adminDeleteQuestion(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { success: false };
  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { success: true }; } }
  return { success: false };
}

function startExam(username, fullname, subject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(SHEET_LOGS);
  let startTime = new Date().getTime(); 
  let isResuming = false;
  if (logSheet) {
    const data = logSheet.getDataRange().getValues(); 
    for (let i = data.length - 1; i >= 1; i--) {
        const rowUser = String(data[i][1]).toLowerCase();
        const rowAction = String(data[i][3]).toUpperCase();
        const rowDetail = String(data[i][4]); 
        if (rowUser === String(username).toLowerCase()) {
            if (rowAction === 'FINISH' && rowDetail.includes(subject)) break; 
            if (rowAction === 'START' && rowDetail === subject) {
                startTime = new Date(data[i][0]).getTime();
                isResuming = true;
                break;
            }
        }
    }
  }
  logUserActivity(username, fullname, isResuming ? "RESUME" : "START", subject);
  setUserStatus(username, "WORKING"); // Update Status
  return { success: true, startTime: startTime, isResuming: isResuming };
}

function checkUserStatus(username) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_USERS);
    if (!sheet) return { status: 'OK' };
    
    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase().trim() === String(username).toLowerCase().trim()) {
            // Check status column (Index 11)
            const status = String(data[i][11] || "").toUpperCase();
            if (status === 'OFFLINE') return { status: 'RESET' };
            if (status === 'FINISHED') return { status: 'FINISHED' };
            return { status: 'OK' };
        }
    }
    return { status: 'OK' };
}

function submitAnswers(username, fullname, school, subject, answers, scoreInfo, startTimeEpoch, displayedCount, questionIds) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date(); 
  answers = answers || {};

  const qSheet = ss.getSheetByName(subject);
  if (!qSheet) return { success: false, message: "Mapel tidak ditemukan" };
  
  const startDt = new Date(Number(startTimeEpoch));
  const diff = Math.max(0, now.getTime() - startDt.getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const durationStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  
  const timestamp = now;
  const qData = qSheet.getDataRange().getDisplayValues();
  
  const questionWeights = {};
  for (let i = 1; i < qData.length; i++) {
      const row = qData[i];
      if (String(row[0]) === "") continue;
      const qId = String(row[0]);
      const weight = row[9] ? Number(row[9]) : 10;
      questionWeights[qId] = weight;
  }

  let maxWeight = 0;
  let targetIds = questionIds && Array.isArray(questionIds) && questionIds.length > 0 ? questionIds : Object.keys(questionWeights);
  const validQuestionSet = new Set(targetIds);

  targetIds.forEach(id => {
      if (questionWeights[id] !== undefined) maxWeight += questionWeights[id];
  });

  let obtainedWeight = 0;
  let correctCount = 0;
  const itemAnalysis = {};      
  const itemAnalysisRow = [];   
  const rawAnswersRow = [];     

  for (let i = 1; i < qData.length; i++) {
    const row = qData[i];
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
            if (uVals.length === keys.length && keys.every(k => uVals.includes(k))) isCorrect = true;
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

    if (validQuestionSet.has(qId)) {
        if (isCorrect) {
            obtainedWeight += weight; 
            correctCount++;
        }
    }

    const scoreVal = isCorrect ? 1 : 0;
    itemAnalysis[qId] = scoreVal;
    if (itemAnalysisRow.length < 100) itemAnalysisRow.push(scoreVal); 
    if (rawAnswersRow.length < 100) rawAnswersRow.push(ansStr);
  }

  let wrongCount = 0;
  if (displayedCount && Number(displayedCount) > 0) wrongCount = Number(displayedCount) - correctCount;
  else wrongCount = (qData.length - 1) - correctCount; 
  if (wrongCount < 0) wrongCount = 0;

  while(itemAnalysisRow.length < 100) itemAnalysisRow.push("");
  while(rawAnswersRow.length < 100) rawAnswersRow.push("");

  let finalScore = 0;
  if (maxWeight > 0) {
      finalScore = (obtainedWeight / maxWeight) * 100;
      finalScore = parseFloat(finalScore.toFixed(2));
  }

  const safeUsername = toSheetValue(username);

  let shNilai = ss.getSheetByName(SHEET_RESULTS);
  if (!shNilai) {
      shNilai = ss.insertSheet(SHEET_RESULTS);
      shNilai.appendRow(["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Nilai", "Analisis_JSON", "Durasi"]);
  }
  shNilai.appendRow([timestamp, safeUsername, fullname, school, subject, finalScore, JSON.stringify(itemAnalysis), durationStr]);
  
  let shRekap = ss.getSheetByName(SHEET_REKAP);
  if (!shRekap) {
      shRekap = ss.insertSheet(SHEET_REKAP);
      const h = ["Waktu Selesai", "Nama Peserta", "Asal Sekolah", "Mapel", "Durasi", "Benar", "Salah", "Nilai", "Detail Penilaian"];
      for(let k=1; k<=100; k++) h.push(`Q${k}`);
      shRekap.appendRow(h);
  }
  const rekapRow = [timestamp, fullname, school, subject, durationStr, correctCount, wrongCount, finalScore, JSON.stringify(itemAnalysis)];
  shRekap.appendRow(rekapRow.concat(itemAnalysisRow));

  let shJawab = ss.getSheetByName(SHEET_JAWABAN);
  if (!shJawab) {
      shJawab = ss.insertSheet(SHEET_JAWABAN);
      const h = ["Waktu Selesai", "Nama Peserta", "Asal Sekolah", "Mapel", "Nilai"];
      for(let k=1; k<=100; k++) h.push(`Q${k}`);
      shJawab.appendRow(h);
  }
  const jawabRow = [timestamp, fullname, school, subject, finalScore];
  shJawab.appendRow(jawabRow.concat(rawAnswersRow));
  
  let shRank = ss.getSheetByName(SHEET_RANKING);
  if (!shRank) {
      shRank = ss.insertSheet(SHEET_RANKING);
      shRank.appendRow(["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Durasi", "Nilai"]);
  }
  shRank.appendRow([timestamp, safeUsername, fullname, school, subject, durationStr, finalScore]);

  logUserActivity(username, fullname, "FINISH", `${subject}: ${finalScore}`);
  setUserStatus(username, "FINISHED"); // Update Status
  
  return { success: true, score: finalScore };
}

// --- SESSION & SCHEDULE MANAGEMENT ---

function assignTestGroup(usernames, examId, session) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  if (!sheet) return { success: false, message: "Sheet Users not found" };
  const data = sheet.getDataRange().getDisplayValues();
  if (data[0].length < 9) { sheet.getRange(1, 8).setValue("Active_Exam"); sheet.getRange(1, 9).setValue("Session"); }
  const userMap = new Map();
  usernames.forEach(u => userMap.set(String(u).toLowerCase(), true));
  for (let i = 1; i < data.length; i++) {
    const dbUser = String(data[i][1]).toLowerCase();
    if (userMap.has(dbUser)) { sheet.getRange(i + 1, 8).setValue(examId); if(session) sheet.getRange(i + 1, 9).setValue(session); }
  }
  return { success: true };
}

function updateUserSessions(updates) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  if (!sheet) return { success: false, message: "Sheet Users not found" };
  const data = sheet.getDataRange().getDisplayValues();
  if (data[0].length < 9) sheet.getRange(1, 9).setValue("Session");
  const updateMap = new Map();
  updates.forEach(u => updateMap.set(String(u.username).toLowerCase(), u.session));
  for (let i = 1; i < data.length; i++) {
    const dbUser = String(data[i][1]).toLowerCase();
    if (updateMap.has(dbUser)) { const newSession = updateMap.get(dbUser); sheet.getRange(i + 1, 9).setValue(newSession); }
  }
  return { success: true };
}

function resetLogin(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userSheet = ss.getSheetByName(SHEET_USERS);
  let fullname = "Admin Reset";
  
  if (userSheet) {
      const data = userSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
          if (String(data[i][1]).toLowerCase().trim() === String(username).toLowerCase().trim()) {
              fullname = data[i][4]; // Get real name
              break; 
          }
      }
  }
  // Ensure "RESET" action is logged
  logUserActivity(username, fullname, "RESET", "Manual Reset by Admin");
  
  // Directly update Status to OFFLINE
  setUserStatus(username, "OFFLINE");
  SpreadsheetApp.flush();
  
  return { success: true };
}

function getSchoolSchedules() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SCHEDULE);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const schedules = [];
  for(let i=1; i<data.length; i++) {
    if(data[i][0]) { schedules.push({ school: data[i][0], gelombang: data[i][1], tanggal: data[i][2], tanggal_selesai: data[i][3] || data[i][2] }); }
  }
  return schedules;
}

function saveSchoolSchedules(schedules) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SCHEDULE);
  if (!sheet) { sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_SCHEDULE); sheet.appendRow(["Nama_Sekolah", "Gelombang", "Tanggal_Mulai", "Tanggal_Selesai"]); }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  if (headers.length < 4) { sheet.getRange(1, 4).setValue("Tanggal_Selesai"); }
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) { sheet.getRange(2, 1, lastRow - 1, 4).clearContent(); }
  if (schedules.length > 0) { const rows = schedules.map(s => [ s.school, s.gelombang, s.tanggal, s.tanggal_selesai || s.tanggal ]); sheet.getRange(2, 1, rows.length, 4).setValues(rows); }
  return { success: true };
}

// --- SURVEY LOGIC ---

function submitSurvey(username, fullname, school, kecamatan, surveyType, answers, startTimeEpoch) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();
  const startDt = new Date(Number(startTimeEpoch));
  const diff = Math.max(0, now.getTime() - startDt.getTime());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const durationStr = `${m}m ${s}s`;

  let sheet = ss.getSheetByName(SHEET_REKAP_SURVEY);
  if (!sheet) {
      sheet = ss.insertSheet(SHEET_REKAP_SURVEY);
      const header = ["Timestamp", "Username", "Nama", "Sekolah", "Kecamatan", "Jenis Survey", "Durasi", "Total Skor", "Rata-rata"];
      for(let k=1; k<=50; k++) header.push(`S${k}`);
      sheet.appendRow(header);
  }
  
  const qSheet = ss.getSheetByName(surveyType);
  let orderedIDs = [];
  if (qSheet) {
      const qData = qSheet.getDataRange().getDisplayValues();
      for(let i=1; i<qData.length; i++) {
          if (qData[i][0]) orderedIDs.push(String(qData[i][0]));
      }
  } else {
      for(let i=1; i<=50; i++) orderedIDs.push(`S${i}`);
  }

  let totalScore = 0;
  let count = 0;
  const answerValues = [];
  
  for (let i = 0; i < orderedIDs.length; i++) {
      const key = orderedIDs[i];
      if (answers[key]) {
          let val = Number(answers[key]);
          if (val < 1) val = 1;
          if (val > 4) val = 4;
          totalScore += val;
          count++;
          answerValues.push(val);
      } else {
          answerValues.push("");
      }
  }
  
  const avg = count > 0 ? (totalScore / count).toFixed(2) : 0;
  while(answerValues.length < 50) answerValues.push("");

  sheet.appendRow([now, toSheetValue(username), fullname, school, kecamatan, surveyType.replace('Survey_', ''), durationStr, totalScore, avg].concat(answerValues));
  logUserActivity(username, fullname, "SURVEY", `${surveyType} (Score: ${totalScore})`);
  return { success: true };
}

function adminGetSurveyRecap(surveyType) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_REKAP_SURVEY);
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getDisplayValues();
    if(data.length < 2) return []; 
    
    const header = data[0]; 
    const typeFilter = surveyType.replace('Survey_', '').toLowerCase().trim(); 
    
    const h = {};
    header.forEach((val, idx) => { h[String(val).toLowerCase().trim()] = idx; });
    
    let idxJenis = h["jenis survey"];
    if (idxJenis === undefined) idxJenis = h["jenissurvey"];
    if (idxJenis === undefined) idxJenis = h["jenis_survey"];
    if (idxJenis === undefined && header.length > 5) idxJenis = 5; 

    const results = [];
    for(let i=1; i<data.length; i++) {
        // Robust value extraction for filtering
        const cellValue = idxJenis !== undefined && data[i].length > idxJenis 
                          ? (data[i][idxJenis] === null ? "" : String(data[i][idxJenis])) 
                          : "";
        const rowType = cellValue.toLowerCase().trim();
        const isMatch = rowType === typeFilter || rowType.includes(typeFilter) || typeFilter.includes(rowType);
        
        if(isMatch) {
            const items = {};
            header.forEach((colName, colIdx) => {
                if(colName && (/^S\d+$/.test(colName) || /^S\d+\s+/.test(colName))) {
                    items[colName] = (data[i].length > colIdx) ? data[i][colIdx] : "";
                }
            });

            const getVal = (keys, fallbackIdx) => {
                for(const k of keys) if (h[k] !== undefined && data[i].length > h[k]) return data[i][h[k]];
                if (fallbackIdx !== undefined && data[i].length > fallbackIdx) return data[i][fallbackIdx];
                return "";
            };

            results.push({
                timestamp: getVal(["timestamp", "waktu"], 0),
                username: getVal(["username", "user"], 1),
                nama: getVal(["nama", "nama peserta"], 2),
                sekolah: getVal(["sekolah", "asal sekolah"], 3),
                kecamatan: getVal(["kecamatan", "wilayah"], 4),
                durasi: getVal(["durasi", "waktu pengerjaan"], 6),
                total: getVal(["total skor", "total", "nilai"], 7),
                rata: getVal(["rata-rata", "rata", "mean"], 8),
                items: items 
            });
        }
    }
    return results;
}

// --- DATA FEED & ANALYTICS ---

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = {};
  let totalUsers = 0;

  const uSheet = ss.getSheetByName(SHEET_USERS);
  if (uSheet) {
    const d = uSheet.getDataRange().getDisplayValues();
    for(let i=1; i<d.length; i++) {
        let role = String(d[i][3]).trim().toLowerCase();
        if (!role) role = 'siswa';
        const uname = String(d[i][1]).trim().toLowerCase();
        if (uname) {
            // READ STATUS FROM COLUMN 12 (Index 11)
            const rawStatus = d[i][11] || 'OFFLINE';
            users[uname] = { 
                username: d[i][1], 
                fullname: d[i][4], 
                school: d[i][6], 
                kecamatan: d[i][9] || '-', 
                status: rawStatus, 
                active_exam: d[i][7] || '-', 
                session: d[i][8] || '-', 
                role: role,
                photo_url: d[i][10] || '' 
            };
            if (role === 'siswa') totalUsers++;
        }
    }
  }

  const aSheet = ss.getSheetByName(SHEET_ADMINS);
  if (aSheet) {
      const ad = aSheet.getDataRange().getDisplayValues();
      for(let i=1; i<ad.length; i++) {
          const uname = String(ad[i][1]).trim().toLowerCase();
          if (uname && !users[uname]) {
              users[uname] = { 
                  username: ad[i][1], 
                  fullname: ad[i][4], 
                  school: ad[i][6] || '-', 
                  kecamatan: ad[i][7] || '-', 
                  status: 'OFFLINE', 
                  active_exam: '-', 
                  session: '-', 
                  role: String(ad[i][3]).trim().toLowerCase(),
                  photo_url: ad[i][8] || '' 
              };
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
       const uname = String(d[i][1]).trim().toLowerCase();
       let analysis = {};
       try { analysis = JSON.parse(d[i][6]); } catch(e){}
       const displayUsername = users[uname] ? users[uname].username : d[i][1];
       const displayKecamatan = users[uname] ? users[uname].kecamatan : '-';
       students.push({ timestamp: d[i][0], username: displayUsername, fullname: d[i][2], school: d[i][3], kecamatan: displayKecamatan, subject: d[i][4], score: Number(d[i][5]), itemAnalysis: analysis, duration: d[i][7] });
       
       if (!qMap[d[i][4]]) qMap[d[i][4]] = Object.keys(analysis).map(k=>({id:k}));
    }
  }

  const lSheet = ss.getSheetByName(SHEET_LOGS);
  const feed = [];
  if (lSheet) {
      const d = lSheet.getDataRange().getDisplayValues(); 
      for(let i=d.length-1; i>=1; i--) {
          const uname = String(d[i][1]).trim().toLowerCase();
          const act = String(d[i][3]).toUpperCase();
          
          if (feed.length < 20) {
              const school = users[uname] ? users[uname].school : '-';
              const kecamatan = users[uname] ? users[uname].kecamatan : '-'; 
              let subject = '-';
              if (act === 'START' || act === 'RESUME') subject = d[i][4];
              else if (act === 'FINISH') { const det = String(d[i][4]); subject = det.includes(':') ? det.split(':')[0] : det; } 
              else if (act === 'SURVEY') subject = "Survey: " + d[i][4];
              feed.push({ timestamp: d[i][0], username: d[i][1], fullname: d[i][2], action: act, details: d[i][4], school: school, kecamatan: kecamatan, subject: subject });
          }
      }
  }

  const counts = { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
  Object.values(users).forEach(u => { 
      if (u.role === 'siswa') {
          // Fallback if status in sheet is unexpected
          const st = u.status || 'OFFLINE';
          if (counts[st] !== undefined) counts[st]++;
          else counts['OFFLINE']++;
      }
  });
  
  const token = getConfigValue('TOKEN', 'TOKEN');
  const duration = getConfigValue('DURATION', 60);
  const maxQuestions = getConfigValue('MAX_QUESTIONS', 0);
  const surveyDuration = getConfigValue('SURVEY_DURATION', 30); 
  const schedules = getSchoolSchedules();
  
  return { 
    students, 
    questionsMap: qMap, 
    totalUsers, 
    token: token, 
    duration: duration, 
    maxQuestions: maxQuestions, 
    surveyDuration: surveyDuration, 
    statusCounts: counts, 
    activityFeed: feed, 
    allUsers: Object.values(users),
    schedules: schedules 
  };
}

function getRecapData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues();
  const results = [];
  for(let i=1; i<data.length; i++) {
    if(!data[i][0]) continue;
    results.push({ timestamp: data[i][0], username: data[i][1], nama: data[i][2], sekolah: data[i][3], mapel: data[i][4], nilai: data[i][5], analisis: data[i][6], durasi: data[i][7] });
  }
  return results;
}

function getAnalysisData(subject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RESULTS);
  if (!sheet) return { averageScore: 0, highestScore: 0, lowestScore: 0 };
  const data = sheet.getDataRange().getDisplayValues();
  const scores = [];
  for(let i=1; i<data.length; i++) {
    if(!data[i][0]) continue;
    if(String(data[i][4]).toLowerCase() === String(subject).toLowerCase()) {
       const s = parseFloat(data[i][5]);
       if(!isNaN(s)) scores.push(s);
    }
  }
  if (scores.length === 0) return { averageScore: 0, highestScore: 0, lowestScore: 0 };
  const sum = scores.reduce((a,b) => a+b, 0);
  const avg = (sum / scores.length).toFixed(2);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return { averageScore: avg, highestScore: max, lowestScore: min };
}
