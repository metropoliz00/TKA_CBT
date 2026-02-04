
import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, Save, X, Edit, Clock, CheckCircle2, Layers, Loader2, Copy, Settings, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

const RilisTokenTab = ({ currentUser, token, duration, maxQuestions, surveyDuration, refreshData, isRefreshing }: { currentUser: User, token: string, duration: number, maxQuestions: number, surveyDuration: number, refreshData: () => void, isRefreshing: boolean }) => {
    const [localMaxQ, setLocalMaxQ] = useState(maxQuestions);
    const [isSavingQ, setIsSavingQ] = useState(false);
    const [surveyDur, setSurveyDur] = useState(surveyDuration || 30);
    
    // States for Token and Exam Duration editing
    const [tokenInput, setTokenInput] = useState(token);
    const [isEditingToken, setIsEditingToken] = useState(false);
    const [durationInput, setDurationInput] = useState(duration);
    const [isEditingDuration, setIsEditingDuration] = useState(false);

    const isAdminPusat = currentUser.role === 'admin_pusat';

    useEffect(() => { setLocalMaxQ(maxQuestions); }, [maxQuestions]);
    useEffect(() => { setSurveyDur(surveyDuration || 30); }, [surveyDuration]);
    useEffect(() => { setTokenInput(token); }, [token]);
    useEffect(() => { setDurationInput(duration); }, [duration]);

    const handleSaveMaxQ = async () => {
        setIsSavingQ(true);
        try { await api.saveMaxQuestions(Number(localMaxQ)); refreshData(); alert("Jumlah soal berhasil disimpan. Perhitungan nilai akan menyesuaikan jumlah soal."); } catch (e) { console.error(e); alert("Gagal menyimpan."); } finally { setIsSavingQ(false); }
    };

    const handleSaveSurveyDur = async () => {
        setIsSavingQ(true);
        try { await api.saveSurveyDuration(Number(surveyDur)); alert("Durasi survey disimpan."); } catch (e) { alert("Gagal menyimpan."); } finally { setIsSavingQ(false); }
    };

    const handleUpdateToken = async () => {
        setIsSavingQ(true);
        try { await api.saveToken(tokenInput); setIsEditingToken(false); refreshData(); alert("Token berhasil disimpan."); } catch (e) { alert("Gagal menyimpan token."); } finally { setIsSavingQ(false); }
    };

    const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setTokenInput(result);
    };

    const handleUpdateDuration = async () => {
        setIsSavingQ(true);
        try { await api.saveDuration(durationInput); setIsEditingDuration(false); refreshData(); alert("Durasi ujian disimpan."); } catch (e) { alert("Gagal menyimpan durasi."); } finally { setIsSavingQ(false); }
    };

    return (
        <div className="max-w-5xl mx-auto p-2 md:p-6 space-y-8 fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Manajemen Token</h2>
                    <p className="text-slate-500 text-sm">Kelola akses masuk ujian dan konfigurasi sistem.</p>
                </div>
                <button onClick={refreshData} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm w-fit">
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                    {isRefreshing ? "Menyinkronkan..." : "Refresh Data"}
                </button>
            </div>

            {/* Main Token Card - Modern Gradient */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-2xl shadow-indigo-200 text-white p-8 md:p-12 text-center group transition-all">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-400 blur-3xl"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-6 shadow-sm">
                        <Key size={14} className="text-indigo-100" />
                        <span className="text-xs font-bold text-indigo-50 tracking-wider uppercase">Token Sesi Aktif</span>
                    </div>

                    {isEditingToken ? (
                        <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 animate-in zoom-in duration-200 shadow-xl max-w-md w-full">
                            <div className="flex flex-col gap-4 items-center">
                                <input 
                                    type="text" 
                                    className="bg-black/20 border-2 border-white/30 text-white text-5xl font-mono font-bold text-center rounded-xl px-4 py-4 w-full outline-none focus:border-white focus:bg-black/30 transition-all uppercase tracking-[0.2em] placeholder-white/20 shadow-inner"
                                    value={tokenInput}
                                    onChange={e => setTokenInput(e.target.value.toUpperCase())}
                                    maxLength={6}
                                    autoFocus
                                />
                                <div className="flex gap-3 w-full">
                                    <button onClick={generateToken} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 font-bold text-sm" title="Acak Token"><RefreshCw size={18}/> Acak</button>
                                    <button onClick={handleUpdateToken} disabled={isSavingQ} className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 font-bold text-sm"><Save size={18}/> Simpan Token</button>
                                    <button onClick={() => {setIsEditingToken(false); setTokenInput(token);}} className="py-3 px-4 bg-white/20 hover:bg-white/30 text-white rounded-xl transition active:scale-95"><X size={20}/></button>
                                </div>
                            </div>
                            <p className="text-indigo-200 text-xs mt-4 font-medium opacity-80">Masukkan maksimal 6 karakter (A-Z, 0-9)</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8">
                            <div className="relative group cursor-pointer" onClick={() => { navigator.clipboard.writeText(token); alert("Token disalin ke clipboard!"); }}>
                                <h1 className="text-6xl md:text-8xl font-black tracking-[0.25em] font-mono drop-shadow-lg select-all transition-all group-hover:scale-105 group-hover:text-indigo-50">
                                    {token}
                                </h1>
                                <div className="absolute -right-10 md:-right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white/70 bg-black/20 p-2 rounded-full">
                                    <Copy size={24} />
                                </div>
                            </div>
                            
                            {isAdminPusat && (
                                <button onClick={() => setIsEditingToken(true)} className="flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-full font-bold text-sm shadow-xl hover:bg-indigo-50 hover:scale-105 transition transform active:scale-95">
                                    <Edit size={16} /> Ubah Token
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-emerald-200 transition-colors h-40">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={64} className="text-emerald-500" />
                    </div>
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <CheckCircle2 size={20} />
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Status Sistem</h3>
                    <p className="text-lg font-extrabold text-emerald-600">Online & Aktif</p>
                </div>

                {/* Exam Duration Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-blue-200 transition-colors h-40">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} className="text-blue-500" />
                    </div>
                    
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <Clock size={20} />
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Durasi Ujian (Default)</h3>
                    
                    {isEditingDuration && isAdminPusat ? (
                        <div className="flex items-center gap-2 mt-1 bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                            <input type="number" className="w-16 p-1 bg-white border border-blue-200 rounded text-center font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-200" value={durationInput} onChange={e => setDurationInput(Number(e.target.value))} autoFocus />
                            <button onClick={handleUpdateDuration} className="text-white bg-emerald-500 p-1.5 rounded hover:bg-emerald-600 transition shadow-sm"><CheckCircle2 size={16}/></button>
                            <button onClick={() => {setIsEditingDuration(false); setDurationInput(duration);}} className="text-slate-500 hover:text-slate-700 p-1.5"><X size={16}/></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/edit cursor-pointer" onClick={() => isAdminPusat && setIsEditingDuration(true)}>
                            <p className="text-2xl font-extrabold text-slate-800">{duration} <span className="text-sm font-semibold text-slate-400">Menit</span></p>
                            {isAdminPusat && <span className="opacity-0 group-hover/edit:opacity-100 text-blue-500 transition-opacity"><Edit size={14}/></span>}
                        </div>
                    )}
                </div>

                {/* Survey Duration Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-purple-200 transition-colors h-40">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layers size={64} className="text-purple-500" />
                    </div>
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                        <Settings size={20} />
                    </div>
                    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Durasi Survey</h3>
                    <p className="text-2xl font-extrabold text-slate-800">{surveyDuration || 30} <span className="text-sm font-semibold text-slate-400">Menit</span></p>
                </div>
            </div>

            {/* Detailed Settings (Admin Pusat Only) */}
            {isAdminPusat && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Settings size={18} className="text-slate-500" />
                        <h3 className="font-bold text-slate-700">Konfigurasi Lanjutan</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Max Questions Setting */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Limit Soal Tampil (Exam)</label>
                            <div className="flex gap-3">
                                <input 
                                    type="number" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none transition" 
                                    value={localMaxQ} 
                                    onChange={(e) => setLocalMaxQ(Number(e.target.value))} 
                                    placeholder="0" 
                                    min="0"
                                />
                                <button 
                                    onClick={handleSaveMaxQ} 
                                    disabled={isSavingQ || localMaxQ == maxQuestions} 
                                    className="px-5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition flex items-center justify-center min-w-[100px] shadow-sm"
                                >
                                    {isSavingQ ? <Loader2 size={18} className="animate-spin"/> : "Simpan"}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Masukkan <b>0</b> untuk menampilkan semua soal. Jika diisi angka (misal: 50), sistem akan mengacak dan mengambil 50 soal saja dari bank soal untuk setiap siswa.
                            </p>
                        </div>

                        {/* Survey Duration Setting */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Durasi Pengerjaan Survey</label>
                            <div className="flex gap-3">
                                <input 
                                    type="number" 
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none transition" 
                                    value={surveyDur} 
                                    onChange={(e) => setSurveyDur(Number(e.target.value))} 
                                    placeholder="30" 
                                    min="1"
                                />
                                <button 
                                    onClick={handleSaveSurveyDur} 
                                    disabled={isSavingQ || surveyDur == surveyDuration} 
                                    className="px-5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition flex items-center justify-center min-w-[100px] shadow-sm"
                                >
                                    {isSavingQ ? <Loader2 size={18} className="animate-spin"/> : "Simpan"}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Durasi dalam menit untuk sesi Survey Karakter dan Lingkungan Belajar. Default adalah 30 menit.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RilisTokenTab;
