// 1. Tabel Users
export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin_pusat' | 'admin_sekolah' | 'siswa';
  nama_lengkap: string;
  jenis_kelamin?: string; // New Field
  kelas_id: string; // Used for School Name
  active_exam?: string; // Assigned Exam
  session?: string; // Assigned Session
}

// 2. Tabel Exams (Ujian)
export interface Exam {
  id: string;
  nama_ujian: string;
  waktu_mulai: string; // ISO String
  durasi: number; // in minutes
  token_akses: string;
  is_active: boolean;
}

// 3. Tabel Questions (Bank Soal)
export type QuestionType = 'PG' | 'PGK' | 'BS';

export interface Question {
  id: string;
  exam_id: string;
  text_soal: string;
  gambar?: string;
  tipe_soal: QuestionType;
  bobot_nilai: number;
}

// Interface for Admin CRUD (Flat structure matching spreadsheet columns)
export interface QuestionRow {
  id: string;
  text_soal: string;
  tipe_soal: QuestionType;
  gambar: string;
  opsi_a: string;
  opsi_b: string;
  opsi_c: string;
  opsi_d: string;
  kunci_jawaban: string;
  bobot: number;
}

// 4. Tabel Options (Pilihan Jawaban)
export interface Option {
  id: string;
  question_id: string;
  text_jawaban: string;
  is_correct: boolean;
}

// 5. Tabel Student Exams (Hasil/Progres)
export interface StudentExam {
  id: string;
  user_id: string;
  exam_id: string;
  status: 'ongoing' | 'completed';
  nilai_akhir: number;
  waktu_submit?: string;
}

// 6. Tabel Answers (Jawaban Siswa)
export interface AnswerDB {
  id: string;
  student_exam_id: string;
  question_id: string;
  option_id: string; 
  answer_value?: string; 
  is_marked: boolean;
}

// UI State Helper Types
export interface QuestionWithOptions extends Question {
  options: Option[];
}

export type UserAnswerValue = string | string[] | Record<string, boolean>;

export interface ExamSessionState {
  answers: Record<string, UserAnswerValue>;
  doubtful: Record<string, boolean>;
  timeLeft: number;
  currentQuestionIndex: number;
}

// Google Apps Script Global Interface
declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (data: any) => void) => {
            withFailureHandler: (callback: (error: any) => void) => any;
          };
          [key: string]: any;
        };
      };
    };
  }
}