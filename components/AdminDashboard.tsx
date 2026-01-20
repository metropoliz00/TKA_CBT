import React, { useState, useMemo, useEffect } from 'react';
import { Users, BookOpen, BarChart3, Settings, LogOut, Home, LayoutDashboard, Award, Activity, FileText, RefreshCw, Key, FileQuestion, Plus, Trash2, Edit, Save, X, Search, CheckCircle2, AlertCircle, Clock, PlayCircle, Filter } from 'lucide-react';
import { api } from '../services/api';
import { User, QuestionRow } from '../types';

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

// Helper to format duration string "HH:mm:ss" to text "X Jam Y Menit Z Detik"
const formatDurationToText = (duration: string) => {
    if (!duration || duration === '-') return '-';
    try {
        const parts = duration.split(':');
        if (parts.length !== 3) return duration;
        
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const s = parseInt(parts[2], 10);
        
        const textParts = [];
        if (h > 0) textParts.push(`${h} Jam`);
        if (m > 0) textParts.push(`${m} Menit`);
        if (s > 0) textParts.push(`${s} Detik`);
        
        return textParts.length > 0 ? textParts.join(' ') : '0 Detik';
    } catch (e) {
        return duration;
    }
};

// Custom SVG Donut Chart Component with Legend
const SimpleDonutChart = ({ data, size = 160 }: { data: { value: number, color: string, label?: string }[], size?: number }) => {
    const total = data.reduce((a, b) => a + b.value, 0);
    let cumulative = 0;
    const center = size / 2;
    const radius = (size - 40) / 2;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {data.map((item, i) => {
                    const percentage = total > 0 ? item.value / total : 0;
                    const dashArray = percentage * circumference;
                    const offset = cumulative * circumference;
                    cumulative += percentage;
                    return (
                        <circle
                            key={i}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="24"
                            strokeDasharray={`${dashArray} ${circumference}`}
                            strokeDashoffset={-offset}
                            className="transition-all duration-1000 ease-out"
                        />
                    );
                })}
                {total === 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="24" />}
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-slate-700">{total}</span>
                <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
            </div>
        </div>
    );
};

