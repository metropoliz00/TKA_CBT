import React, { useState, useEffect } from 'react';
import { Clock, Check, ChevronLeft, ChevronRight, LayoutDashboard, Flag, Monitor, LogOut, Loader2, AlertTriangle, X } from 'lucide-react';
import { QuestionWithOptions, UserAnswerValue, Exam } from '../types';

interface StudentExamProps {
  exam: Exam;
  questions: QuestionWithOptions[];
  userFullName: string;
  onFinish: (answers: Record<string, UserAnswerValue>) => Promise<void> | void;
  onExit: () => void;
}

// Utility to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

const StudentExam: React.FC<StudentExamProps> = ({ exam, questions, userFullName, onFinish, onExit }) => {
  // State to hold shuffled questions
  const [examQuestions, setExamQuestions] = useState<QuestionWithOptions[]>([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswerValue>>({});
  const [doubtful, setDoubtful] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(exam.durasi * 60);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  // Initialize Randomization on Mount
  useEffect(() => {
    if (questions.length > 0) {
        // 1. Shuffle Options within each question
        const questionsWithShuffledOptions = questions.map(q => ({
            ...q,
            options: shuffleArray(q.options)
        }));
        
        // 2. Shuffle the Questions themselves
        const fullyShuffled = shuffleArray(questionsWithShuffledOptions);
        
        setExamQuestions(fullyShuffled);
    }
  }, [questions]);

  // Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          executeFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Wait until shuffling is done
  if (examQuestions.length === 0) {
      return <div className="h-screen flex items-center justify-center bg-slate-100"><div className="loader border-indigo-500"></div></div>;
  }

  const currentQ = examQuestions[currentIdx];

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (val: any, type: 'PG' | 'PGK' | 'BS', subId?: string) => {
    setAnswers((prev) => {
      const qId = currentQ.id;
      
      if (type === 'PG') {
        return { ...prev, [qId]: val };
      }
      
      if (type === 'PGK') {
        const currentArr = (prev[qId] as string[]) || [];
        if (currentArr.includes(val)) {
          return { ...prev, [qId]: currentArr.filter(id => id !== val) };
        } else {
          return { ...prev, [qId]: [...currentArr, val] };
        }
      }

      if (type === 'BS' && subId) {
        const currentObj = (prev[qId] as Record<string, boolean>) || {};
        return { ...prev, [qId]: { ...currentObj, [subId]: val } };
      }

      return prev;
    });
  };

  const handleFinishButton = () => {
    if (isSubmitting) return;
    setShowConfirmFinish(true);
  };

  const executeFinish = async () => {
    setShowConfirmFinish(false);
    setIsSubmitting(true);
    try {
      await onFinish(answers);
    } catch (error) {
      console.error("Error submitting:", error);
      setIsSubmitting(false);
      alert("Gagal mengirim jawaban. Silakan periksa koneksi internet anda dan coba lagi.");
    }
  };

  const handleExitClick = () => {
      if(confirm("Apakah anda yakin ingin keluar dari ujian? Progres mungkin tidak tersimpan.")) {
          onExit();
      }
  };

  const getFontSizeClass = () => {
    switch(fontSize) {
      case 'sm': return 'text-sm';
      case 'lg': return 'text-xl';
      default: return 'text-base';
    }
  };

  const isLastQuestion = currentIdx === examQuestions.length - 1;

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden noselect">
      {/* Header */}
      <header className="h-16 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200 flex justify-between items-center px-4 md:px-6 z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-indigo-200 shadow-md">
            <Monitor size={20} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm md:text-lg leading-tight tracking-tight">Computer Based Test</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <Clock size={18} className="text-indigo-600" />
            <span className={`font-mono font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          
          <div className="hidden md:block text-right">
             <div className="text-sm font-bold text-slate-800">{userFullName}</div>
             <div className="text-xs text-slate-500">{exam.nama_ujian}</div>
          </div>

          <button 
             onClick={handleExitClick}
             className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition"
             title="Logout / Exit"
          >
             <LogOut size={20} />
          </button>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition"
          >
            <LayoutDashboard size={18} /> <span className="hidden md:inline text-sm font-bold">Daftar Soal</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 w-full">
          <div className="max-w-[95%] md:max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 min-h-[600px] flex flex-col overflow-hidden">
            
            {/* Question Toolbar */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded">
                  SOAL NO. {currentIdx + 1}
                </span>
                {/* ID Soal Removed as requested */}
              </div>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {(['sm', 'md', 'lg'] as const).map(s => (
                  <button 
                    key={s} 
                    onClick={() => setFontSize(s)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition ${fontSize === s ? 'bg-slate-200 font-bold' : 'hover:bg-slate-50 text-slate-500'}`}
                  >
                    A{s === 'lg' ? '+' : s === 'sm' ? '-' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Content */}
            <div className={`p-8 flex-1 ${getFontSizeClass()} text-slate-700 leading-relaxed`}>
              <div className={`flex flex-col gap-8 ${currentQ.gambar ? 'lg:grid lg:grid-cols-2 lg:gap-10' : ''}`}>
                {currentQ.gambar && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center min-h-[300px]">
                        <img src={currentQ.gambar} alt="Soal" className="max-w-full h-auto rounded-lg shadow-sm max-h-[500px] object-contain" />
                    </div>
                )}
                
                <div className="flex flex-col gap-8">
                    <div className="font-medium whitespace-pre-wrap leading-relaxed text-justify">
                        {currentQ.text_soal}
                    </div>

                    {/* Options Render */}
                    <div className="space-y-4">
                        {currentQ.tipe_soal === 'PG' && currentQ.options.map((opt, idx) => {
                        const isSelected = answers[currentQ.id] === opt.id;
                        return (
                            <label 
                            key={opt.id}
                            className={`flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-md transform scale-[1.01]' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                            >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center mr-5 font-bold text-sm transition ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 text-slate-400 group-hover:border-indigo-400'}`}>
                                {isSelected ? <div className="w-2.5 h-2.5 bg-white rounded-full"/> : String.fromCharCode(65 + idx)}
                            </div>
                            <input 
                                type="radio" 
                                className="hidden" 
                                checked={isSelected} 
                                onChange={() => handleAnswer(opt.id, 'PG')} 
                            />
                            <div className={`flex-1 ${isSelected ? 'text-indigo-900 font-bold' : 'text-slate-700'}`}>
                                {opt.text_jawaban}
                            </div>
                            </label>
                        );
                        })}

                        {currentQ.tipe_soal === 'PGK' && currentQ.options.map((opt) => {
                        const currentArr = (answers[currentQ.id] as string[]) || [];
                        const isChecked = currentArr.includes(opt.id);
                        return (
                            <label 
                            key={opt.id}
                            className={`flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${isChecked ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                            >
                            <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center mr-5 transition ${isChecked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                {isChecked && <Check size={14} strokeWidth={4} />}
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={isChecked} 
                                onChange={() => handleAnswer(opt.id, 'PGK')} 
                            />
                            <div className="flex-1 text-slate-700 font-medium">
                                {opt.text_jawaban}
                            </div>
                            </label>
                        );
                        })}

                        {currentQ.tipe_soal === 'BS' && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-4">
                            <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                                <tr>
                                <th className="p-5">Pernyataan</th>
                                <th className="p-5 w-24 text-center">Benar</th>
                                <th className="p-5 w-24 text-center">Salah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {currentQ.options.map((opt) => {
                                const val = (answers[currentQ.id] as Record<string, boolean>)?.[opt.id];
                                return (
                                    <tr key={opt.id} className="hover:bg-slate-50 transition">
                                    <td className="p-5 font-medium text-slate-800">{opt.text_jawaban}</td>
                                    <td className="p-5 text-center">
                                        <label className="cursor-pointer block h-full w-full">
                                            <input 
                                                type="radio" 
                                                name={`bs-${opt.id}`}
                                                className="w-5 h-5 accent-emerald-500 cursor-pointer"
                                                checked={val === true}
                                                onChange={() => handleAnswer(true, 'BS', opt.id)}
                                            />
                                        </label>
                                    </td>
                                    <td className="p-5 text-center">
                                        <label className="cursor-pointer block h-full w-full">
                                            <input 
                                                type="radio" 
                                                name={`bs-${opt.id}`}
                                                className="w-5 h-5 accent-rose-500 cursor-pointer"
                                                checked={val === false}
                                                onChange={() => handleAnswer(false, 'BS', opt.id)}
                                            />
                                        </label>
                                    </td>
                                    </tr>
                                );
                                })}
                            </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar Navigation */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <LayoutDashboard size={18} /> Navigasi Soal
            </h3>
            <button onClick={()=>setIsSidebarOpen(false)} className="text-slate-400 p-1 hover:bg-slate-100 rounded">
                <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            <div className="grid grid-cols-5 gap-2">
              {examQuestions.map((q, idx) => {
                const isDoubt = doubtful[q.id];
                const hasAnswer = answers[q.id] && (
                  Array.isArray(answers[q.id]) ? (answers[q.id] as []).length > 0 :
                  typeof answers[q.id] === 'object' ? Object.keys(answers[q.id]).length > 0 :
                  true
                );
                const isActive = currentIdx === idx;
                
                let btnClass = "bg-white border-slate-200 text-slate-600 hover:border-indigo-400";
                if (isActive) btnClass = "bg-indigo-600 border-indigo-600 text-white ring-2 ring-indigo-200 shadow-md";
                else if (isDoubt) btnClass = "bg-yellow-400 border-yellow-500 text-yellow-900 font-bold";
                else if (hasAnswer) btnClass = "bg-slate-700 border-slate-700 text-white";

                return (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentIdx(idx); setIsSidebarOpen(false); }}
                    className={`aspect-square rounded-lg border font-bold text-sm transition-all duration-200 ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2 shadow-sm">
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-600 rounded"></div> Sedang Dikerjakan</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-700 rounded"></div> Sudah Dijawab</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded"></div> Ragu-ragu</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-slate-300 rounded"></div> Belum Dijawab</div>
            </div>
          </div>
        </aside>

      </div>

      {/* Footer Navigation Bar */}
      <footer className="bg-white border-t border-slate-200 p-4 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-[95%] md:max-w-7xl mx-auto flex justify-between items-center gap-2 md:gap-4">
          <button 
            onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
            disabled={currentIdx === 0 || isSubmitting}
            className={`px-4 md:px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition text-sm md:text-base ${currentIdx === 0 ? 'opacity-0 cursor-default' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          >
            <ChevronLeft size={18} /> <span className="hidden md:inline">SEBELUMNYA</span>
          </button>

          <label className="flex items-center gap-3 bg-yellow-50 px-5 py-2.5 rounded-xl border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition select-none group">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-yellow-600 rounded cursor-pointer"
              checked={!!doubtful[currentQ.id]}
              onChange={() => setDoubtful(p => ({...p, [currentQ.id]: !p[currentQ.id]}))}
              disabled={isSubmitting}
            />
            <span className="font-bold text-yellow-700 text-sm md:text-base group-hover:text-yellow-800">RAGU-RAGU</span>
            <Flag size={16} className={`hidden md:block ${doubtful[currentQ.id] ? 'fill-yellow-600 text-yellow-600' : 'text-yellow-400'}`} />
          </label>

          {isLastQuestion ? (
            <button 
              onClick={handleFinishButton}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition transform hover:-translate-y-0.5 text-sm md:text-base ${isSubmitting ? 'bg-slate-400 text-white cursor-wait' : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-green-200'}`}
            >
              {isSubmitting ? (
                  <>Memproses... <Loader2 size={18} className="animate-spin" /></>
              ) : (
                  <>SELESAI <Check size={18} /></>
              )}
            </button>
          ) : (
            <button 
              onClick={() => setCurrentIdx(p => Math.min(examQuestions.length - 1, p + 1))}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition transform hover:-translate-y-0.5 text-sm md:text-base"
            >
              <span className="hidden md:inline">BERIKUTNYA</span> <ChevronRight size={18} />
            </button>
          )}
        </div>
      </footer>
      
      {/* Confirmation Modal */}
      {showConfirmFinish && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Selesaikan Ujian?</h3>
                      <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                          Pastikan anda telah memeriksa kembali semua jawaban.<br/>
                          Jawaban akan dikirim ke server dan <b>tidak dapat diubah</b> kembali.
                      </p>
                      
                      <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-left text-sm space-y-2">
                          <div className="flex justify-between">
                              <span className="text-slate-500">Terjawab</span>
                              <span className="font-bold text-slate-700">{Object.keys(answers).length} / {examQuestions.length}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-slate-500">Ragu-ragu</span>
                              <span className="font-bold text-yellow-600">{Object.values(doubtful).filter(Boolean).length}</span>
                          </div>
                      </div>

                      <div className="flex gap-3">
                          <button 
                            onClick={() => setShowConfirmFinish(false)}
                            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                          >
                              Batal
                          </button>
                          <button 
                            onClick={executeFinish}
                            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition"
                          >
                              Ya, Selesai
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default StudentExam;