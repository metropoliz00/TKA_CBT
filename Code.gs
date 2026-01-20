
/* 
  CONFIGURATION
  Pastikan nama Sheet (Tab) di Google Spreadsheet sesuai dengan variabel di bawah ini.
*/
const SHEET_USERS = "Users";      
// Mapping Kolom Users Terbaru:
// A(0): ID, B(1): Username, C(2): Password, D(3): Role, E(4): Nama Lengkap, F(5): Jenis Kelamin, G(6): Kelas ID

const SHEET_CONFIG = "Config";    // A:Key, B:Value
const SHEET_RESULTS = "Nilai";    // Output Data (Nilai Akhir & Log JSON)
const SHEET_REKAP = "Rekap_Analisis"; // Output Analisis Item (1/0)
const SHEET_JAWABAN = "Jawaban";      // Output Jawaban Mentah (A/B/C)
const SHEET_RANKING = "Rangking";     // Output Ranking
const SHEET_LOGS = "Logs";            // Activity Logs

const SYSTEM_SHEETS = [SHEET_USERS, SHEET_CONFIG, SHEET_RESULTS, SHEET_REKAP, SHEET_JAWABAN, SHEET_RANKING, SHEET_LOGS];

/* ENTRY POINT: doPost */
function doPost(e) {
  try {
    // Robust parsing
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
      case 'getSubjectList': return getSubjectList();
      case 'getTokenFromConfig': return getTokenFromConfig();
      case 'getQuestionsFromSheet': return getQuestionsFromSheet(args[0]);
      case 'getRawQuestions': return adminGetQuestions(args[0]);
      case 'saveQuestion': return adminSaveQuestion(args[0], args[1]);
      case 'deleteQuestion': return adminDeleteQuestion(args[0], args[1]);
      case 'submitAnswers': return submitAnswers(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
      case 'getDashboardData': return getDashboardData();
      case 'saveToken': return saveToken(args[0]);
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
    // Ignore logging errors to prevent blocking main logic
    console.error("Logging failed", e);
  }
}

// --- LOGIC ---

function loginUser(username, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  if (!sheet) return { success: false, message: "Database Users tidak ditemukan" };
  
  const data = sheet.getDataRange().getDisplayValues();
  const inputUser = String(username).trim().toLowerCase();
  const inputPass = String(password).trim();

  for (let i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    const dbUser = String(data[i][1]).trim().toLowerCase();
    const dbPass = String(data[i][2]).trim();

    if (dbUser === inputUser && dbPass === inputPass) {
      let roleRaw = String(data[i][3]).trim().toLowerCase();
      let finalRole = (roleRaw === 'admin' || roleRaw.includes('admin')) ? (roleRaw === 'admin_sekolah' ? 'admin_sekolah' : 'admin_pusat') : 'siswa';
      const fullname = data[i][4] || dbUser;
      // New Structure: Index 5 is Gender, Index 6 is Class
      const gender = data[i][5] || '-';
      const school = data[i][6] || '-';
      
      if (finalRole === 'siswa') logUserActivity(dbUser, fullname, "LOGIN", "Success");
      
      return {
        success: true,
        user: { 
            username: data[i][1], 
            role: finalRole, 
            fullname: fullname, 
            gender: gender, 
            school: school 
        }
      };
    }
  }
  return { success: false, message: "Username/Password salah" };
}

function startExam(username, fullname, subject) {
  logUserActivity(username, fullname, "START", subject);
  return { success: true };
}

function getSubjectList() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  return sheets.map(s => s.getName()).filter(n => !SYSTEM_SHEETS.includes(n));
}

function getTokenFromConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) return "TOKEN";
  const data = sheet.getDataRange().getValues();
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]).toUpperCase() === 'TOKEN') return String(data[i][1]);
  }
  return "TOKEN";
}

function saveToken(newToken) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_CONFIG);
    sheet.appendRow(["Key", "Value"]);
  }
  const data = sheet.getDataRange().getValues();
  let found = false;
  for(let i=0; i<data.length; i++) {
    if(String(data[i][0]).toUpperCase() === 'TOKEN') {
      sheet.getRange(i+1, 2).setValue(newToken);
      found = true; 
      break;
    }
  }
  if (!found) sheet.appendRow(["TOKEN", newToken]);
  return { success: true, token: newToken };
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
    
    // Auto-detect type if missing based on usage? Default to PG
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

/* =========================================
   CORE FUNCTION: SUBMIT ANSWERS
   ========================================= */
