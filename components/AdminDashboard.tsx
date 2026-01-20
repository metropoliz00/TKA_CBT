import React, { useState, useMemo, useEffect } from 'react';
import { Users, BookOpen, BarChart3, Settings, LogOut, Home, LayoutDashboard, Award, Activity, FileText, RefreshCw, Key, FileQuestion, Plus, Trash2, Edit, Save, X, Search, CheckCircle2, AlertCircle, Clock, PlayCircle, Filter, ChevronLeft, ChevronRight, School, UserCog, UserCheck, GraduationCap, Shield, Loader2, Upload, Download, Monitor, List, Group, Menu } from 'lucide-react';
import { api } from '../services/api';
import { User, QuestionRow } from '../types';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

// Helper to format duration string "HH:mm:ss" or "mm:ss" to text "X Jam Y Menit Z Detik"
const formatDurationToText = (duration: string) => {
    if (!duration || duration === '-' || duration === 'undefined') return '-';
    try {
        const parts = duration.split(':').map(p => parseInt(p, 10) || 0);
        let h = 0, m = 0, s = 0;
        if (parts.length === 3) { [h, m, s] = parts; } 
        else if (parts.length === 2) { [m, s] = parts; } 
        else { return duration; }
        
        const textParts = [];
        if (h > 0) textParts.push(`${h} Jam`);
        if (m > 0) textParts.push(`${m} Menit`);
        if (s > 0) textParts.push(`${s} Detik`);
        
        return textParts.length > 0 ? textParts.join(' ') : '0 Detik';
    } catch (e) { return duration; }
};

// Generic Export Function
const exportToExcel = (data: any[], fileName: string, sheetName: string = "Data") => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// Custom SVG Donut Chart
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
                        <circle key={i} cx={center} cy={center} r={radius} fill="transparent" stroke={item.color} strokeWidth="24" strokeDasharray={`${dashArray} ${circumference}`} strokeDashoffset={-offset} className="transition-all duration-1000 ease-out" />
                    );
                })}
                {total === 0 && <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="24" />}
            </svg>
            <div className="absolute flex flex-col items-center"><span className="text-2xl font-bold text-slate-700">{total}</span><span className="text-xs text-slate-400 font-bold uppercase">Total</span></div>
        </div>
    );
};

