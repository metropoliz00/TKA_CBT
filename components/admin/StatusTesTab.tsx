import React, { useState, useMemo } from 'react';
import { Monitor, Search, PlayCircle, Key, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';

const StatusTesTab = ({ currentUser, students, refreshData }: { currentUser: User, students: any[], refreshData: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [resetting, setResetting] = useState<string | null>(null);
    const uniqueSchools = useMemo<string[]>(() => { const schools = new Set(students.map(s => s.school).filter(Boolean)); return Array.from(schools).sort() as string[]; }, [students]);
    const uniqueKecamatans = useMemo(() => { const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-')); return Array.from(kecs).sort(); }, [students]);
    const filtered = useMemo(() => { return students.filter(s => { const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || s.username.toLowerCase().includes(searchTerm.toLowerCase()); if (currentUser.role === 'admin_sekolah') { return matchName && (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase(); } let matchFilter = true; if (filterSchool !== 'all') matchFilter = matchFilter && s.school === filterSchool; if (filterKecamatan !== 'all') matchFilter = matchFilter && (s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase(); return matchName && matchFilter; }); }, [students, searchTerm, currentUser, filterSchool, filterKecamatan]);
    const handleReset = async (username: string) => { if(!confirm(`Reset login untuk ${username}? Siswa akan logout otomatis and status menjadi OFFLINE.`)) return; setResetting(username); try { await api.resetLogin(username); refreshData(); alert(`Login ${username} berhasil di-reset.`); } catch(e) { console.error(e); alert("Gagal reset login."); } finally { setResetting(null); } }
    const renderStatusBadge = (status: string) => { switch (status) { case 'WORKING': return <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><PlayCircle size={12}/> Mengerjakan</span>; case 'LOGGED_IN': return <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Key size={12}/> Login</span>; case 'FINISHED': return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> Selesai</span>; case 'OFFLINE': default: return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><span className="opacity-50">⚠️</span> Offline</span>; } };
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
             <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Monitor size={20}/> Status Peserta</h3>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                        <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}><option value="all">Semua Sekolah</option>{uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </>
                    )}
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Cari Peserta..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                </div>
             </div>
             <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Nama Peserta</th><th className="p-4">Username</th><th className="p-4">Sekolah</th><th className="p-4">Kecamatan</th><th className="p-4">Status</th><th className="p-4">Ujian Aktif</th><th className="p-4 text-center">Aksi</th></tr></thead><tbody className="divide-y divide-slate-50">{filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Tidak ada data.</td></tr> : filtered.map((s, i) => (<tr key={i} className="hover:bg-slate-50"><td className="p-4 font-bold text-slate-700">{s.fullname}</td><td className="p-4 font-mono text-slate-500">{s.username}</td><td className="p-4 text-slate-600">{s.school}</td><td className="p-4 text-slate-600">{s.kecamatan || '-'}</td><td className="p-4">{renderStatusBadge(s.status)}</td><td className="p-4 text-slate-600">{s.active_exam || '-'}</td><td className="p-4 text-center"><button onClick={() => handleReset(s.username)} disabled={!!resetting} className="bg-amber-50 text-amber-600 px-3 py-1 rounded text-xs font-bold hover:bg-amber-100 transition border border-amber-100">{resetting === s.username ? "Processing..." : "Reset Login"}</button></td></tr>))}</tbody></table></div>
        </div>
    )
};

export default StatusTesTab;