function submitAnswers(username, fullname, school, subject, answers, scoreInfo, startStr, endStr, durationStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timestamp = new Date();
  answers = answers || {};

  // 1. Get Questions
  const qSheet = ss.getSheetByName(subject);
  if (!qSheet) return { success: false, message: "Mapel tidak ditemukan" };
  
  const qData = qSheet.getDataRange().getValues();
  
  // 2. Scoring & Analysis Logic
  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  
  const itemAnalysis = {};      // Object {Q1: 1, Q2: 0}
  const itemAnalysisRow = [];   // Array [1, 0, 1...] for Rekap Sheet
  const rawAnswersRow = [];     // Array ["A", "B", "A,C"...] for Jawaban Sheet

  // Loop through questions in the sheet
  for (let i = 1; i < qData.length; i++) {
    const row = qData[i];
    if (String(row[0]) === "") continue;

    const qId = String(row[0]);
    const qType = row[2];
    const keyRaw = String(row[8] || "").toUpperCase().trim();
    const weight = row[9] ? Number(row[9]) : 10;
    
    maxScore += weight;
    
    let isCorrect = false;
    const userAns = answers[qId];
    let ansStr = ""; // String representation of answer

    if (userAns !== undefined && userAns !== null) {
        // Pilihan Ganda
        if (qType === 'PG') {
            const val = String(userAns).split('-').pop(); // "Q1-A" -> "A"
            ansStr = val;
            if (val === keyRaw) isCorrect = true;
        } 
        // Pilihan Ganda Kompleks
        else if (qType === 'PGK') {
            const keys = keyRaw.split(',').map(k=>k.trim());
            const uVals = Array.isArray(userAns) ? userAns.map(u => u.split('-').pop()) : [];
            ansStr = uVals.join(',');
            if (uVals.length === keys.length && keys.every(k => uVals.includes(k))) {
                isCorrect = true;
            }
        } 
        // Benar Salah
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

    if (isCorrect) {
        totalScore += weight;
        correctCount++;
    } else {
        wrongCount++;
    }

    itemAnalysis[qId] = isCorrect ? 1 : 0;
    if (itemAnalysisRow.length < 50) itemAnalysisRow.push(isCorrect ? 1 : 0);
    if (rawAnswersRow.length < 50) rawAnswersRow.push(ansStr);
  }

  // Pad arrays to 50
  while(itemAnalysisRow.length < 50) itemAnalysisRow.push("");
  while(rawAnswersRow.length < 50) rawAnswersRow.push("");

  const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // 3. Save to Sheets
  let shNilai = ss.getSheetByName(SHEET_RESULTS);
  if (!shNilai) {
      shNilai = ss.insertSheet(SHEET_RESULTS);
      shNilai.appendRow(["Timestamp", "Username", "Nama", "Kelas", "Mapel", "Nilai", "Analisis_JSON", "Durasi"]);
  }
  shNilai.appendRow([timestamp, username, fullname, school, subject, finalScore, JSON.stringify(itemAnalysis), durationStr]);
  
  let shRekap = ss.getSheetByName(SHEET_REKAP);
  if (!shRekap) {
      shRekap = ss.insertSheet(SHEET_REKAP);
      const h = ["Waktu Selesai", "Nama Peserta", "Asal Sekolah", "Mapel", "Durasi", "Benar", "Salah", "Nilai"];
      for(let k=1; k<=50; k++) h.push(`Q${k}`);
      shRekap.appendRow(h);
  }
  shRekap.appendRow([timestamp, fullname, school, subject, durationStr, correctCount, wrongCount, finalScore, ...itemAnalysisRow]);

  let shJawab = ss.getSheetByName(SHEET_JAWABAN);
  if (!shJawab) {
      shJawab = ss.insertSheet(SHEET_JAWABAN);
      const h = ["Waktu Selesai", "Nama Peserta", "Asal Sekolah", "Mapel", "Nilai"];
      for(let k=1; k<=50; k++) h.push(`Q${k}`);
      shJawab.appendRow(h);
  }
  shJawab.appendRow([timestamp, fullname, school, subject, finalScore, ...rawAnswersRow]);
  
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
            // Mapping: Username at 1, Fullname at 4, School at 6 (was 5)
            users[String(d[i][1]).toLowerCase()] = { username: d[i][1], fullname: d[i][4], school: d[i][6], status: 'OFFLINE' };
            totalUsers++;
        }
    }
  }

  const rSheet = ss.getSheetByName(SHEET_RESULTS);
  const students = [];
  const qMap = {};
  
  if (rSheet) {
    const d = rSheet.getDataRange().getValues();
    for(let i=1; i<d.length; i++) {
       if(!d[i][0]) continue;
       const uname = String(d[i][1]).toLowerCase();
       let analysis = {};
       try { analysis = JSON.parse(d[i][6]); } catch(e){}
       
       students.push({
           timestamp: d[i][0], username: d[i][1], fullname: d[i][2], school: d[i][3], 
           subject: d[i][4], score: d[i][5], itemAnalysis: analysis, duration: d[i][7]
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
  if (lSheet) {
      const d = lSheet.getDataRange().getValues();
      for(let i=d.length-1; i>=1; i--) {
          const uname = String(d[i][1]).toLowerCase();
          const act = String(d[i][3]).toUpperCase();
          if (users[uname] && users[uname].status !== 'FINISHED') {
             if (act === 'START') users[uname].status = 'WORKING';
             else if (act === 'LOGIN' && users[uname].status === 'OFFLINE') users[uname].status = 'LOGGED_IN';
          }
          if (feed.length < 15) feed.push({ timestamp: d[i][0], username: d[i][1], fullname: d[i][2], action: act, details: d[i][4] });
      }
  }

  const counts = { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
  Object.values(users).forEach(u => {
      // Robust check
      if (counts[u.status] !== undefined) {
         counts[u.status]++;
      }
  });

  return { students, questionsMap: qMap, totalUsers, token: getTokenFromConfig(), statusCounts: counts, activityFeed: feed };
}
