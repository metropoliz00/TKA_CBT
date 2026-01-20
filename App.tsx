import React, { useState, useEffect } from 'react';
import { User, Exam, QuestionWithOptions } from './types';
import { Key, User as UserIcon, Monitor, AlertCircle, School, LogOut, Check, Eye, EyeOff, Smartphone, Cpu, Wifi, ArrowRight, Loader2, WifiOff } from 'lucide-react';
import StudentExam from './components/StudentExam';
import AdminDashboard from './components/AdminDashboard';
import { api } from './services/api';

type ViewState = 'system_check' | 'login' | 'confirm' | 'exam' | 'result' | 'admin';

function App() {
  const [view, setView] = useState<ViewState>('system_check');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [examList, setExamList] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  
  const [inputToken, setInputToken] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  
  // System Check State
  const [sysInfo, setSysInfo] = useState({ os: 'Unknown', device: 'Unknown', ram: 'Unknown', status: 'Checking...' });

  // Extra confirm fields
  const [confirmData, setConfirmData] = useState({
      day: 'Hari',
      month: 'Bulan',
      year: 'Tahun'
  });

  const renderDays = () => Array.from({length:31}, (_,i) => <option key={i} value={i+1}>{i+1}</option>);
  const renderYears = () => Array.from({length:30}, (_,i) => <option key={i} value={2015-i}>{2015-i}</option>);
  const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  // System Check Logic (Device & Connection Status)
  useEffect(() => {
    if (view === 'system_check') {
        // 1. Detect OS/Device
        const userAgent = navigator.userAgent;
        let os = "Unknown OS";
        if (userAgent.indexOf("Win") !== -1) os = "Windows";
        if (userAgent.indexOf("Mac") !== -1) os = "MacOS";
        if (userAgent.indexOf("X11") !== -1) os = "UNIX";
        if (userAgent.indexOf("Linux") !== -1) os = "Linux";
        if (userAgent.indexOf("Android") !== -1) os = "Android";
        if (userAgent.indexOf("like Mac") !== -1) os = "iOS";

        // 2. RAM (Chrome only mostly)
        const ram = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "N/A";

        // 3. Connection Status Listener
        const updateOnlineStatus = () => {
            setSysInfo(prev => ({
                ...prev,
                status: navigator.onLine ? "Online" : "Offline"
            }));
        };

        // Initial Set
        setSysInfo({
            os: os,
            device: /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent) ? "Mobile" : "Desktop",
            ram: ram,
            status: navigator.onLine ? "Online" : "Offline"
        });

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
        const user = await api.login(loginForm.username.trim(), loginForm.password.trim());
        if (user) {
            setCurrentUser(user);
            // Check for both admin types
            if (user.role === 'admin_pusat' || user.role === 'admin_sekolah') {
                setView('admin');
            } else {
                // Fetch available exams/subjects
                const exams = await api.getExams();
                setExamList(exams);
                if (exams.length > 0) setSelectedExamId(exams[0].id);
                setView('confirm');
            }
        } else {
            setErrorMsg('Username tidak ditemukan atau password salah.');
        }
    } catch (err: any) {
        // More descriptive error for deployment issues
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('Script Error'))) {
             setErrorMsg('Gagal terhubung ke server. Pastikan Deploy Google Script sudah diperbarui (New Version).');
        } else {
             setErrorMsg('Terjadi kesalahan koneksi. ' + (err.message || ''));
        }
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
        // Validate Token
        const serverToken = await api.getServerToken();
        if (inputToken.toUpperCase() !== serverToken.toUpperCase()) {
            setErrorMsg('Token ujian tidak valid!');
            setLoading(false);
            return;
        }

        // Fetch Questions
        const qData = await api.getQuestions(selectedExamId);
        if (qData.length === 0) {
            setErrorMsg('Soal tidak ditemukan untuk mapel ini.');
            setLoading(false);
            return;
        }

        // Notify Backend (Log Activity)
        await api.startExam(currentUser.username, currentUser.nama_lengkap, selectedExamId);

        setQuestions(qData);
        setStartTime(Date.now());
        setErrorMsg('');
        setView('exam');
    } catch (err) {
        console.error(err);
        setErrorMsg('Gagal memuat soal. Periksa koneksi.');
    } finally {
        setLoading(false);
    }
  };

  const handleFinishExam = async (answers: any) => {
    if (!currentUser || !selectedExamId) return;
    setLoading(true);
    try {
        await api.submitExam({
            user: currentUser,
            subject: selectedExamId,
            answers,
            startTime
        });
        setView('result');
    } catch (err) {
        alert("Gagal menyimpan jawaban. Coba lagi.");
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
    setInputToken('');
    setErrorMsg('');
    setConfirmData({ day: 'Hari', month: 'Bulan', year: 'Tahun' });
    setQuestions([]);
    setShowPassword(false);
    setView('login');
  };

  const selectedExam = examList.find(e => e.id === selectedExamId);

  // --- RENDER SYSTEM CHECK ---
  if (view === 'system_check') {
      const isOffline = sysInfo.status === 'Offline';

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans fade-in">
            <div className="bg-white max-w-md w-full rounded-2xl p-8 shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Monitor size={32} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800">System Check</h2>
                    <p className="text-slate-500 text-sm mt-1">Memeriksa kompatibilitas perangkat...</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <Smartphone className="text-slate-400" size={20} />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Device / OS</p>
                                <p className="font-bold text-slate-700">{sysInfo.device} / {sysInfo.os}</p>
                            </div>
                        </div>
                        <Check size={20} className="text-green-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <Cpu className="text-slate-400" size={20} />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">RAM</p>
                                <p className="font-bold text-slate-700">{sysInfo.ram}</p>
                            </div>
                        </div>
                        <Check size={20} className="text-green-500" />
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isOffline ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            {isOffline ? <WifiOff className="text-red-400" size={20} /> : <Wifi className="text-slate-400" size={20} />}
                            <div>
                                <p className={`text-xs font-bold uppercase ${isOffline ? 'text-red-400' : 'text-slate-400'}`}>Status Device</p>
                                <p className={`font-bold ${isOffline ? 'text-red-600' : 'text-emerald-600'}`}>{sysInfo.status}</p>
                            </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></div>
                    </div>
                </div>

                <button 
                    onClick={() => setView('login')}
                    disabled={isOffline}
                    className={`w-full font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 group ${isOffline ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/30'}`}
                >
                    {isOffline ? "KONEKSI TERPUTUS" : (
                        <>LANJUTKAN <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                    )}
                </button>
                
                <p className="text-center text-[10px] text-slate-400 mt-6">
                    Pastikan koneksi internet stabil selama ujian berlangsung.
                </p>
            </div>
        </div>
      );
  }

  // --- RENDER LOGIN ---
  if (view === 'login') {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans overflow-hidden relative">
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-3xl animate-pulse" style={{animationDelay:'2s'}}></div>
            </div>
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 fade-in border border-white/50">
                <div className="md:w-1/2 relative bg-slate-900 flex flex-col justify-center items-center text-white p-12 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 to-indigo-900/60 z-10"></div>
                    <div className="absolute inset-0 z-0">
                        <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000" alt="bg"/>
                    </div>
                    <div className="relative z-20 text-center">
                        <div className="bg-white/20 backdrop-blur-md p-5 rounded-2xl inline-block mb-6 shadow-lg border border-white/20 animate-bounce">
                            <Monitor size={56} className="text-blue-300"/>
                        </div>
                        <h1 className="text-5xl font-extrabold mb-2 tracking-tight">CBT</h1>
                        <h2 className="text-lg font-medium text-blue-200 uppercase tracking-widest mb-6">Computer Based Test</h2>
                        <div className="w-16 h-1 bg-blue-500 mx-auto mb-6 rounded-full"></div>
                        <p className="text-slate-300 font-light max-w-xs mx-auto leading-relaxed">Sistem Assesment Digital yang terintegrasi</p>
                    </div>
                </div>
                <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white/80 backdrop-blur">
                    <div className="mb-10">
                        <h3 className="text-3xl font-bold text-slate-800">Login Peserta</h3>
                        <p className="text-slate-500 mt-2">Masukan identitas untuk memulai sesi.</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wide">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><UserIcon size={20}/></div>
                                <input type="text" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium text-slate-700 placeholder-transparent" value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username:e.target.value})} placeholder="Username" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate-700 text-xs font-bold mb-2 uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Key size={20}/></div>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-medium text-slate-700 placeholder-transparent" 
                                    value={loginForm.password} 
                                    onChange={e=>setLoginForm({...loginForm, password:e.target.value})} 
                                    placeholder="Password" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                </button>
                            </div>
                        </div>
                        
                        {errorMsg && (
                            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                <AlertCircle size={16} /> {errorMsg}
                            </div>
                        )}

                        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200 flex justify-center items-center mt-4">
                            {loading ? <div className="loader border-white w-5 h-5"></div> : "MASUK SEKARANG"}
                        </button>
                    </form>
                </div>
            </div>
            <footer className="absolute bottom-4 text-slate-400 text-xs font-bold tracking-wide z-10">
                @2026 | Dev. Team TKA CBT System
            </footer>
        </div>
    );
  }

  // --- RENDER ADMIN ---
  if (view === 'admin' && currentUser) {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
  }

  // --- RENDER CONFIRM ---
  if (view === 'confirm') {
    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col fade-in">
            <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 md:px-10 justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-lg"><School size={24}/> <span>Konfirmasi Data</span></div>
                <div className="flex items-center gap-4">
                    <div className="text-slate-500 text-sm font-mono bg-slate-100 px-3 py-1 rounded">V.2.0</div>
                    <button onClick={handleLogout} className="text-red-500 hover:text-red-700 flex items-center gap-1 font-bold text-sm bg-red-50 px-3 py-1 rounded transition hover:bg-red-100"><LogOut size={16}/> Logout</button>
                </div>
            </header>
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="bg-blue-50 p-6 border-b border-blue-100 flex items-center gap-4">
                        <div className="bg-blue-600 text-white p-3 rounded-xl shadow-md"><UserIcon size={32}/></div>
                        <div><h2 className="text-xl font-bold text-slate-800">Profil Peserta</h2><p className="text-slate-500 text-sm">Pastikan data di bawah ini benar.</p></div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Username</label><div className="font-mono text-lg font-bold text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">{currentUser?.username}</div></div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Mata Ujian</label>
                                {examList.length > 0 ? (
                                    <select 
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-blue-700 font-bold outline-none focus:ring-2 focus:ring-blue-100" 
                                        value={selectedExamId} 
                                        onChange={e=>setSelectedExamId(e.target.value)}
                                    >
                                        {examList.map(s=><option key={s.id} value={s.id}>{s.nama_ujian}</option>)}
                                    </select>
                                ) : (
                                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-500 rounded-lg text-sm">Tidak ada ujian aktif</div>
                                )}
                            </div>
                        </div>
                        <div className="h-px bg-slate-100"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Nama Lengkap</label><div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700">{currentUser?.nama_lengkap}</div></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Asal Sekolah / Kelas</label><div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700">{currentUser?.kelas_id}</div></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Jenis Kelamin</label>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                                    {currentUser?.jenis_kelamin || '-'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Tanggal Lahir</label>
                                <div className="flex space-x-2">
                                    <select className="w-1/3 p-3 border-2 border-gray-200 rounded-lg bg-white focus:border-blue-500 outline-none" value={confirmData.day} onChange={e=>setConfirmData({...confirmData, day:e.target.value})}><option>Hari</option>{renderDays()}</select>
                                    <select className="w-1/3 p-3 border-2 border-gray-200 rounded-lg bg-white focus:border-blue-500 outline-none" value={confirmData.month} onChange={e=>setConfirmData({...confirmData, month:e.target.value})}><option>Bulan</option>{months.map((m,i)=><option key={i} value={m}>{m}</option>)}</select>
                                    <select className="w-1/3 p-3 border-2 border-gray-200 rounded-lg bg-white focus:border-blue-500 outline-none" value={confirmData.year} onChange={e=>setConfirmData({...confirmData, year:e.target.value})}><option>Tahun</option>{renderYears()}</select>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Token Ujian</label>
                            <input 
                                type="text" 
                                className={`w-full p-4 border-2 border-dashed rounded-xl focus:border-blue-500 outline-none text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase placeholder-blue-100 transition-colors ${errorMsg.toLowerCase().includes('token') ? 'border-red-400 bg-red-50 text-red-700 placeholder-red-200' : 'border-blue-300 bg-white text-blue-700'}`}
                                placeholder="TOKEN" 
                                value={inputToken} 
                                onChange={e=> {
                                    setInputToken(e.target.value.toUpperCase());
                                    setErrorMsg('');
                                }} 
                            />
                            {errorMsg && <p className="text-center text-red-500 mt-2 font-medium">{errorMsg}</p>}
                        </div>
                        <button onClick={handleStartExam} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-0.5 mt-4 flex justify-center items-center">
                            {loading ? <div className="loader border-white w-5 h-5"></div> : "MULAI MENGERJAKAN"}
                        </button>
                    </div>
                </div>
            </div>
            <footer className="bg-slate-50 border-t p-3 text-center text-xs text-gray-500">
                @2026 | Dev. Team TKA CBT System
            </footer>
        </div>
    );
  }

  // --- RENDER EXAM ---
  if (view === 'exam' && selectedExam && currentUser) {
    return (
      <StudentExam 
        exam={selectedExam}
        questions={questions}
        userFullName={currentUser.nama_lengkap}
        onFinish={handleFinishExam}
        onExit={handleLogout}
      />
    );
  }

  // --- RENDER RESULT ---
  if (view === 'result') {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 fade-in font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full border border-slate-100">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Check size={48} strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Ujian Selesai!</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Terima kasih, <b>{currentUser?.nama_lengkap}</b>. Jawaban anda telah berhasil disimpan ke dalam sistem database.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Mata Ujian</p>
                    <p className="font-bold text-indigo-700">{selectedExam?.nama_ujian}</p>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition shadow-xl transform hover:-translate-y-1"
                >
                    KEMBALI KE HALAMAN LOGIN
                </button>
            </div>
        </div>
    );
  }

  return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;
}

export default App;