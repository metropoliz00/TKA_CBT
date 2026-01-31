import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, Save, X, Edit, Clock, CheckCircle2, Layers, Loader2 } from 'lucide-react';
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
        <div className="flex flex-col items-center justify-center py-10 fade-in">
            <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 text-center max-w-lg w-full">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><Key size={40} /></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Manajemen Token & Status Sistem</h2>
                <p className="text-slate-500 mb-8">{isAdminPusat ? "Atur token akses, durasi, dan batas soal untuk semua sesi ujian." : "Informasi Token & Status Sistem."}</p>
                
                {/* Token Section */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-inner mb-6 relative group">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 text-center">Token Ujian Aktif</p>
                    {isEditingToken ? (
                        <div className="flex gap-2 justify-center items-center">
                            <input type="text" className="w-32 p-2 bg-slate-800 border border-slate-600 rounded-lg text-center font-mono font-bold uppercase text-2xl text-white outline-none focus:border-indigo-500" value={tokenInput} onChange={e=>setTokenInput(e.target.value.toUpperCase())} maxLength={6} />
                            <button onClick={generateToken} className="bg-amber-600 text-white p-2 rounded-lg hover:bg-amber-700 transition" title="Acak"><RefreshCw size={20}/></button>
                            <button onClick={handleUpdateToken} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition"><Save size={20}/></button>
                            <button onClick={()=>{setIsEditingToken(false); setTokenInput(token);}} className="bg-slate-700 text-white p-2 rounded-lg hover:bg-slate-600 transition"><X size={20}/></button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-4">
                            <span className="font-mono text-5xl font-extrabold tracking-[0.2em] cursor-pointer hover:text-indigo-300 transition" onClick={() => navigator.clipboard.writeText(token)} title="Klik untuk salin">{token}</span>
                            {isAdminPusat && (
                                <button onClick={()=>setIsEditingToken(true)} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition"><Edit size={18}/></button>
                            )}
                        </div>
                    )}
                </div>

                {/* Exam Duration & Status Section */}
                <div className={`grid ${isAdminPusat ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-6`}>
                    {isAdminPusat && (
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-center relative">
                        <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 justify-center"><Clock size={12}/> Durasi Ujian (Menit)</p>
                        {isEditingDuration ? (
                            <div className="flex gap-1 justify-center items-center mt-1">
                                <input type="number" className="w-16 p-1 bg-white border border-indigo-200 rounded text-center font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-300" value={durationInput} onChange={e=>setDurationInput(Number(e.target.value))} />
                                <button onClick={handleUpdateDuration} className="bg-emerald-500 text-white p-1 rounded hover:bg-emerald-600"><Save size={14}/></button>
                                <button onClick={()=>{setIsEditingDuration(false); setDurationInput(duration);}} className="bg-slate-400 text-white p-1 rounded hover:bg-slate-500"><X size={14}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <p className="text-2xl font-bold text-indigo-700">{duration}</p>
                                {isAdminPusat && (
                                    <button onClick={()=>setIsEditingDuration(true)} className="text-indigo-400 hover:text-indigo-600"><Edit size={14}/></button>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                    
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center">
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Status Sistem</p>
                        <p className="text-xl font-bold text-emerald-600 flex items-center justify-center gap-2"><CheckCircle2 size={20}/> Aktif</p>
                    </div>
                </div>

                {/* Other Settings (Only visible for Admin Pusat) */}
                {isAdminPusat && (
                    <div className="bg-white border border-slate-200 p-4 rounded-xl mb-6 text-left shadow-sm space-y-4">
                        <div><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Layers size={14}/> Jumlah Soal Tampil (Exam)</label><span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">0 = Semua</span></div><div className="flex gap-2"><input type="number" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none text-center" value={localMaxQ} onChange={(e) => setLocalMaxQ(Number(e.target.value))} placeholder="0" min="0"/><button onClick={handleSaveMaxQ} disabled={isSavingQ || localMaxQ == maxQuestions} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition">{isSavingQ ? <Loader2 size={14} className="animate-spin"/> : "Simpan"}</button></div></div>
                        <div className="border-t border-slate-100 pt-4"><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Clock size={14}/> Durasi Survey (Menit)</label></div><div className="flex gap-2"><input type="number" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none text-center" value={surveyDur} onChange={(e) => setSurveyDur(Number(e.target.value))} placeholder="30" min="1"/><button onClick={handleSaveSurveyDur} disabled={isSavingQ} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition">Simpan</button></div></div>
                    </div>
                )}
                
                <button onClick={refreshData} disabled={isRefreshing} className={`w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition shadow-lg flex items-center justify-center gap-2 ${isRefreshing ? 'opacity-75 cursor-wait' : ''}`}><RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? "Memuat Data..." : "Refresh Data"}</button>
            </div>
        </div>
    )
}

export default RilisTokenTab;