const BankSoalTab = () => {
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentQ, setCurrentQ] = useState<QuestionRow | null>(null);

    useEffect(() => {
        const loadSubjects = async () => {
            const list = await api.getExams();
            let names = list.map(l => l.nama_ujian);
            const forbidden = ['Rangking', 'Nilai', 'Rekap_Analisis', 'Config', 'Users', 'Ranking', 'Logs'];
            names = names.filter(n => !forbidden.includes(n));
            if (names.length === 0) names.push("Matematika", "Bahasa Indonesia");
            setSubjects(names);
            if (names.length > 0) setSelectedSubject(names[0]);
        };
        loadSubjects();
    }, []);

    useEffect(() => {
        if (!selectedSubject) return;
        const loadQ = async () => {
            setLoadingData(true);
            try {
                const data = await api.getRawQuestions(selectedSubject);
                setQuestions(data);
            } catch(e) { console.error(e); }
            finally { setLoadingData(false); }
        };
        loadQ();
    }, [selectedSubject]);

    const handleEdit = (q: QuestionRow) => {
        setCurrentQ(q);
        setModalOpen(true);
    };

    const handleAddNew = () => {
        setCurrentQ({
            id: `Q${questions.length + 1}`,
            text_soal: '',
            tipe_soal: 'PG',
            gambar: '',
            opsi_a: '',
            opsi_b: '',
            opsi_c: '',
            opsi_d: '',
            kunci_jawaban: '',
            bobot: 10
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(`Yakin ingin menghapus soal ID: ${id}?`)) {
            setLoadingData(true);
            await api.deleteQuestion(selectedSubject, id);
            const data = await api.getRawQuestions(selectedSubject);
            setQuestions(data);
            setLoadingData(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentQ) return;
        setLoadingData(true);
        // Force uppercase for key
        const finalQ = { ...currentQ, kunci_jawaban: currentQ.kunci_jawaban.toUpperCase() };
        await api.saveQuestion(selectedSubject, finalQ);
        const data = await api.getRawQuestions(selectedSubject);
        setQuestions(data);
        setModalOpen(false);
        setLoadingData(false);
    };

    // Helper for key placeholder
    const getKeyPlaceholder = (type: string) => {
        if (type === 'PG') return "Contoh: A";
        if (type === 'PGK') return "Contoh: A, C (Pisahkan koma)";
        if (type === 'BS') return "Contoh: B, S, B, S (Sesuai urutan)";
        return "";
    };

    const getKeyHelper = (type: string) => {
        if (type === 'PG') return "Masukkan satu huruf kunci jawaban (A/B/C/D).";
        if (type === 'PGK') return "Masukkan huruf opsi yang benar dipisah koma (Misal: A,C).";
        if (type === 'BS') return "Masukkan B (Benar) atau S (Salah) sesuai urutan pernyataan, dipisah koma (Misal: B,S,B,S).";
        return "";
    };

    return (
        <div className="space-y-6 fade-in max-w-full mx-auto">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><FileQuestion size={24}/></div>
                    <div>
                        <h3 className="font-bold text-slate-800">Manajemen Bank Soal</h3>
                        <p className="text-xs text-slate-400">Edit database soal (Matematika / Bahasa Indonesia).</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                    >
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={handleAddNew} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                        <Plus size={16}/> Tambah Soal
                    </button>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {loadingData ? (
                    <div className="p-10 text-center"><div className="loader border-indigo-500 mx-auto"></div></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4 w-16">ID</th>
                                    <th className="p-4 min-w-[200px]">Teks Soal</th>
                                    <th className="p-4 w-20">Tipe</th>
                                    <th className="p-4 w-24">Opsi A</th>
                                    <th className="p-4 w-24">Opsi B</th>
                                    <th className="p-4 w-24">Opsi C</th>
                                    <th className="p-4 w-24">Opsi D</th>
                                    <th className="p-4 w-20">Kunci</th>
                                    <th className="p-4 w-16">Bobot</th>
                                    <th className="p-4 w-32 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {questions.length === 0 ? (
                                    <tr><td colSpan={10} className="p-8 text-center text-slate-400 italic">Belum ada soal di sheet ini.</td></tr>
                                ) : questions.map((q, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition">
                                        <td className="p-4 font-mono font-bold text-slate-600">{q.id}</td>
                                        <td className="p-4">
                                            <div className="line-clamp-2 font-medium text-slate-700">{q.text_soal}</div>
                                            {q.gambar && <span className="text-xs text-blue-500 flex items-center gap-1 mt-1"><FileQuestion size={12}/> Ada Gambar</span>}
                                        </td>
                                        <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{q.tipe_soal}</span></td>
                                        <td className="p-4 text-xs text-slate-500 truncate max-w-[100px]">{q.opsi_a}</td>
                                        <td className="p-4 text-xs text-slate-500 truncate max-w-[100px]">{q.opsi_b}</td>
                                        <td className="p-4 text-xs text-slate-500 truncate max-w-[100px]">{q.opsi_c}</td>
                                        <td className="p-4 text-xs text-slate-500 truncate max-w-[100px]">{q.opsi_d}</td>
                                        <td className="p-4 font-mono text-emerald-600 font-bold text-center">{q.kunci_jawaban}</td>
                                        <td className="p-4 text-slate-600 text-center">{q.bobot}</td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button onClick={() => handleEdit(q)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(q.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </div>
             {modalOpen && currentQ && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                     <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Edit size={20} className="text-indigo-600"/> {currentQ.id ? 'Edit Soal' : 'Tambah Soal Baru'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1">
                            <form id="qForm" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Soal</label>
                                            <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.id} onChange={e => setCurrentQ({...currentQ, id: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipe Soal</label>
                                            <select className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.tipe_soal} onChange={e => setCurrentQ({...currentQ, tipe_soal: e.target.value as any})}>
                                                <option value="PG">Pilihan Ganda</option>
                                                <option value="PGK">Pilihan Ganda Kompleks</option>
                                                <option value="BS">Benar / Salah</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teks Soal</label>
                                        <textarea required rows={5} className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.text_soal} onChange={e => setCurrentQ({...currentQ, text_soal: e.target.value})} placeholder="Tulis pertanyaan disini..."></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Gambar (Opsional)</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.gambar} onChange={e => setCurrentQ({...currentQ, gambar: e.target.value})} placeholder="https://..." />
                                        {currentQ.gambar && <img src={currentQ.gambar} alt="Preview" className="mt-2 h-20 rounded border border-slate-200 object-cover" />}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kunci Jawaban</label>
                                            <input 
                                                required 
                                                type="text" 
                                                className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-100 outline-none placeholder-emerald-300" 
                                                value={currentQ.kunci_jawaban} 
                                                onChange={e => setCurrentQ({...currentQ, kunci_jawaban: e.target.value})} 
                                                placeholder={getKeyPlaceholder(currentQ.tipe_soal)} 
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1 font-medium">{getKeyHelper(currentQ.tipe_soal)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bobot Nilai</label>
                                            <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.bobot} onChange={e => setCurrentQ({...currentQ, bobot: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Pilihan Jawaban / Pernyataan</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi A / Pernyataan 1</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.opsi_a} onChange={e => setCurrentQ({...currentQ, opsi_a: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi B / Pernyataan 2</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.opsi_b} onChange={e => setCurrentQ({...currentQ, opsi_b: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi C / Pernyataan 3</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.opsi_c} onChange={e => setCurrentQ({...currentQ, opsi_c: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi D / Pernyataan 4</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.opsi_d} onChange={e => setCurrentQ({...currentQ, opsi_d: e.target.value})} />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button onClick={() => setModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition">Batal</button>
                            <button type="submit" form="qForm" disabled={loadingData} className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition flex items-center gap-2">
                                {loadingData ? 'Menyimpan...' : <><Save size={18}/> Simpan Data</>}
                            </button>
                        </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

const SchoolIcon = ({ size }: { size: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 8-4 8 4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M18 5v17"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rekap' | 'analisis' | 'ranking' | 'bank_soal'>('overview');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [dashboardData, setDashboardData] = useState<any>({ 
      students: [], 
      questionsMap: {}, 
      totalUsers: 0, 
      token: 'TOKEN',
      statusCounts: { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 },
      activityFeed: []
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isEditingToken, setIsEditingToken] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
        const data = await api.getDashboardData();
        setDashboardData(data);
        setTokenInput(data.token);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateToken = async () => {
      await api.saveToken(tokenInput);
      setIsEditingToken(false);
      fetchData();
  };
  
  const generateToken = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setTokenInput(result);
  };

  const filteredStudents = useMemo(() => {
      const allStudents = dashboardData.students || [];
      if (user.role === 'admin_pusat') return allStudents;
      if (user.role === 'admin_sekolah') {
          const adminSchool = (user.kelas_id || '').toLowerCase();
          return allStudents.filter((s: any) => (s.school || '').toLowerCase() === adminSchool);
      }
      return [];
  }, [dashboardData.students, user]);

  const sortedStudents = useMemo(() => {
    let sortable = [...filteredStudents];
    if (sortConfig.key) {
        sortable.sort((a: any, b: any) => {
            if (a[sortConfig.key!] < b[sortConfig.key!]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key!] > b[sortConfig.key!]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return sortable;
  }, [filteredStudents, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const OverviewTab = () => {
    // Stats for Charts
    const { OFFLINE, LOGGED_IN, WORKING, FINISHED } = dashboardData.statusCounts || { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
    const totalStatus = OFFLINE + LOGGED_IN + WORKING + FINISHED;
    
    // Status Data for Pie Chart
    const statusData = [
        { value: OFFLINE, color: '#e2e8f0', label: 'Belum Login' }, // Slate-200
        { value: LOGGED_IN, color: '#facc15', label: 'Sudah Login' }, // Yellow-400
        { value: WORKING, color: '#3b82f6', label: 'Mengerjakan' }, // Blue-500
        { value: FINISHED, color: '#10b981', label: 'Selesai' }, // Emerald-500
    ];

    return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
        {user.role === 'admin_sekolah' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl flex items-center gap-3">
                <div className="bg-blue-200 p-2 rounded-lg"><SchoolIcon size={20}/></div>
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Mode Admin Sekolah</h3>
                    <p className="text-sm">Menampilkan data untuk: <b>{user.kelas_id}</b></p>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Terdaftar</p><h3 className="text-3xl font-extrabold text-slate-700 mt-1">{dashboardData.totalUsers}</h3></div>
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-500"><Users size={24}/></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sedang Ujian</p><h3 className="text-3xl font-extrabold text-blue-600 mt-1">{WORKING}</h3></div>
                <div className="bg-blue-50 p-3 rounded-xl text-blue-500"><PlayCircle size={24}/></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ujian Selesai</p><h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{FINISHED}</h3></div>
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-500"><CheckCircle2 size={24}/></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Token Ujian</p>
                {isEditingToken ? (
                    <div className="flex gap-2">
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-center font-mono font-bold uppercase text-lg tracking-widest" value={tokenInput} onChange={e=>setTokenInput(e.target.value.toUpperCase())} maxLength={6} />
                        <button onClick={generateToken} className="bg-amber-100 text-amber-600 p-2 rounded hover:bg-amber-200" title="Acak Token"><RefreshCw size={18}/></button>
                        <button onClick={handleUpdateToken} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"><Save size={18}/></button>
                        <button onClick={()=>setIsEditingToken(false)} className="bg-slate-200 text-slate-600 p-2 rounded hover:bg-slate-300"><X size={18}/></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-mono font-bold text-slate-800 tracking-widest">{dashboardData.token}</span>
                        <button onClick={()=>{ setTokenInput(dashboardData.token); setIsEditingToken(true); }} className="text-slate-400 hover:text-indigo-500 transition"><Edit size={18}/></button>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chart: Status Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <h3 className="text-slate-700 font-bold mb-6 text-sm uppercase tracking-wide w-full border-b pb-2">Status Peserta (%)</h3>
                <SimpleDonutChart data={statusData} />
                <div className="grid grid-cols-2 gap-4 mt-6 w-full text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded"></div> Belum Login ({totalStatus > 0 ? Math.round((OFFLINE/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded"></div> Login ({totalStatus > 0 ? Math.round((LOGGED_IN/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div> Mengerjakan ({totalStatus > 0 ? Math.round((WORKING/totalStatus)*100) : 0}%)</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Selesai ({totalStatus > 0 ? Math.round((FINISHED/totalStatus)*100) : 0}%)</div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 col-span-2">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Activity size={18} className="text-indigo-500"/> Aktivitas Terbaru</h3>
                <div className="space-y-0 h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {dashboardData.activityFeed && dashboardData.activityFeed.length > 0 ? (
                        dashboardData.activityFeed.map((log: any, i: number) => {
                            let icon = <AlertCircle size={16}/>;
                            let colorClass = "bg-slate-100 text-slate-500";
                            let statusText = "Unknown";
                            
                            if (log.action === 'LOGIN') {
                                icon = <Key size={16}/>;
                                colorClass = "bg-yellow-100 text-yellow-600";
                                statusText = "Sudah Login";
                            } else if (log.action === 'START') {
                                icon = <PlayCircle size={16}/>;
                                colorClass = "bg-blue-100 text-blue-600";
                                statusText = "Mengerjakan Soal";
                            } else if (log.action === 'FINISH') {
                                icon = <CheckCircle2 size={16}/>;
                                colorClass = "bg-emerald-100 text-emerald-600";
                                statusText = "Selesai Mengerjakan";
                            }

                            return (
                                <div key={i} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition border-b border-slate-50 last:border-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                        {icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-bold text-slate-700">{log.fullname}</p>
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            <span className={`font-bold ${colorClass.replace('bg-', 'text-').split(' ')[1]}`}>{statusText}</span>
                                            {log.details && <span className="text-slate-400"> - {log.details}</span>}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
                            <Activity size={32} className="mb-2 opacity-20"/>
                            Belum ada aktivitas tercatat.
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
    );
  };

  const RekapTab = () => {
    
    // Helper to calculate Start Time based on End Time and Duration string (HH:mm:ss)
    const calculateStartTime = (endTimeStr: string, durationStr: string) => {
        try {
            const endDate = new Date(endTimeStr);
            if (isNaN(endDate.getTime()) || !durationStr) return "-";
            
            const parts = durationStr.split(':');
            if (parts.length !== 3) return "-";
            
            const hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);
            const seconds = parseInt(parts[2], 10);
            
            const durationMs = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
            const startDate = new Date(endDate.getTime() - durationMs);
            
            return startDate.toLocaleTimeString();
        } catch (e) {
            return "-";
        }
    };

    const formatTime = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleTimeString();
        } catch { return isoString; }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden fade-in max-w-full mx-auto">
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-700 text-lg">Rekapitulasi Nilai Peserta</h3>
                <button className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                    <FileText size={16}/> Export Excel
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('username')}>Username</th>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('fullname')}>Nama Peserta</th>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('school')}>Asal Sekolah</th>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('subject')}>Mapel</th>
                            <th className="p-4 text-center cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('score')}>Score</th>
                            <th className="p-4">Waktu Mulai</th>
                            <th className="p-4">Waktu Selesai</th>
                            <th className="p-4">Durasi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {sortedStudents.map((s: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 transition">
                                <td className="p-4 font-mono font-bold text-slate-600">{s.username}</td>
                                <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                <td className="p-4 text-slate-600">{s.school}</td>
                                <td className="p-4 text-slate-600"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold">{s.subject}</span></td>
                                <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${s.score >= 75 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>{s.score}</span></td>
                                <td className="p-4 text-slate-500 font-mono text-xs">{calculateStartTime(s.timestamp, s.duration)}</td>
                                <td className="p-4 text-slate-500 font-mono text-xs">{formatTime(s.timestamp)}</td>
                                <td className="p-4 text-slate-500 font-bold text-xs">{formatDurationToText(s.duration)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  const RankingTab = () => {
    const rankingData = [...filteredStudents].sort((a: any, b: any) => b.score - a.score);
    
    return (
        <div className="max-w-7xl mx-auto fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-amber-700 flex items-center gap-2 text-xl"><Award size={24}/> Peringkat (Grid View)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rankingData.map((s: any, i: number) => {
                    let rankColor = 'bg-white border-slate-100'; 
                    let badgeColor = 'bg-slate-100 text-slate-500'; 
                    let icon = null;
                    if (i === 0) { rankColor = 'bg-yellow-50 border-yellow-200 shadow-md'; badgeColor = 'bg-yellow-400 text-yellow-900'; icon = '🥇'; }
                    else if (i === 1) { rankColor = 'bg-slate-50 border-slate-300 shadow-sm'; badgeColor = 'bg-slate-300 text-slate-700'; icon = '🥈'; }
                    else if (i === 2) { rankColor = 'bg-orange-50 border-orange-200 shadow-sm'; badgeColor = 'bg-orange-300 text-orange-800'; icon = '🥉'; }
                    
                    return (
                        <div key={i} className={`relative rounded-2xl border p-6 flex flex-col items-center text-center transition hover:-translate-y-1 ${rankColor}`}>
                            <div className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${badgeColor}`}>{icon || (i + 1)}</div>
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg">{s.fullname?.charAt(0)}</div>
                            <h4 className="text-lg font-bold text-slate-800 truncate w-full">{s.fullname}</h4>
                            <p className="text-xs text-slate-500 font-mono mb-2">{s.username}</p>
                            <div className="text-sm text-slate-600 mb-4 h-10 flex items-center justify-center w-full bg-white/50 rounded-lg">{s.school}</div>
                            <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                                <div className="bg-white p-2 rounded-lg border border-slate-100"><div className="text-xs text-slate-400 font-bold uppercase">Nilai</div><div className="text-xl font-bold text-indigo-600">{s.score}</div></div>
                                <div className="bg-white p-2 rounded-lg border border-slate-100"><div className="text-xs text-slate-400 font-bold uppercase">Durasi</div><div className="text-sm font-bold text-slate-600 mt-1 truncate text-[10px] md:text-xs">{formatDurationToText(s.duration)}</div></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
  };

  const AnalisisTab = () => {
    // 1. Get available subjects from keys
    const subjects = useMemo(() => Object.keys(dashboardData.questionsMap), []);
    
    // 2. Local State for filters
    const [localSubject, setLocalSubject] = useState(subjects[0] || '');
    const [localSchool, setLocalSchool] = useState('Semua');

    useEffect(() => {
        if (!localSubject && subjects.length > 0) {
            setLocalSubject(subjects[0]);
        }
    }, [subjects.length]);

    // 3. Filter Students by Subject first (Base population)
    // We use filteredStudents which respects Admin Role already
    const studentsBySubject = filteredStudents.filter((s: any) => s.subject === localSubject);

    // 4. Extract available schools from the students taking this subject
    const availableSchools = useMemo(() => {
        const schools = new Set(studentsBySubject.map((s: any) => s.school));
        const arr = Array.from(schools).filter(Boolean).sort();
        return ['Semua', ...arr];
    }, [studentsBySubject]);

    // 5. Final Student Filter (School)
    const finalStudents = studentsBySubject.filter((s: any) => {
        if (localSchool !== 'Semua') return s.school === localSchool;
        return true;
    });

    // 6. Sort Alphabetically for Analysis Table
    finalStudents.sort((a: any, b: any) => a.fullname.localeCompare(b.fullname));

    // 7. Get Questions for the selected subject
    const currentQuestions = dashboardData.questionsMap[localSubject] || [];

    // 8. Stats Calculation for Footer
    const stats = currentQuestions.map((q: any) => {
        let correct = 0;
        let wrong = 0;
        finalStudents.forEach((s: any) => {
            const val = s.itemAnalysis ? s.itemAnalysis[q.id] : undefined;
            if (val == 1) correct++;
            else if (val == 0) wrong++;
        });
        const total = correct + wrong;
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        let diff = "M"; // Mudah
        if (pct <= 50) diff = "S"; // Sukar
        else if (pct <= 80) diff = "Sd"; // Sedang

        return { correct, wrong, pct, diff };
    });

    if (!localSubject) return <div className="p-10 text-center text-slate-400">Tidak ada data untuk dianalisis.</div>

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
            {/* Control Bar */}
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                     <BarChart3 className="text-indigo-600" size={24}/>
                     <span>Analisis Butir Soal</span>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    {/* Subject Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                             <BookOpen size={16}/>
                        </div>
                        <select 
                            className="w-full md:w-48 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                            value={localSubject}
                            onChange={(e) => {
                                setLocalSubject(e.target.value);
                                setLocalSchool('Semua'); // Reset school filter when subject changes
                            }}
                        >
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* School Filter */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                             <Filter size={16}/>
                        </div>
                        <select 
                            className="w-full md:w-48 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"
                            value={localSchool}
                            onChange={(e) => setLocalSchool(e.target.value)}
                        >
                            {availableSchools.map((s: any) => <option key={s} value={s}>{s === 'Semua' ? 'Semua Sekolah' : s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 border-b text-center bg-slate-100 font-bold text-slate-700 w-10">NO</th>
                            <th className="p-3 border-b text-left bg-slate-100 font-bold text-slate-700 min-w-[200px] sticky left-0 shadow-sm z-10">
                                NAMA SISWA <span className="text-[10px] font-normal text-slate-500 block">{localSchool !== 'Semua' ? localSchool : 'Semua Sekolah'}</span>
                            </th>
                            {currentQuestions.map((q: any, i: number) => (
                                <th key={q.id} className="p-2 border-b bg-slate-50 font-bold text-slate-600 min-w-[40px] text-xs">Q{i+1}</th>
                            ))}
                            <th className="p-3 border-b bg-indigo-50 font-bold text-indigo-700 w-24">NILAI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {finalStudents.length === 0 ? (
                            <tr><td colSpan={currentQuestions.length + 3} className="p-8 text-slate-400 italic">Tidak ada data siswa untuk filter ini.</td></tr>
                        ) : finalStudents.map((s: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 border-r border-slate-100 text-slate-500 font-mono text-xs">{idx+1}</td>
                                <td className="p-2 border-r border-slate-100 text-left font-medium text-slate-800 sticky left-0 bg-white z-10">
                                    {s.fullname}
                                    <div className="text-[10px] text-slate-400 truncate w-32">{s.school}</div>
                                </td>
                                {currentQuestions.map((q: any) => {
                                    const val = s.itemAnalysis ? s.itemAnalysis[q.id] : undefined;
                                    const isCorrect = val == 1;
                                    return (
                                        <td key={q.id} className="p-1 border-r border-slate-100">
                                            <div className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : (val !== undefined ? 'bg-rose-100 text-rose-700' : 'bg-gray-50 text-gray-300')}`}>
                                                {val !== undefined ? val : '-'}
                                            </div>
                                        </td>
                                    )
                                })}
                                <td className="p-2 font-bold bg-indigo-50/30 text-indigo-700 border-l border-slate-100">{s.score}</td>
                            </tr>
                        ))}
                        
                        {/* Footer Stats */}
                        {finalStudents.length > 0 && (
                            <>
                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                    <td colSpan={2} className="p-3 font-bold text-right text-slate-600 uppercase text-xs sticky left-0 bg-slate-50 z-10">Jumlah Benar</td>
                                    {stats.map((st: any, i: number) => <td key={i} className="p-2 font-bold text-slate-700">{st.correct}</td>)}
                                    <td className="bg-slate-100"></td>
                                </tr>
                                <tr className="bg-slate-100">
                                    <td colSpan={2} className="p-3 font-bold text-right text-slate-600 uppercase text-xs sticky left-0 bg-slate-100 z-10">Persentase</td>
                                    {stats.map((st: any, i: number) => <td key={i} className="p-2 font-bold text-xs text-blue-600">{st.pct}%</td>)}
                                    <td className="bg-slate-200"></td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="loader border-indigo-500"></div></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">CBT <span className="text-indigo-600">Admin</span></h1>
          <p className="text-xs text-slate-400 mt-1">
              {user.role === 'admin_pusat' ? 'PUSAT' : 'SEKOLAH'} Management System
          </p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Home size={20} /> Dashboard
          </button>
          
          {user.role === 'admin_pusat' && (
              <button onClick={() => setActiveTab('bank_soal')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'bank_soal' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                <FileQuestion size={20} /> Bank Soal
              </button>
          )}

          <button onClick={() => setActiveTab('rekap')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'rekap' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
            <LayoutDashboard size={20} /> Rekap Nilai
          </button>
          <button onClick={() => setActiveTab('analisis')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'analisis' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
            <BarChart3 size={20} /> Analisis Soal
          </button>
          <button onClick={() => setActiveTab('ranking')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'ranking' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Award size={20} /> Peringkat
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 capitalize">{activeTab.replace('_', ' ')}</h2>
                {user.role === 'admin_sekolah' && (
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">Admin: {user.kelas_id}</p>
                )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchData} title="Refresh Data" className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition relative">
                <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
              </button>
              <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm">
                <Settings size={20} className="text-slate-400" />
              </div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'bank_soal' && user.role === 'admin_pusat' && <BankSoalTab />}
          {activeTab === 'rekap' && <RekapTab />}
          {activeTab === 'ranking' && <RankingTab />}
          {activeTab === 'analisis' && <AnalisisTab />}
          
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;