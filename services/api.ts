


import { User, Exam, QuestionWithOptions, QuestionRow, SchoolSchedule } from '../types';

// The Apps Script Web App URL provided
const GAS_EXEC_URL = "https://script.google.com/macros/s/AKfycbyv3iJsSYKluyxnE57P8sHASIZvcvpRrND2ZnjaDRA57fX_IfMcVpN90GVpSL-WatE/exec";

// Check if running inside GAS iframe
const isEmbedded = typeof window !== 'undefined' && window.google && window.google.script;

// Helper to call backend functions with RETRY Logic
const callBackend = async (fnName: string, ...args: any[]) => {
  // 1. Embedded Mode (GoogleScript Run)
  if (isEmbedded) {
    return new Promise((resolve, reject) => {
      window.google!.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [fnName](...args);
    });
  }

  // 2. Remote Mode (Fetch to Exec URL) with Retry
  if (GAS_EXEC_URL) {
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
          try {
              // Add timestamp to prevent caching
              const url = `${GAS_EXEC_URL}?t=${new Date().getTime()}`;
              
              const response = await fetch(url, {
                  redirect: "follow", 
                  method: 'POST',
                  headers: {
                     'Content-Type': 'text/plain;charset=utf-8', 
                  },
                  body: JSON.stringify({ action: fnName, args: args })
              });
              
              if (!response.ok) {
                  // Usually 404 or 500
                  throw new Error(`Server Error (${response.status}). Check deployment URL.`);
              }
              
              const text = await response.text();
              try {
                  return JSON.parse(text);
              } catch (e) {
                  console.error("Invalid JSON received:", text);
                  if (text.includes("Google Drive") || text.includes("Google Docs")) {
                       throw new Error("HTML Response: The URL might be wrong or you need to re-deploy as 'Anyone'.");
                  }
                  if (text.includes("<!DOCTYPE html>")) {
                     throw new Error("Script Error: Check Apps Script 'Executions' log. Re-deploy new version.");
                  }
                  throw new Error("Invalid response from server");
              }

          } catch (error) {
              attempt++;
              console.warn(`API Call '${fnName}' failed (Attempt ${attempt}/${maxAttempts}):`, error);
              
              if (attempt === maxAttempts) {
                   // If final attempt fails, throw error
                   console.error(`API Call '${fnName}' gave up after ${maxAttempts} attempts.`);
                   throw error;
              }
              
              // Exponential backoff: 1s, 2s, etc.
              await new Promise(r => setTimeout(r, 1000 * attempt));
          }
      }
  }

  throw new Error("No backend connection available");
};