// --- DATA USER COMPONENT (RENAMED TO DAFTAR PESERTA) ---
const DaftarPesertaTab = ({ currentUser }: { currentUser: User }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [roleFilter, setRoleFilter] = useState<'siswa' | 'admin_sekolah' | 'admin_pusat'>('siswa');

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        let res = users;
        if (currentUser.role === 'admin_sekolah') {
            const mySchool = (currentUser.kelas_id || '').toLowerCase();
            res = res.filter(u => (u.school || '').toLowerCase() === mySchool);
        }
        return res.filter(u => {
            const r = (u.role || '').toLowerCase();
            if (roleFilter === 'admin_sekolah') return r === 'admin_sekolah';
            if (roleFilter === 'admin_pusat') return r === 'admin_pusat' || r === 'admin';
            return r === 'siswa' || r === '';
        });
    }, [users, roleFilter, currentUser]);

    // --- USER IMPORT LOGIC ---
    const downloadUserTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                "Username": "siswa001",
                "Password": "123",
                "Role (siswa/admin_sekolah/admin_pusat)": "siswa",
                "Nama Lengkap": "Budi Santoso",
                "Jenis Kelamin (L/P)": "L",
                "Asal Sekolah / Kelas": "XII IPA 1"
            },
            {
                "Username": "proktor01",
                "Password": "admin123",
                "Role (siswa/admin_sekolah/admin_pusat)": "admin_sekolah",
                "Nama Lengkap": "Pak Guru",
                "Jenis Kelamin (L/P)": "L",
                "Asal Sekolah / Kelas": "XII IPA 1"
            },
            {
                "Username": "adminpusat",
                "Password": "supersecret",
                "Role (siswa/admin_sekolah/admin_pusat)": "admin_pusat",
                "Nama Lengkap": "Administrator Pusat",
                "Jenis Kelamin (L/P)": "L",
                "Asal Sekolah / Kelas": "Pusat"
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_User");
        XLSX.writeFile(wb, "Template_Data_User.xlsx");
    };

    const handleUserImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setImporting(true);
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // Parse Data (Skip header row 0)
                const parsedUsers: any[] = [];
                // Columns Expected: Username, Password, Role, Fullname, Gender, School
                // Index: 0, 1, 2, 3, 4, 5
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!row[0]) continue;
                    
                    let role = String(row[2] || 'siswa').toLowerCase();
                    // Normalize role input
                    if (role.includes('admin') && role.includes('sekolah')) role = 'admin_sekolah';
                    else if (role.includes('admin') && role.includes('pusat')) role = 'admin_pusat';
                    else if (role.includes('proktor')) role = 'admin_sekolah';
                    else if (role !== 'admin_sekolah' && role !== 'admin_pusat') role = 'siswa';

                    parsedUsers.push({
                        username: String(row[0]),
                        password: String(row[1] || '123456'),
                        role: role,
                        fullname: String(row[3] || row[0]),
                        gender: String(row[4] || '-'),
                        school: String(row[5] || '-')
                    });
                }

                if (parsedUsers.length > 0) {
                     await api.importUsers(parsedUsers);
                     alert(`Berhasil mengimpor ${parsedUsers.length} user.`);
                     loadUsers(); // Refresh list
                } else {
                    alert("Tidak ada data user yang valid dalam file.");
                }

            } catch (err) {
                console.error(err);
                alert("Gagal membaca file Excel. Pastikan format sesuai template.");
            } finally {
                setImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6 fade-in max-w-full mx-auto">
            {/* Header / Filter / Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => setRoleFilter('siswa')} className={`flex-1 md:flex-none py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm ${roleFilter === 'siswa' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}><GraduationCap size={16}/> Siswa</button>
                    <button onClick={() => setRoleFilter('admin_sekolah')} className={`flex-1 md:flex-none py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm ${roleFilter === 'admin_sekolah' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}><UserCheck size={16}/> Proktor</button>
                    {currentUser.role === 'admin_pusat' && (
                        <button onClick={() => setRoleFilter('admin_pusat')} className={`flex-1 md:flex-none py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm ${roleFilter === 'admin_pusat' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}><Shield size={16}/> Admin</button>
                    )}
                </div>

                {currentUser.role === 'admin_pusat' && (
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={downloadUserTemplate}
                            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition"
                            title="Download Template User Excel"
                        >
                            <Download size={16}/> Template
                        </button>
                        <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition text-white ${importing ? 'bg-emerald-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                            {importing ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                            {importing ? "Mengimpor..." : "Import Excel"}
                            <input type="file" accept=".xlsx" onChange={handleUserImport} className="hidden" disabled={importing} />
                        </label>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20"><Loader2 size={40} className="animate-spin text-indigo-600 mb-2" /><span className="text-sm font-bold text-slate-400 animate-pulse">Memuat Data User...</span></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                                <tr>
                                    <th className="p-4 w-16 text-center">No</th>
                                    <th className="p-4">Identitas User</th>
                                    <th className="p-4">Password</th>
                                    <th className="p-4 w-32 text-center">Role</th>
                                    <th className="p-4">Asal Sekolah / Kelas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? ( <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada data user.</td></tr> ) : filteredUsers.map((u, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors duration-200">
                                        <td className="p-4 text-center text-slate-400 font-bold text-xs">{i+1}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-base">{u.fullname || '-'}</span>
                                                <span className="font-mono text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded w-fit mt-0.5">{u.username}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-slate-400 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100 select-all cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition">{u.password}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${u.role === 'admin_pusat' ? 'bg-purple-50 text-purple-700 border-purple-200' : u.role === 'admin_sekolah' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                {u.role === 'admin_sekolah' ? 'Proktor' : (u.role === 'admin_pusat' ? 'Admin' : 'Siswa')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <School size={16} className="text-slate-400"/>
                                                <span className="font-medium text-sm">{u.school || '-'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- NEW COMPONENT: STATUS TES (MONITORING & RESET) ---
const StatusTesTab = ({ currentUser, students }: { currentUser: User, students: any[] }) => {
    const [filterSchool, setFilterSchool] = useState('Semua');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = useMemo(() => {
        let res = students;
        if (currentUser.role === 'admin_sekolah') {
            const mySchool = (currentUser.kelas_id || '').toLowerCase();
            res = res.filter(s => (s.school || '').toLowerCase() === mySchool);
        } else if (filterSchool !== 'Semua') {
            res = res.filter(s => s.school === filterSchool);
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(s => s.fullname.toLowerCase().includes(lower) || s.username.toLowerCase().includes(lower));
        }
        return res;
    }, [students, currentUser, filterSchool, searchTerm]);

    const handleReset = async (username: string) => {
        if(confirm(`Reset login untuk user ${username}? Status akan kembali ke OFFLINE.`)) {
            await api.resetLogin(username);
            alert("Berhasil reset. Harap refresh data dashboard.");
        }
    };

    const schools = useMemo(() => ['Semua', ...Array.from(new Set(students.map(s => s.school).filter(Boolean)))], [students]);

    return (
        <div className="space-y-6 fade-in">
             <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm justify-between items-center">
                 <div className="flex gap-4 w-full md:w-auto">
                     {currentUser.role === 'admin_pusat' && (
                         <select className="p-2 border rounded-lg text-sm font-bold text-slate-700" value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
                             {schools.map(s=><option key={s} value={s}>{s}</option>)}
                         </select>
                     )}
                     <div className="relative w-full md:w-64">
                         <Search size={18} className="absolute left-3 top-2.5 text-slate-400"/>
                         <input type="text" placeholder="Cari Siswa..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                     </div>
                 </div>
                 <div className="text-sm font-bold text-slate-500">Total: {filteredStudents.length} Peserta</div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Username</th>
                                <th className="p-4">Nama Lengkap</th>
                                <th className="p-4">Sekolah</th>
                                <th className="p-4">Mapel Aktif</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Tidak ada data.</td></tr> : filteredStudents.map((s,i) => {
                                let badgeClass = "bg-slate-100 text-slate-500";
                                if(s.status === 'LOGGED_IN') badgeClass = "bg-yellow-100 text-yellow-700";
                                if(s.status === 'WORKING') badgeClass = "bg-blue-100 text-blue-700";
                                if(s.status === 'FINISHED') badgeClass = "bg-emerald-100 text-emerald-700";
                                
                                return (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono text-slate-600 font-bold">{s.username}</td>
                                        <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                        <td className="p-4 text-slate-600">{s.school}</td>
                                        <td className="p-4 text-slate-500 text-xs">{s.active_exam || '-'}</td>
                                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${badgeClass}`}>{s.status.replace('_', ' ')}</span></td>
                                        <td className="p-4 text-center">
                                            <button onClick={()=>handleReset(s.username)} className="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-100 transition flex items-center gap-1 mx-auto">
                                                <RefreshCw size={12}/> Reset Login
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>
    )
};

// --- NEW COMPONENT: KELOMPOK TES (ASSIGN GROUP) ---
const KelompokTesTab = ({ currentUser, students }: { currentUser: User, students: any[] }) => {
    const [selectedExam, setSelectedExam] = useState('');
    const [exams, setExams] = useState<string[]>([]);
    const [session, setSession] = useState('Sesi 1');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadExams = async () => {
             const list = await api.getExams();
             const names = list.map(e=>e.nama_ujian);
             setExams(names);
             if(names.length>0) setSelectedExam(names[0]);
        };
        loadExams();
    }, []);

    const filteredStudents = useMemo(() => {
        if (currentUser.role === 'admin_sekolah') {
            const mySchool = (currentUser.kelas_id || '').toLowerCase();
            return students.filter(s => (s.school || '').toLowerCase() === mySchool);
        }
        return students;
    }, [students, currentUser]);

    const toggleUser = (username: string) => {
        const newSet = new Set(selectedUsers);
        if(newSet.has(username)) newSet.delete(username);
        else newSet.add(username);
        setSelectedUsers(newSet);
    };

    const toggleAll = () => {
        if(selectedUsers.size === filteredStudents.length) setSelectedUsers(new Set());
        else setSelectedUsers(new Set(filteredStudents.map(s=>s.username)));
    };

    const handleAssign = async () => {
        if(selectedUsers.size === 0) return alert("Pilih minimal satu siswa.");
        if(!selectedExam) return alert("Pilih Mapel Ujian.");
        setLoading(true);
        try {
            await api.assignTestGroup(Array.from(selectedUsers), selectedExam, session);
            alert(`Berhasil mengaktifkan ujian ${selectedExam} untuk ${selectedUsers.size} siswa.`);
            setSelectedUsers(new Set());
        } catch(e) { console.error(e); alert("Gagal menyimpan."); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-6 fade-in">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Atur Kelompok Ujian</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Pilih Ujian / Mapel</label>
                        <select className="w-full p-2.5 border rounded-lg font-bold text-slate-700" value={selectedExam} onChange={e=>setSelectedExam(e.target.value)}>
                            {exams.map(e=><option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Pilih Sesi</label>
                        <select className="w-full p-2.5 border rounded-lg font-bold text-slate-700" value={session} onChange={e=>setSession(e.target.value)}>
                            {["Sesi 1", "Sesi 2", "Sesi 3", "Sesi 4"].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={handleAssign} disabled={loading} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                            {loading ? "Menyimpan..." : "Aktifkan Peserta"}
                        </button>
                    </div>
                </div>

                <div className="border rounded-xl overflow-hidden max-h-[500px] flex flex-col">
                    <div className="bg-slate-50 p-3 border-b font-bold text-slate-500 text-sm flex justify-between items-center">
                        <span>Daftar Siswa ({filteredStudents.length})</span>
                        <button onClick={toggleAll} className="text-xs text-indigo-600 hover:underline">{selectedUsers.size === filteredStudents.length ? "Hapus Semua" : "Pilih Semua"}</button>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1">
                        {filteredStudents.map(s => (
                            <label key={s.username} className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${selectedUsers.has(s.username) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`}>
                                <input type="checkbox" className="w-5 h-5 accent-indigo-600 rounded mr-3" checked={selectedUsers.has(s.username)} onChange={()=>toggleUser(s.username)} />
                                <div className="flex-1">
                                    <div className="font-bold text-slate-700 text-sm">{s.fullname}</div>
                                    <div className="text-xs text-slate-400 font-mono">{s.username} • {s.school}</div>
                                </div>
                                <div className="text-xs font-bold text-slate-400">{s.active_exam || '-'}</div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
};

// --- NEW COMPONENT: RILIS TOKEN ---
const RilisTokenTab = ({ token, duration, refreshData, isRefreshing }: { token: string, duration: number, refreshData: () => void, isRefreshing: boolean }) => {
    return (
        <div className="flex flex-col items-center justify-center py-10 fade-in">
            <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-100 text-center max-w-lg w-full">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Key size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Token Ujian Aktif</h2>
                <p className="text-slate-500 mb-8">Berikan token ini kepada peserta untuk memulai ujian.</p>
                
                <div className="bg-slate-900 text-white p-8 rounded-2xl font-mono text-5xl font-extrabold tracking-[0.2em] shadow-inner mb-8 relative group cursor-pointer" onClick={() => navigator.clipboard.writeText(token)}>
                    {token}
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-sans tracking-normal font-bold">Salin Token</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                     <div>
                         <p className="text-xs text-slate-400 font-bold uppercase">Durasi Ujian</p>
                         <p className="text-xl font-bold text-slate-700">{duration} Menit</p>
                     </div>
                     <div>
                         <p className="text-xs text-slate-400 font-bold uppercase">Status</p>
                         <p className="text-xl font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={18}/> Aktif</p>
                     </div>
                </div>

                <button onClick={refreshData} disabled={isRefreshing} className={`w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 ${isRefreshing ? 'opacity-75 cursor-wait' : ''}`}>
                    <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} /> 
                    {isRefreshing ? "Memuat Data..." : "Refresh Data"}
                </button>
            </div>
        </div>
    )
}

const BankSoalTab = () => {
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentQ, setCurrentQ] = useState<QuestionRow | null>(null);
    const [importing, setImporting] = useState(false);

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

    // --- IMPORT / EXPORT LOGIC ---
    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                "ID Soal": "Q1",
                "Teks Soal": "Berapakah hasil dari 1 + 1?",
                "Tipe Soal (PG/PGK/BS)": "PG",
                "Link Gambar": "",
                "Opsi A / Pernyataan 1": "2",
                "Opsi B / Pernyataan 2": "3",
                "Opsi C / Pernyataan 3": "4",
                "Opsi D / Pernyataan 4": "5",
                "Kunci Jawaban": "A",
                "Bobot": 10
            },
            {
                "ID Soal": "Q2",
                "Teks Soal": "Pilih bilangan prima (Lebih dari satu jawaban)",
                "Tipe Soal (PG/PGK/BS)": "PGK",
                "Link Gambar": "",
                "Opsi A / Pernyataan 1": "2",
                "Opsi B / Pernyataan 2": "4",
                "Opsi C / Pernyataan 3": "3",
                "Opsi D / Pernyataan 4": "9",
                "Kunci Jawaban": "A,C",
                "Bobot": 10
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Soal_CBT.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setImporting(true);
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                
                // Parse Data (Skip header row 0)
                const parsedQuestions: QuestionRow[] = [];
                // Expecting Columns: ID, Text, Type, Image, A, B, C, D, Key, Bobot
                // Index: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!row[0]) continue;
                    parsedQuestions.push({
                        id: String(row[0]),
                        text_soal: String(row[1] || ""),
                        tipe_soal: (String(row[2] || "PG").toUpperCase() as any),
                        gambar: String(row[3] || ""),
                        opsi_a: String(row[4] || ""),
                        opsi_b: String(row[5] || ""),
                        opsi_c: String(row[6] || ""),
                        opsi_d: String(row[7] || ""),
                        kunci_jawaban: String(row[8] || "").toUpperCase(),
                        bobot: Number(row[9] || 10)
                    });
                }

                if (parsedQuestions.length > 0) {
                     await api.importQuestions(selectedSubject, parsedQuestions);
                     alert(`Berhasil mengimpor ${parsedQuestions.length} soal.`);
                     // Refresh
                     setLoadingData(true);
                     const freshData = await api.getRawQuestions(selectedSubject);
                     setQuestions(freshData);
                     setLoadingData(false);
                } else {
                    alert("Tidak ada data soal yang ditemukan dalam file.");
                }

            } catch (err) {
                console.error(err);
                alert("Gagal membaca file Excel. Pastikan format sesuai template.");
            } finally {
                setImporting(false);
                // Reset file input
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
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
             <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><FileQuestion size={24}/></div>
                    <div>
                        <h3 className="font-bold text-slate-800">Manajemen Bank Soal</h3>
                        <p className="text-xs text-slate-400">Edit database soal (Matematika / Bahasa Indonesia).</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select 
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold min-w-[150px]"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                    >
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button 
                        onClick={downloadTemplate}
                        className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition"
                        title="Download Template Excel"
                    >
                        <Download size={16}/> Template
                    </button>

                    <label className={`cursor-pointer px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition text-white ${importing ? 'bg-emerald-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {importing ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                        {importing ? "Mengimpor..." : "Import Excel"}
                        <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" disabled={importing} />
                    </label>

                    <button onClick={handleAddNew} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                        <Plus size={16}/> Tambah
                    </button>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {loadingData ? (
                     <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={40} className="animate-spin text-indigo-600 mb-2" />
                        <span className="text-sm font-bold text-slate-400 animate-pulse">Memuat Soal...</span>
                    </div>
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

const SchoolIcon = ({ size, className }: { size: number, className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m4 6 8-4 8 4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M18 5v17"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rekap' | 'analisis' | 'ranking' | 'bank_soal' | 'data_user' | 'status_tes' | 'kelompok_tes' | 'rilis_token'>('overview');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [dashboardData, setDashboardData] = useState<any>({ 
      students: [], 
      questionsMap: {}, 
      totalUsers: 0, 
      token: 'TOKEN',
      duration: 60,
      statusCounts: { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 },
      activityFeed: [],
      allUsers: [] // Extended user data for Status/Group tabs
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isEditingToken, setIsEditingToken] = useState(false);
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Duration State
  const [durationInput, setDurationInput] = useState(60);
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
        const data = await api.getDashboardData();
        setDashboardData(data);
        setTokenInput(data.token);
        setDurationInput(Number(data.duration) || 60);
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
  
  const handleUpdateDuration = async () => {
      await api.saveDuration(durationInput);
      setIsEditingDuration(false);
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

  // Helper function to get Dynamic Header Title
  const getTabTitle = () => {
    switch(activeTab) {
        case 'overview': return "Dashboard Utama";
        case 'bank_soal': return "Manajemen Bank Soal";
        case 'rekap': return "Rekapitulasi Nilai";
        case 'analisis': return "Analisis Statistik Soal";
        case 'ranking': return "Peringkat Peserta";
        case 'data_user': return "Daftar Peserta";
        case 'status_tes': return "Status Tes & Reset Login";
        case 'kelompok_tes': return "Kelompok Tes (Assignment)";
        case 'rilis_token': return "Rilis Token";
        default: return "Dashboard";
    }
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
    
    // Filter Activity Feed for Proktor
    const filteredFeed = useMemo(() => {
        const feed = dashboardData.activityFeed || [];
        if (user.role === 'admin_sekolah') {
            const mySchool = (user.kelas_id || '').toLowerCase();
            return feed.filter((log: any) => (log.school || '').toLowerCase() === mySchool);
        }
        return feed;
    }, [dashboardData.activityFeed]);

    return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
        {user.role === 'admin_sekolah' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl flex items-center gap-3">
                <div className="bg-blue-200 p-2 rounded-lg"><SchoolIcon size={20}/></div>
                <div>
                    <h3 className="font-bold text-sm uppercase tracking-wide">Mode Proktor</h3>
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
            
            <div className="grid grid-rows-2 gap-4">
                {/* Token Card */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Token Ujian</p>
                    {isEditingToken ? (
                        <div className="flex gap-1">
                            <input type="text" className="w-full p-1 border border-slate-300 rounded text-center font-mono font-bold uppercase text-lg" value={tokenInput} onChange={e=>setTokenInput(e.target.value.toUpperCase())} maxLength={6} />
                            <button onClick={generateToken} className="bg-amber-100 text-amber-600 p-1 rounded hover:bg-amber-200" title="Acak"><RefreshCw size={14}/></button>
                            <button onClick={handleUpdateToken} className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"><Save size={14}/></button>
                            <button onClick={()=>setIsEditingToken(false)} className="bg-slate-200 text-slate-600 p-1 rounded hover:bg-slate-300"><X size={14}/></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-mono font-bold text-slate-800 tracking-widest">{dashboardData.token}</span>
                            {user.role === 'admin_pusat' && (
                                <button onClick={()=>{ setTokenInput(dashboardData.token); setIsEditingToken(true); }} className="text-slate-400 hover:text-indigo-500 transition"><Edit size={16}/></button>
                            )}
                        </div>
                    )}
                </div>

                {/* Duration Card */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Durasi (Menit)</p>
                    {isEditingDuration ? (
                        <div className="flex gap-1">
                            <input type="number" className="w-full p-1 border border-slate-300 rounded text-center font-mono font-bold text-lg" value={durationInput} onChange={e=>setDurationInput(Number(e.target.value))} />
                            <button onClick={handleUpdateDuration} className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"><Save size={14}/></button>
                            <button onClick={()=>{ setDurationInput(Number(dashboardData.duration)); setIsEditingDuration(false); }} className="bg-slate-200 text-slate-600 p-1 rounded hover:bg-slate-300"><X size={14}/></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-mono font-bold text-slate-800">{dashboardData.duration} <span className="text-xs text-slate-400">Menit</span></span>
                            {user.role === 'admin_pusat' && (
                                <button onClick={()=>{ setIsEditingDuration(true); }} className="text-slate-400 hover:text-indigo-500 transition"><Edit size={16}/></button>
                            )}
                        </div>
                    )}
                </div>
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
                {user.role === 'admin_sekolah' && (
                    <p className="mt-4 text-[10px] text-slate-400 text-center italic">Grafik di atas menampilkan total global. Untuk detail siswa sekolah Anda, lihat daftar Aktivitas Terbaru di samping.</p>
                )}
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 col-span-2">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Activity size={18} className="text-indigo-500"/> Aktivitas Terbaru</h3>
                <div className="space-y-0 h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredFeed && filteredFeed.length > 0 ? (
                        filteredFeed.map((log: any, i: number) => {
                            let icon = <AlertCircle size={20}/>;
                            let colorClass = "bg-slate-100 text-slate-500";
                            let statusText = "Unknown";
                            
                            if (log.action === 'LOGIN') {
                                icon = <Key size={20}/>;
                                colorClass = "bg-yellow-100 text-yellow-600";
                                statusText = "Login";
                            } else if (log.action === 'START') {
                                icon = <PlayCircle size={20}/>;
                                colorClass = "bg-blue-100 text-blue-600";
                                statusText = "Mengerjakan";
                            } else if (log.action === 'FINISH') {
                                icon = <CheckCircle2 size={20}/>;
                                colorClass = "bg-emerald-100 text-emerald-600";
                                statusText = "Selesai";
                            } else if (log.action === 'WORKING') { // Fallback from logs
                                icon = <PlayCircle size={20}/>;
                                colorClass = "bg-blue-100 text-blue-600";
                                statusText = "Mengerjakan";
                            }

                            const hasSubject = log.subject && log.subject !== '-' && log.subject !== 'Success';

                            return (
                                <div key={i} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition border-b border-slate-50 last:border-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-sm font-bold text-slate-700 truncate">{log.fullname}</p>
                                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        
                                        <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                            <SchoolIcon size={12} className="text-slate-400"/>
                                            <span className="truncate">{log.school || '-'}</span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-20 ')}`}>
                                                {statusText}
                                            </span>
                                            {hasSubject && (
                                                <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                    {log.subject}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 italic">
                            <Activity size={32} className="mb-2 opacity-20"/>
                            Belum ada aktivitas tercatat untuk sekolah ini.
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
            let hours = 0, minutes = 0, seconds = 0;
            if (parts.length === 3) { hours = parseInt(parts[0], 10); minutes = parseInt(parts[1], 10); seconds = parseInt(parts[2], 10); } 
            else if (parts.length === 2) { minutes = parseInt(parts[0], 10); seconds = parseInt(parts[1], 10); }
            const durationMs = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
            const startDate = new Date(endDate.getTime() - durationMs);
            return startDate.toLocaleTimeString();
        } catch (e) { return "-"; }
    };

    const formatTime = (isoString: string) => {
        try { return new Date(isoString).toLocaleTimeString(); } catch { return isoString; }
    };

    const handleExport = () => {
        const dataToExport = sortedStudents.map((s: any, i: number) => ({
            No: i + 1,
            Username: s.username,
            "Nama Peserta": s.fullname,
            "Asal Sekolah": s.school,
            Mapel: s.subject,
            Score: s.score,
            "Waktu Mulai": calculateStartTime(s.timestamp, s.duration),
            "Waktu Selesai": formatTime(s.timestamp),
            Durasi: formatDurationToText(s.duration)
        }));
        exportToExcel(dataToExport, "Rekap_Nilai_Peserta", "Rekap Nilai");
    };

    if (isRefreshing) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col items-center justify-center fade-in">
                <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-bold animate-pulse">Menyinkronkan Data Rekapitulasi...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden fade-in max-w-full mx-auto">
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-700 text-lg">Rekapitulasi Nilai Peserta</h3>
                <button onClick={handleExport} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition">
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
                        {sortedStudents.length === 0 ? (
                            <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">Belum ada data rekapitulasi untuk sekolah ini.</td></tr>
                        ) : sortedStudents.map((s: any, i: number) => (
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
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const rankingData = useMemo(() => {
        return [...filteredStudents].sort((a: any, b: any) => b.score - a.score);
    }, [filteredStudents]);

    const totalPages = Math.ceil(rankingData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const currentData = rankingData.slice(startIndex, startIndex + rowsPerPage);

    const handleRowsChange = (e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); };

    const handleExport = () => {
        const dataToExport = rankingData.map((s: any, i: number) => ({
            Rank: i + 1,
            Username: s.username,
            "Nama Peserta": s.fullname,
            "Asal Sekolah": s.school,
            Nilai: s.score,
            Durasi: formatDurationToText(s.duration)
        }));
        exportToExcel(dataToExport, "Peringkat_Peserta", "Peringkat");
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in max-w-full mx-auto">
            <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
                <h3 className="font-bold text-amber-700 flex items-center gap-2 text-xl"><Award size={24}/> Peringkat Peserta</h3>
                <button onClick={handleExport} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                    <FileText size={16}/> Export Excel
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-amber-50 text-amber-900/50 font-bold uppercase text-xs"><tr><th className="p-4 w-16 text-center">#</th><th className="p-4 cursor-pointer hover:text-amber-700">Username</th><th className="p-4 cursor-pointer hover:text-amber-700">Nama Lengkap</th><th className="p-4 cursor-pointer hover:text-amber-700">Sekolah</th><th className="p-4 text-center cursor-pointer hover:text-amber-700">Nilai</th><th className="p-4 cursor-pointer hover:text-amber-700">Durasi</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {currentData.length === 0 ? ( <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Belum ada data peringkat.</td></tr> ) : (
                            currentData.map((s, i) => {
                                const realRank = startIndex + i + 1;
                                let rankBadge = <span className="font-mono text-slate-400 font-bold">#{realRank}</span>;
                                if (realRank === 1) rankBadge = <span className="text-2xl">🥇</span>;
                                if (realRank === 2) rankBadge = <span className="text-2xl">🥈</span>;
                                if (realRank === 3) rankBadge = <span className="text-2xl">🥉</span>;
                                return ( <tr key={i} className={`hover:bg-amber-50/30 transition ${realRank <= 3 ? 'bg-amber-50/10' : ''}`}><td className="p-4 text-center">{rankBadge}</td><td className="p-4 font-mono font-bold text-slate-600">{s.username}</td><td className="p-4 font-bold text-slate-700">{s.fullname}</td><td className="p-4 text-slate-600">{s.school}</td><td className="p-4 text-center"><div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${s.score >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{s.score}</div></td><td className="p-4 text-slate-500 font-mono text-xs">{formatDurationToText(s.duration)}</td></tr> );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600"><span>Tampilkan</span><select value={rowsPerPage} onChange={handleRowsChange} className="bg-white border border-slate-300 text-slate-700 rounded px-2 py-1 font-bold outline-none focus:ring-2 focus:ring-indigo-200"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select><span>baris</span></div>
                <div className="flex items-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronLeft size={16} /></button>
                    <span className="font-bold text-slate-700 px-2">{currentPage} / {totalPages || 1}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
    );
  };

  const AnalisisTab = () => {
    const subjects = useMemo(() => Object.keys(dashboardData.questionsMap), []);
    const [localSubject, setLocalSubject] = useState(subjects[0] || '');
    const [localSchool, setLocalSchool] = useState('Semua');

    useEffect(() => { if (!localSubject && subjects.length > 0) setLocalSubject(subjects[0]); }, [subjects.length]);

    const studentsBySubject = filteredStudents.filter((s: any) => s.subject === localSubject);
    const availableSchools = useMemo(() => {
        const schools = new Set(studentsBySubject.map((s: any) => s.school));
        const arr = Array.from(schools).filter(Boolean).sort();
        return ['Semua', ...arr];
    }, [studentsBySubject]);

    const finalStudents = studentsBySubject.filter((s: any) => {
        if (localSchool !== 'Semua') return s.school === localSchool;
        return true;
    });

    finalStudents.sort((a: any, b: any) => a.fullname.localeCompare(b.fullname));
    const currentQuestions = dashboardData.questionsMap[localSubject] || [];
    const stats = currentQuestions.map((q: any) => {
        let correct = 0; let wrong = 0;
        finalStudents.forEach((s: any) => { const val = s.itemAnalysis ? s.itemAnalysis[q.id] : undefined; if (val == 1) correct++; else if (val == 0) wrong++; });
        const total = correct + wrong;
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        let diff = "M"; if (pct <= 50) diff = "S"; else if (pct <= 80) diff = "Sd";
        return { correct, wrong, pct, diff };
    });

    const handleExport = () => {
        const dataToExport = finalStudents.map((s: any, i: number) => {
            const row: any = {
                No: i + 1,
                "Nama Siswa": s.fullname,
                Sekolah: s.school,
                Nilai: s.score
            };
            currentQuestions.forEach((q: any, idx: number) => {
                const val = s.itemAnalysis ? s.itemAnalysis[q.id] : undefined;
                row[`Q${idx + 1}`] = val !== undefined ? val : '-';
            });
            return row;
        });
        exportToExcel(dataToExport, `Analisis_Soal_${localSubject}`, "Analisis");
    };

    if (!localSubject) return <div className="p-10 text-center text-slate-400">Tidak ada data untuk dianalisis.</div>

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 font-bold text-slate-700"><BarChart3 className="text-indigo-600" size={24}/><span>Analisis Butir Soal</span></div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button onClick={handleExport} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition mr-4">
                        <FileText size={16}/> Export Excel
                    </button>
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><BookOpen size={16}/></div><select className="w-full md:w-48 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none" value={localSubject} onChange={(e) => { setLocalSubject(e.target.value); setLocalSchool('Semua'); }}>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Filter size={16}/></div><select className="w-full md:w-48 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none" value={localSchool} onChange={(e) => setLocalSchool(e.target.value)}>{availableSchools.map((s: any) => <option key={s} value={s}>{s === 'Semua' ? 'Semua Sekolah' : s}</option>)}</select></div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center border-collapse">
                    <thead><tr><th className="p-3 border-b text-center bg-slate-100 font-bold text-slate-700 w-10">NO</th><th className="p-3 border-b text-left bg-slate-100 font-bold text-slate-700 min-w-[200px] sticky left-0 shadow-sm z-10">NAMA SISWA <span className="text-[10px] font-normal text-slate-500 block">{localSchool !== 'Semua' ? localSchool : 'Semua Sekolah'}</span></th>{currentQuestions.map((q: any, i: number) => ( <th key={q.id} className="p-2 border-b bg-slate-50 font-bold text-slate-600 min-w-[40px] text-xs">Q{i+1}</th> ))}<th className="p-3 border-b bg-indigo-50 font-bold text-indigo-700 w-24">NILAI</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {finalStudents.length === 0 ? ( <tr><td colSpan={currentQuestions.length + 3} className="p-8 text-slate-400 italic">Tidak ada data siswa untuk filter ini.</td></tr> ) : finalStudents.map((s: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors"><td className="p-2 border-r border-slate-100 text-slate-500 font-mono text-xs">{idx+1}</td><td className="p-2 border-r border-slate-100 text-left font-medium text-slate-800 sticky left-0 bg-white z-10">{s.fullname}<div className="text-[10px] text-slate-400 truncate w-32">{s.school}</div></td>{currentQuestions.map((q: any) => { const val = s.itemAnalysis ? s.itemAnalysis[q.id] : undefined; const isCorrect = val == 1; return ( <td key={q.id} className="p-1 border-r border-slate-100"><div className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : (val !== undefined ? 'bg-rose-100 text-rose-700' : 'bg-gray-50 text-gray-300')}`}>{val !== undefined ? val : '-'}</div></td> ) })}<td className="p-2 font-bold bg-indigo-50/30 text-indigo-700 border-l border-slate-100">{s.score}</td></tr>
                        ))}
                        {finalStudents.length > 0 && ( <><tr className="bg-slate-50 border-t-2 border-slate-200"><td colSpan={2} className="p-3 font-bold text-right text-slate-600 uppercase text-xs sticky left-0 bg-slate-50 z-10">Jumlah Benar</td>{stats.map((st: any, i: number) => <td key={i} className="p-2 font-bold text-slate-700">{st.correct}</td>)}<td className="bg-slate-100"></td></tr><tr className="bg-slate-100"><td colSpan={2} className="p-3 font-bold text-right text-slate-600 uppercase text-xs sticky left-0 bg-slate-100 z-10">Persentase</td>{stats.map((st: any, i: number) => <td key={i} className="p-2 font-bold text-xs text-blue-600">{st.pct}%</td>)}<td className="bg-slate-200"></td></tr></> )}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="loader border-indigo-500"></div></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden fade-in" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">Management System <span className="text-indigo-600">Center</span></h1>
            <p className="text-xs text-slate-400 mt-1">{user.role === 'admin_pusat' ? 'ADMIN' : 'PROKTOR'} Control Panel</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Home size={20} /> Dashboard</button>
          
          <div className="pt-4 pb-2 pl-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Manajemen Ujian</div>
          
          <button onClick={() => { setActiveTab('status_tes'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'status_tes' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Monitor size={20} /> Status Tes</button>
          <button onClick={() => { setActiveTab('kelompok_tes'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'kelompok_tes' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Group size={20} /> Kelompok Tes</button>
          
          {(user.role === 'admin_pusat' || user.role === 'admin_sekolah') && (
            <button onClick={() => { setActiveTab('data_user'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'data_user' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><List size={20} /> Daftar Peserta</button>
          )}

          <button onClick={() => { setActiveTab('rilis_token'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'rilis_token' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Key size={20} /> Rilis Token</button>

          {user.role === 'admin_pusat' && (
             <>
                <div className="pt-4 pb-2 pl-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Laporan & Data</div>
                
                <button onClick={() => { setActiveTab('bank_soal'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'bank_soal' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><FileQuestion size={20} /> Bank Soal</button>
                <button onClick={() => { setActiveTab('rekap'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'rekap' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Rekap Nilai</button>
                <button onClick={() => { setActiveTab('analisis'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'analisis' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><BarChart3 size={20} /> Analisis Soal</button>
                <button onClick={() => { setActiveTab('ranking'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'ranking' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Award size={20} /> Peringkat</button>
             </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">User Profile</p>
                <p className="text-sm font-bold text-slate-800 leading-tight break-words mb-1">
                    {user.nama_lengkap || user.username}
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${user.role === 'admin_pusat' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {user.role === 'admin_pusat' ? 'Administrator' : 'Proktor'}
                </span>
            </div>
            <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition">
                <LogOut size={20} /> Logout
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50">
                    <Menu size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{getTabTitle()}</h2>
                    {user.role === 'admin_sekolah' && (<p className="text-xs text-slate-500 font-bold uppercase mt-1">Proktor: {user.kelas_id}</p>)}
                </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchData} disabled={isRefreshing} title="Refresh Data" className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition relative disabled:opacity-70 disabled:cursor-wait">
                <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
              </button>
              <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm hidden md:block"><Settings size={20} className="text-slate-400" /></div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">{user.username.charAt(0).toUpperCase()}</div>
            </div>
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'status_tes' && <StatusTesTab currentUser={user} students={dashboardData.allUsers || []} />}
          {activeTab === 'kelompok_tes' && <KelompokTesTab currentUser={user} students={dashboardData.allUsers || []} />}
          {activeTab === 'data_user' && (user.role === 'admin_pusat' || user.role === 'admin_sekolah') && <DaftarPesertaTab currentUser={user} />}
          {activeTab === 'rilis_token' && <RilisTokenTab token={dashboardData.token} duration={dashboardData.duration} refreshData={fetchData} isRefreshing={isRefreshing} />}
          {activeTab === 'bank_soal' && user.role === 'admin_pusat' && <BankSoalTab />}
          {activeTab === 'rekap' && user.role === 'admin_pusat' && <RekapTab />}
          {activeTab === 'ranking' && user.role === 'admin_pusat' && <RankingTab />}
          {activeTab === 'analisis' && user.role === 'admin_pusat' && <AnalisisTab />}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;