import { User, Exam, QuestionWithOptions, QuestionRow } from '../types';

// The Apps Script Web App URL provided
const GAS_EXEC_URL = "https://script.google.com/macros/s/AKfycbygibUMdsomw8fA5QmHn_LIFc_fMxfKs3Piyjvlwr7BO6-Sg-prC0tQW6VNcWfMAnwe/exec";

// Check if running inside GAS iframe
const isEmbedded = typeof window !== 'undefined' && window.google && window.google.script;

// Helper to call backend functions
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

  // 2. Remote Mode (Fetch to Exec URL)
  if (GAS_EXEC_URL) {
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
          console.error(`API Call '${fnName}' failed:`, error);
          throw error;
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
            jenis_kelamin: result.user.gender, // Map gender from backend
            kelas_id: result.user.school
        };
    }
    
    return null;
  },

  // Log Start Exam
  startExam: async (username: string, fullname: string, subject: string): Promise<void> => {
      await callBackend('startExam', username, fullname, subject);
  },

  // Get Exams / Subject List
  getExams: async (): Promise<Exam[]> => {
    const subjects: string[] = await callBackend('getSubjectList') as string[];
    if (Array.isArray(subjects)) {
        return subjects.map((s) => ({
            id: s,
            nama_ujian: s,
            waktu_mulai: new Date().toISOString(),
            durasi: 60,
            token_akses: 'TOKEN', 
            is_active: true
        }));
    }
    return [];
  },

  // Get Server Token
  getServerToken: async (): Promise<string> => {
      return await callBackend('getTokenFromConfig') as string;
  },

  // Save Token
  saveToken: async (newToken: string): Promise<{success: boolean}> => {
      return await callBackend('saveToken', newToken);
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
            is_correct: false // Hidden in frontend
        })) : []
    }));
  },

  // --- ADMIN CRUD ---
  // Get Raw Questions (For Editor)
  getRawQuestions: async (subject: string): Promise<QuestionRow[]> => {
      const result = await callBackend('getRawQuestions', subject);
      if (Array.isArray(result)) {
          return result;
      }
      return [];
  },
  
  // Save Question (Create/Update)
  saveQuestion: async (subject: string, data: QuestionRow): Promise<{success: boolean, message: string}> => {
      return await callBackend('saveQuestion', subject, data);
  },

  // Delete Question
  deleteQuestion: async (subject: string, id: string): Promise<{success: boolean, message: string}> => {
      return await callBackend('deleteQuestion', subject, id);
  },

  // Submit Exam
  submitExam: async (payload: { user: User, subject: string, answers: any, startTime: number }) => {
      const endTime = Date.now();
      const startStr = new Date(payload.startTime).toLocaleTimeString();
      const endStr = new Date(endTime).toLocaleTimeString();
      
      const diff = endTime - payload.startTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const durationStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

      const scoreInfo = { total: 0, answered: Object.keys(payload.answers).length };

      return await callBackend(
          'submitAnswers', 
          payload.user.username, 
          payload.user.nama_lengkap, 
          payload.user.kelas_id, 
          payload.subject, 
          payload.answers, 
          scoreInfo, 
          startStr, 
          endStr, 
          durationStr
      );
  },
  
  // Dashboard Data
  getDashboardData: async () => {
      return await callBackend('getDashboardData');
  }
};