export const api = {
  // Unified Login Function
  login: async (username: string, password?: string): Promise<User | null> => {
    const result: any = await callBackend('login', username, password);
    
    if (result && result.success && result.user) {
        return {
            id: result.user.username,
            username: result.user.username,
            role: result.user.role,
            nama_lengkap: result.user.fullname,
            jenis_kelamin: result.user.gender, 
            kelas_id: result.user.school,
            kecamatan: result.user.kecamatan, 
            active_exam: result.user.active_exam, 
            session: result.user.session 
        };
    }
    
    return null;
  },

  // Start Exam
  startExam: async (username: string, fullname: string, subject: string): Promise<any> => {
      return await callBackend('startExam', username, fullname, subject);
  },

  // Check Status (For Polling Reset)
  checkStatus: async (username: string): Promise<string> => {
      const res: any = await callBackend('checkUserStatus', username);
      return res.status;
  },

  // Get Exams / Subject List
  getExams: async (): Promise<Exam[]> => {
    const response: any = await callBackend('getSubjectList');
    let subjects: string[] = [];
    let duration = 60;
    let maxQuestions = 0;
    let surveyDuration = 30; 

    if (Array.isArray(response)) {
        subjects = response;
    } else if (response && response.subjects) {
        subjects = response.subjects;
        duration = response.duration || 60;
        maxQuestions = response.maxQuestions || 0;
        surveyDuration = response.surveyDuration || 30;
    }

    if (subjects.length > 0) {
        return subjects.map((s) => ({
            id: s,
            nama_ujian: s,
            waktu_mulai: new Date().toISOString(),
            durasi: Number(duration),
            token_akses: 'TOKEN', 
            is_active: true,
            max_questions: Number(maxQuestions)
        })).concat([
            {
                id: 'Survey_Karakter',
                nama_ujian: 'Survey Karakter',
                waktu_mulai: new Date().toISOString(),
                durasi: Number(surveyDuration),
                token_akses: '',
                is_active: true,
                max_questions: 0
            },
            {
                id: 'Survey_Lingkungan',
                nama_ujian: 'Survey Lingkungan Belajar',
                waktu_mulai: new Date().toISOString(),
                durasi: Number(surveyDuration),
                token_akses: '',
                is_active: true,
                max_questions: 0
            }
        ]);
    }
    return [];
  },

  // Get Server Token
  getServerToken: async (): Promise<string> => {
      return await callBackend('getTokenFromConfig') as string;
  },

  // Save Token
  saveToken: async (newToken: string): Promise<{success: boolean}> => {
      return await callBackend('saveConfig', 'TOKEN', newToken);
  },
  
  // Save Duration
  saveDuration: async (minutes: number): Promise<{success: boolean}> => {
      return await callBackend('saveConfig', 'DURATION', minutes);
  },

  // Save Survey Duration
  saveSurveyDuration: async (minutes: number): Promise<{success: boolean}> => {
      return await callBackend('saveConfig', 'SURVEY_DURATION', minutes);
  },

  // Save Max Questions
  saveMaxQuestions: async (amount: number): Promise<{success: boolean}> => {
      return await callBackend('saveConfig', 'MAX_QUESTIONS', amount);
  },

  // Get Questions from Sheet (Formatted for Exam)
  getQuestions: async (subject: string): Promise<QuestionWithOptions[]> => {
    const data: any = await callBackend('getQuestionsFromSheet', subject);
    if (!Array.isArray(data)) return [];

    return data.map((q: any, i: number) => ({
        id: q.id || `Q${i+1}`,
        exam_id: subject,
        text_soal: q.text || "Pertanyaan tanpa teks",
        tipe_soal: q.type || 'PG',
        bobot_nilai: 10,
        gambar: q.image || undefined,
        options: Array.isArray(q.options) ? q.options.map((o: any, idx: number) => ({
            id: o.id || `opt-${i}-${idx}`,
            question_id: q.id || `Q${i+1}`,
            text_jawaban: o.text_jawaban || o.text || "", 
            is_correct: false 
        })) : []
    }));
  },

  // --- SURVEY SPECIFIC ---
  getSurveyQuestions: async (surveyType: 'Survey_Karakter' | 'Survey_Lingkungan'): Promise<QuestionWithOptions[]> => {
      const data: any = await callBackend('getQuestionsFromSheet', surveyType);
      if (!Array.isArray(data)) return [];

      return data.map((q: any, i: number) => ({
          id: q.id || `S${i+1}`,
          exam_id: surveyType,
          text_soal: q.text,
          tipe_soal: 'LIKERT',
          bobot_nilai: 0,
          options: Array.isArray(q.options) ? q.options.map((o: any, idx: number) => ({
              id: o.id,
              question_id: q.id,
              text_jawaban: o.text_jawaban || o.text || "",
              is_correct: false
          })) : []
      }));
  },

  submitSurvey: async (payload: { user: User, surveyType: string, answers: any, startTime: number }) => {
      return await callBackend('submitSurvey', payload.user.username, payload.user.nama_lengkap, payload.user.kelas_id, payload.surveyType, payload.answers, payload.startTime);
  },

  getSurveyRecap: async (surveyType: string): Promise<any[]> => {
      return await callBackend('adminGetSurveyRecap', surveyType);
  },

  // --- ADMIN CRUD ---
  getRawQuestions: async (subject: string): Promise<QuestionRow[]> => {
      const result = await callBackend('getRawQuestions', subject);
      if (Array.isArray(result)) {
          return result;
      }
      return [];
  },
  
  // Save Question
  saveQuestion: async (subject: string, data: QuestionRow): Promise<{success: boolean, message: string}> => {
      return await callBackend('saveQuestion', subject, data);
  },

  // Import Questions
  importQuestions: async (subject: string, data: QuestionRow[]): Promise<{success: boolean, message: string}> => {
      return await callBackend('importQuestions', subject, data);
  },

  // Delete Question
  deleteQuestion: async (subject: string, id: string): Promise<{success: boolean, message: string}> => {
      return await callBackend('deleteQuestion', subject, id);
  },

  // Get All Users
  getUsers: async (): Promise<any[]> => {
      return await callBackend('getUsers');
  },

  // Save User
  saveUser: async (userData: any): Promise<{success: boolean, message: string}> => {
      return await callBackend('saveUser', userData);
  },

  // Delete User
  deleteUser: async (userId: string): Promise<{success: boolean, message: string}> => {
      return await callBackend('deleteUser', userId);
  },

  // Import Users
  importUsers: async (users: any[]): Promise<{success: boolean, message: string}> => {
      return await callBackend('importUsers', users);
  },

  // Assign Test Group
  assignTestGroup: async (usernames: string[], examId: string, session: string): Promise<{success: boolean}> => {
      return await callBackend('assignTestGroup', usernames, examId, session);
  },

  // Update User Sessions
  updateUserSessions: async (updates: {username: string, session: string}[]): Promise<{success: boolean}> => {
      return await callBackend('updateUserSessions', updates);
  },

  // Reset Login
  resetLogin: async (username: string): Promise<{success: boolean}> => {
      return await callBackend('resetLogin', username);
  },
  
  // Get School Schedules
  getSchoolSchedules: async (): Promise<SchoolSchedule[]> => {
      return await callBackend('getSchoolSchedules');
  },

  // Save School Schedules
  saveSchoolSchedules: async (schedules: SchoolSchedule[]): Promise<{success: boolean}> => {
      return await callBackend('saveSchoolSchedules', schedules);
  },

  // Corrected function names to match Code.gs
  getRecap: async (): Promise<any[]> => {
      const res = await callBackend('getRecapData');
      if (!Array.isArray(res)) return [];
      return res;
  },

  getAnalysis: async (subject: string): Promise<any> => {
      return await callBackend('getAnalysisData', subject);
  },

  // Submit Exam
  submitExam: async (payload: { user: User, subject: string, answers: any, startTime: number, displayedQuestionCount?: number, questionIds?: string[] }) => {
      const scoreInfo = { total: 0, answered: Object.keys(payload.answers).length };
      return await callBackend(
          'submitAnswers', 
          payload.user.username, 
          payload.user.nama_lengkap, 
          payload.user.kelas_id, 
          payload.subject, 
          payload.answers, 
          scoreInfo, 
          payload.startTime,
          payload.displayedQuestionCount || 0, 
          payload.questionIds || [] 
      );
  },
  
  // Dashboard Data
  getDashboardData: async () => {
      return await callBackend('getDashboardData');
  }
};
