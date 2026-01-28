
import React, { useState, useMemo, useEffect } from 'react';
import { Users, BookOpen, BarChart3, Settings, LogOut, Home, LayoutDashboard, Award, Activity, FileText, RefreshCw, Key, FileQuestion, Plus, Trash2, Edit, Save, X, Search, CheckCircle2, AlertCircle, Clock, PlayCircle, Filter, ChevronLeft, ChevronRight, School, UserCheck, GraduationCap, Shield, Loader2, Upload, Download, Group, Menu, ArrowUpDown, Monitor, List, Layers, Calendar, MapPin, Printer } from 'lucide-react';
import { api } from '../services/api';
import { User, QuestionRow, SchoolSchedule } from '../types';
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

// Helper: Score Predicate Logic
const getScorePredicate = (score: number) => {
    if (score >= 86) return "Istimewa";
    if (score >= 71) return "Baik";
    if (score >= 56) return "Memadai";
    return "Kurang";
};

// Helper: Predicate Badge Component
const getPredicateBadge = (score: number) => {
    const p = getScorePredicate(score);
    let color = "";
    switch (p) {
        case "Istimewa": color = "bg-purple-100 text-purple-700 border-purple-200"; break;
        case "Baik": color = "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
        case "Memadai": color = "bg-yellow-100 text-yellow-700 border-yellow-200"; break;
        default: color = "bg-rose-100 text-rose-700 border-rose-200"; break;
    }
    return <span className={`px-2 py-1 rounded text-xs font-bold border ${color}`}>{p}</span>;
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

const DashboardSkeleton = () => (
    <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-slate-200 rounded-2xl"></div>
            <div className="h-64 bg-slate-200 rounded-2xl col-span-2"></div>
        </div>
    </div>
);

const AturGelombangTab = ({ students }: { students: any[] }) => {
    const [schedules, setSchedules] = useState<Record<string, { gelombang: string, tanggal: string }>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bulkGelombang, setBulkGelombang] = useState('Gelombang 1');
    const [bulkDate, setBulkDate] = useState('');
    const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());

    // 1. Extract Unique Schools from Students List
    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort();
    }, [students]);

    // 2. Load Existing Schedules
    useEffect(() => {
        const loadSchedules = async () => {
            setLoading(true);
            try {
                const data = await api.getSchoolSchedules();
                const map: Record<string, { gelombang: string, tanggal: string }> = {};
                data.forEach(d => {
                    map[d.school] = { gelombang: d.gelombang, tanggal: d.tanggal };
                });
                setSchedules(map);
            } catch(e) { console.error("Error loading schedules", e); }
            finally { setLoading(false); }
        };
        loadSchedules();
    }, []);

    const handleChange = (school: string, field: 'gelombang' | 'tanggal', value: string) => {
        setSchedules(prev => ({
            ...prev,
            [school]: {
                gelombang: field === 'gelombang' ? value : (prev[school]?.gelombang || 'Gelombang 1'),
                tanggal: field === 'tanggal' ? value : (prev[school]?.tanggal || '')
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: SchoolSchedule[] = Object.keys(schedules).map(school => ({
                school,
                gelombang: schedules[school].gelombang,
                tanggal: schedules[school].tanggal
            }));
            await api.saveSchoolSchedules(payload);
            alert("Jadwal sekolah berhasil disimpan.");
        } catch(e) { 
            console.error(e);
            alert("Gagal menyimpan jadwal.");
        } finally {
            setSaving(false);
        }
    };

    const handleBulkApply = () => {
        if (selectedSchools.size === 0) return alert("Pilih minimal satu sekolah.");
        setSchedules(prev => {
            const next = { ...prev };
            selectedSchools.forEach(school => {
                next[school] = { gelombang: bulkGelombang, tanggal: bulkDate };
            });
            return next;
        });
        alert(`Berhasil menerapkan ke ${selectedSchools.size} sekolah.`);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedSchools(new Set(uniqueSchools));
        else setSelectedSchools(new Set());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={20}/> Atur Gelombang & Tanggal</h3>
                    <p className="text-xs text-slate-400">Tentukan jadwal ujian untuk setiap sekolah.</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Jadwal
                </button>
             </div>
             
             {/* Bulk Actions */}
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Set Gelombang</label>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm bg-white min-w-[150px]" value={bulkGelombang} onChange={e => setBulkGelombang(e.target.value)}>
                        <option>Gelombang 1</option>
                        <option>Gelombang 2</option>
                        <option>Gelombang 3</option>
                        <option>Gelombang 4</option>
                        <option>Susulan</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Set Tanggal</label>
                    <input type="date" className="p-2 border border-slate-200 rounded-lg text-sm bg-white" value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
                </div>
                <button onClick={handleBulkApply} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition mb-[1px]">
                    Terapkan ke Terpilih
                </button>
             </div>

             <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} /></th>
                            <th className="p-4">Nama Sekolah</th>
                            <th className="p-4">Gelombang</th>
                            <th className="p-4">Tanggal Pelaksanaan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                             <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data sekolah...</td></tr>
                        ) : uniqueSchools.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400">Belum ada data sekolah (User).</td></tr>
                        ) : uniqueSchools.map(school => (
                            <tr key={school} className="hover:bg-slate-50">
                                <td className="p-4">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedSchools.has(school)} 
                                        onChange={() => {
                                            const newSet = new Set(selectedSchools);
                                            if (newSet.has(school)) newSet.delete(school);
                                            else newSet.add(school);
                                            setSelectedSchools(newSet);
                                        }} 
                                    />
                                </td>
                                <td className="p-4 font-bold text-slate-700">{school}</td>
                                <td className="p-4">
                                    <select 
                                        className="p-2 border border-slate-200 rounded bg-white w-full max-w-[200px]"
                                        value={schedules[school]?.gelombang || 'Gelombang 1'}
                                        onChange={(e) => handleChange(school, 'gelombang', e.target.value)}
                                    >
                                        <option>Gelombang 1</option>
                                        <option>Gelombang 2</option>
                                        <option>Gelombang 3</option>
                                        <option>Gelombang 4</option>
                                        <option>Susulan</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <input 
                                        type="date" 
                                        className="p-2 border border-slate-200 rounded bg-white"
                                        value={schedules[school]?.tanggal || ''}
                                        onChange={(e) => handleChange(school, 'tanggal', e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

const StatusTesTab = ({ currentUser, students, refreshData }: { currentUser: User, students: any[], refreshData: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [resetting, setResetting] = useState<string | null>(null);

    // Get Unique Schools for Filter
    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort();
    }, [students]);

    const filtered = useMemo(() => {
        return students.filter(s => {
            const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || s.username.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Logic for Admin Sekolah (Proktor)
            if (currentUser.role === 'admin_sekolah') {
                return matchName && (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase();
            }
            
            // Logic for Admin Pusat with Filter
            if (filterSchool !== 'all') {
                return matchName && s.school === filterSchool;
            }

            return matchName;
        });
    }, [students, searchTerm, currentUser, filterSchool]);

    const handleReset = async (username: string) => {
        if(!confirm(`Reset login untuk ${username}? Siswa akan logout otomatis dan status menjadi OFFLINE.`)) return;
        setResetting(username);
        try {
            await api.resetLogin(username);
            refreshData(); // Refresh UI immediately
            alert(`Login ${username} berhasil di-reset.`);
        } catch(e) {
            console.error(e);
            alert("Gagal reset login.");
        } finally {
            setResetting(null);
        }
    }

    // Status Badge Helper
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'WORKING':
                return <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><PlayCircle size={12}/> Mengerjakan</span>;
            case 'LOGGED_IN':
                return <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Key size={12}/> Login</span>;
            case 'FINISHED':
                return <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> Selesai</span>;
            case 'OFFLINE':
            default:
                return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><WifiOff size={12} className="opacity-50"/> Offline</span>;
        }
    };
    
    // Icon for WifiOff needed in this component locally if not imported
    const WifiOff = ({size, className}:{size?:number, className?:string}) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
             <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Monitor size={20}/> Status Peserta</h3>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    {currentUser.role === 'admin_pusat' && (
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                        >
                            <option value="all">Semua Sekolah</option>
                            {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Cari Peserta..." 
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Ujian Aktif</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Tidak ada data.</td></tr> : filtered.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                <td className="p-4 font-mono text-slate-500">{s.username}</td>
                                <td className="p-4 text-slate-600">{s.school}</td>
                                <td className="p-4 text-slate-600">{s.kecamatan || '-'}</td>
                                <td className="p-4">
                                    {renderStatusBadge(s.status)}
                                </td>
                                <td className="p-4 text-slate-600">{s.active_exam || '-'}</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleReset(s.username)} disabled={!!resetting} className="bg-amber-50 text-amber-600 px-3 py-1 rounded text-xs font-bold hover:bg-amber-100 transition border border-amber-100">
                                        {resetting === s.username ? "Processing..." : "Reset Login"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    )
};

const DaftarPesertaTab = ({ currentUser, onDataChange }: { currentUser: User, onDataChange: () => void }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all'); // all, siswa, admin_sekolah, admin_pusat
    const [filterSchool, setFilterSchool] = useState('all'); // NEW: School Filter
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        id: '',
        username: '',
        password: '',
        fullname: '',
        role: 'siswa', // siswa, admin_sekolah, admin_pusat
        school: '',
        kecamatan: '', // NEW: Kecamatan Field
        gender: 'L'
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDelete = async (username: string) => {
        if(!confirm("Yakin ingin menghapus pengguna ini? Data yang dihapus tidak bisa dikembalikan.")) return;
        setLoading(true);
        try {
            await api.deleteUser(username);
            setUsers(prev => prev.filter(u => u.username !== username));
            onDataChange(); // Refresh dashboard stats
        } catch (e) {
            alert("Gagal menghapus user.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: any) => {
        setFormData({
            id: user.id,
            username: user.username,
            password: user.password,
            fullname: user.fullname,
            role: user.role,
            school: user.school || '',
            kecamatan: user.kecamatan || '', // Set Kecamatan
            gender: user.gender || 'L'
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setFormData({
            id: '',
            username: '',
            password: '',
            fullname: '',
            role: 'siswa',
            school: currentUser.role === 'admin_sekolah' ? currentUser.kelas_id : '',
            kecamatan: '',
            gender: 'L'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.saveUser(formData);
            await loadUsers();
            setIsModalOpen(false);
            onDataChange();
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan data.");
        } finally {
            setIsSaving(false);
        }
    };

    // Extract Unique Schools for Filter
    const uniqueSchools = useMemo(() => {
        const schools = new Set(users.map(u => u.school).filter(Boolean));
        return Array.from(schools).sort();
    }, [users]);

    // Filter Logic
    const filteredUsers = useMemo(() => {
        let res = users;
        // Role Filter
        if (filterRole !== 'all') {
            res = res.filter(u => u.role === filterRole);
        }

        // School Filter (New)
        if (filterSchool !== 'all') {
            res = res.filter(u => u.school === filterSchool);
        }
        
        // Search Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(u => 
                u.username.toLowerCase().includes(lower) || 
                u.fullname.toLowerCase().includes(lower) ||
                (u.school && u.school.toLowerCase().includes(lower)) ||
                (u.kecamatan && u.kecamatan.toLowerCase().includes(lower)) // Include Kecamatan in search
            );
        }

        // Proktor Restriction
        if (currentUser.role === 'admin_sekolah') {
            res = res.filter(u => 
                u.role === 'siswa' && 
                (u.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase()
            );
        }

        return res;
    }, [users, filterRole, filterSchool, searchTerm, currentUser]);

    // Export Logic
    const handleExport = () => {
        const dataToExport = filteredUsers.map((u, i) => ({
            No: i + 1,
            Username: u.username,
            Password: u.password,
            "Nama Lengkap": u.fullname,
            Role: u.role,
            "Jenis Kelamin": u.gender,
            "Sekolah / Kelas": u.school,
            "Kecamatan": u.kecamatan || '-' // Add Kecamatan to Export
        }));
        exportToExcel(dataToExport, "Data_Pengguna", "Users");
    };

    // Excel Import Logic
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsImporting(true);
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                // Added raw: false to ensure string values like '001' are preserved as "001" and not parsed as number 1
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
                
                // Expected Columns: Username, Password, Role (siswa/admin_sekolah/admin_pusat), Nama Lengkap, Jenis Kelamin (L/P), Sekolah/Kelas, Kecamatan
                const parsedUsers = [];
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!row[0]) continue; // Skip empty username
                    
                    parsedUsers.push({
                        username: String(row[0]),
                        password: String(row[1]),
                        role: String(row[2] || 'siswa').toLowerCase(),
                        fullname: String(row[3]),
                        gender: String(row[4] || 'L').toUpperCase(),
                        school: String(row[5] || ''),
                        kecamatan: String(row[6] || '') // Parse Kecamatan from Column G (Index 6)
                    });
                }

                if (parsedUsers.length > 0) {
                     await api.importUsers(parsedUsers);
                     alert(`Berhasil mengimpor ${parsedUsers.length} pengguna.`);
                     await loadUsers();
                     onDataChange();
                } else {
                    alert("Tidak ada data valid yang ditemukan.");
                }

            } catch (err) {
                console.error(err);
                alert("Gagal membaca file Excel.");
            } finally {
                setIsImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                "Username": "siswa001",
                "Password": "123",
                "Role (siswa/admin_sekolah/admin_pusat)": "siswa",
                "Nama Lengkap": "Ahmad Siswa",
                "L/P": "L",
                "Sekolah / Kelas": "UPT SD Negeri Remen 2",
                "Kecamatan": "Jenu"
            },
            {
                "Username": "proktor01",
                "Password": "123",
                "Role (siswa/admin_sekolah/admin_pusat)": "admin_sekolah",
                "Nama Lengkap": "Pak Guru",
                "L/P": "L",
                "Sekolah / Kelas": "UPT SD Negeri Glodog",
                "Kecamatan": "Palang"
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_User");
        XLSX.writeFile(wb, "Template_Import_User.xlsx");
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 fade-in space-y-6">
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                 <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Users size={20}/> Manajemen Pengguna</h3>
                    <p className="text-slate-400 text-xs">Tambah, edit, hapus, atau impor data pengguna.</p>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                    <button onClick={handleExport} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition border border-emerald-100">
                        <FileText size={14}/> Export Data
                    </button>
                    {currentUser.role === 'admin_pusat' && (
                        <>
                            <button onClick={downloadTemplate} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-200 transition">
                                <Download size={14}/> Template
                            </button>
                            <label className={`cursor-pointer bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition ${isImporting ? 'opacity-50 cursor-wait' : ''}`}>
                                {isImporting ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>} 
                                {isImporting ? "Mengimpor..." : "Impor Excel"}
                                <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                            </label>
                        </>
                    )}
                    <button onClick={handleAdd} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition">
                        <Plus size={14}/> Tambah User
                    </button>
                 </div>
             </div>

             {/* Filters */}
             <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cari Username, Nama, Sekolah, atau Kecamatan..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {currentUser.role === 'admin_pusat' && (
                    <>
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                        >
                            <option value="all">Semua Sekolah</option>
                            {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                            value={filterRole}
                            onChange={e => setFilterRole(e.target.value)}
                        >
                            <option value="all">Semua Role</option>
                            <option value="siswa">Siswa</option>
                            <option value="admin_sekolah">Proktor (Admin Sekolah)</option>
                            <option value="admin_pusat">Admin Pusat</option>
                        </select>
                    </>
                )}
             </div>

             {/* Table */}
             <div className="overflow-x-auto rounded-lg border border-slate-200">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                         <tr>
                             <th className="p-4">Username</th>
                             <th className="p-4">Nama Lengkap</th>
                             <th className="p-4">Role</th>
                             <th className="p-4">Sekolah / Kelas</th>
                             <th className="p-4">Kecamatan</th> 
                             <th className="p-4 text-center">Aksi</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {loading ? (
                             <tr><td colSpan={6} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</td></tr>
                         ) : filteredUsers.length === 0 ? (
                             <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>
                         ) : (
                             filteredUsers.map(u => (
                                 <tr key={u.id || u.username} className="hover:bg-slate-50 transition">
                                     <td className="p-4 font-mono font-bold text-slate-600">{u.username}</td>
                                     <td className="p-4 text-slate-700">{u.fullname}</td>
                                     <td className="p-4">
                                         <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === 'admin_pusat' ? 'bg-purple-100 text-purple-600' : u.role === 'admin_sekolah' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                             {u.role === 'admin_sekolah' ? 'Proktor' : u.role}
                                         </span>
                                     </td>
                                     <td className="p-4 text-slate-600 text-xs">{u.school || '-'}</td>
                                     <td className="p-4 text-slate-600 text-xs">{u.kecamatan || '-'}</td>
                                     <td className="p-4 flex justify-center gap-2">
                                         <button onClick={() => handleEdit(u)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"><Edit size={16}/></button>
                                         <button onClick={() => handleDelete(u.username)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={16}/></button>
                                     </td>
                                 </tr>
                             ))
                         )}
                     </tbody>
                 </table>
             </div>

             {/* Add/Edit Modal */}
             {isModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                             <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
                             <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                         </div>
                         <form onSubmit={handleSave} className="p-6 space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                    <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!formData.id && formData.role !== 'siswa'} /> 
                                    {/* Disable username edit for admins to prevent ID mismatch usually, but allowing for now/students */}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                    <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                             </div>
                             
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                                <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} />
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                                    <select 
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white"
                                        value={formData.role} 
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                        disabled={currentUser.role !== 'admin_pusat'}
                                    >
                                        <option value="siswa">Siswa</option>
                                        <option value="admin_sekolah">Proktor</option>
                                        <option value="admin_pusat">Admin Pusat</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenis Kelamin</label>
                                    <select 
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white"
                                        value={formData.gender} 
                                        onChange={e => setFormData({...formData, gender: e.target.value})}
                                    >
                                        <option value="L">Laki-laki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                 </div>
                             </div>

                             {(formData.role === 'siswa' || formData.role === 'admin_sekolah') && (
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                            {formData.role === 'siswa' ? 'Kelas / Sekolah' : 'Nama Sekolah (Untuk Proktor)'}
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                                            value={formData.school} 
                                            onChange={e => setFormData({...formData, school: e.target.value})} 
                                            placeholder={formData.role === 'siswa' ? "Sekolah" : "Sekolah"}
                                            disabled={currentUser.role === 'admin_sekolah'} // Proktor cant change their own school usually, but can add students to it
                                        />
                                     </div>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                            Kecamatan
                                        </label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                                            value={formData.kecamatan} 
                                            onChange={e => setFormData({...formData, kecamatan: e.target.value})} 
                                            placeholder="Kecamatan"
                                        />
                                     </div>
                                 </div>
                             )}

                             <div className="pt-4 flex gap-3">
                                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">Batal</button>
                                 <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2">
                                     {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Simpan
                                 </button>
                             </div>
                         </form>
                     </div>
                 </div>
             )}
        </div>
    );
};

const AturSesiTab = ({ currentUser, students, refreshData, isLoading }: { currentUser: User, students: any[], refreshData: () => void, isLoading: boolean }) => {
    // Simplified Sesi Management
    const [selectedSession, setSelectedSession] = useState('Sesi 1');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');

    // Get Unique Schools for Filter
    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort();
    }, [students]);

    const filtered = useMemo(() => {
        let res = students;
        if (currentUser.role === 'admin_sekolah') {
             res = res.filter(s => (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase());
        } else if (currentUser.role === 'admin_pusat' && filterSchool !== 'all') {
            res = res.filter(s => s.school === filterSchool);
        }
        return res;
    }, [students, currentUser, filterSchool]);

    const handleToggle = (username: string) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(username)) newSet.delete(username);
        else newSet.add(username);
        setSelectedUsers(newSet);
    };

    const handleSave = async () => {
        if(selectedUsers.size === 0) return alert("Pilih minimal satu siswa.");
        setIsSaving(true);
        // Explicitly cast u to string to prevent type errors
        const updates = Array.from(selectedUsers).map(u => ({ username: String(u), session: selectedSession }));
        try {
            await api.updateUserSessions(updates);
            refreshData();
            setSelectedUsers(new Set());
            alert("Sesi berhasil disimpan.");
        } catch(e) { alert("Gagal menyimpan."); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 fade-in">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock size={20}/> Atur Sesi Ujian</h3>
            <div className="flex flex-col md:flex-row gap-4 mb-4 bg-slate-50 p-4 rounded-lg">
                <div className="flex gap-2 w-full md:w-auto">
                    {currentUser.role === 'admin_pusat' && (
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                        >
                            <option value="all">Semua Sekolah</option>
                            {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    <select className="p-2 border rounded" value={selectedSession} onChange={e=>setSelectedSession(e.target.value)}>
                        <option>Sesi 1</option><option>Sesi 2</option><option>Sesi 3</option>
                    </select>
                </div>
                <button onClick={handleSave} disabled={isSaving || selectedUsers.size === 0} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm">
                    {isSaving ? "Menyimpan..." : "Simpan Sesi"}
                </button>
            </div>
            <div className="max-h-[500px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                            <th className="p-3 w-10"><input type="checkbox" onChange={e => {
                                if(e.target.checked) setSelectedUsers(new Set(filtered.map(s=>s.username)));
                                else setSelectedUsers(new Set());
                            }}/></th>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Sekolah</th>
                            <th className="p-3">Sesi Saat Ini</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-slate-400">Tidak ada siswa.</td></tr>
                        ) : filtered.map(s => (
                            <tr key={s.username} className="border-b">
                                <td className="p-3"><input type="checkbox" checked={selectedUsers.has(s.username)} onChange={() => handleToggle(s.username)} /></td>
                                <td className="p-3">{s.fullname} <span className="text-slate-400 text-xs">({s.username})</span></td>
                                <td className="p-3 text-xs text-slate-500">{s.school}</td>
                                <td className="p-3 font-mono">{s.session || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const KelompokTesTab = ({ currentUser, students, refreshData }: { currentUser: User, students: any[], refreshData: () => void }) => {
    const [selectedExam, setSelectedExam] = useState('');
    const [exams, setExams] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');

    useEffect(() => {
        api.getExams().then(setExams);
    }, []);

    // Get Unique Schools for Filter
    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort();
    }, [students]);

    const filtered = useMemo(() => {
        let res = students;
        if (currentUser.role === 'admin_sekolah') {
             res = res.filter(s => (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase());
        } else if (currentUser.role === 'admin_pusat' && filterSchool !== 'all') {
            res = res.filter(s => s.school === filterSchool);
        }
        return res;
    }, [students, currentUser, filterSchool]);

    const handleSave = async () => {
        if(!selectedExam) return alert("Pilih ujian dulu.");
        if(selectedUsers.size === 0) return alert("Pilih siswa.");
        setIsSaving(true);
        try {
            await api.assignTestGroup(Array.from(selectedUsers).map(String), selectedExam, ''); 
            refreshData();
            setSelectedUsers(new Set());
            alert("Kelompok tes berhasil diset.");
        } catch(e) { alert("Gagal."); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 fade-in">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Group size={20}/> Kelompok Tes (Set Ujian Aktif)</h3>
             <div className="flex flex-col md:flex-row gap-4 mb-4 bg-slate-50 p-4 rounded-lg">
                <div className="flex gap-2 w-full md:w-auto">
                    {currentUser.role === 'admin_pusat' && (
                        <select 
                            className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                        >
                            <option value="all">Semua Sekolah</option>
                            {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    <select className="p-2 border rounded min-w-[200px]" value={selectedExam} onChange={e=>setSelectedExam(e.target.value)}>
                        <option value="">-- Pilih Ujian --</option>
                        {exams.map(e => <option key={e.id} value={e.nama_ujian}>{e.nama_ujian}</option>)}
                    </select>
                </div>
                <button onClick={handleSave} disabled={isSaving || selectedUsers.size === 0} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold text-sm">
                    {isSaving ? "Menyimpan..." : "Aktifkan Ujian"}
                </button>
            </div>
             <div className="max-h-[500px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                        <tr>
                            <th className="p-3 w-10"><input type="checkbox" onChange={e => {
                                if(e.target.checked) setSelectedUsers(new Set(filtered.map(s=>s.username)));
                                else setSelectedUsers(new Set());
                            }}/></th>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Sekolah</th>
                            <th className="p-3">Ujian Aktif Saat Ini</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-slate-400">Tidak ada siswa.</td></tr>
                        ) : filtered.map(s => (
                            <tr key={s.username} className="border-b">
                                <td className="p-3"><input type="checkbox" checked={selectedUsers.has(s.username)} onChange={() => {
                                    const newSet = new Set(selectedUsers);
                                    if (newSet.has(s.username)) newSet.delete(s.username);
                                    else newSet.add(s.username);
                                    setSelectedUsers(newSet);
                                }} /></td>
                                <td className="p-3">{s.fullname} <span className="text-slate-400 text-xs">({s.username})</span></td>
                                <td className="p-3 text-xs text-slate-500">{s.school}</td>
                                <td className="p-3 font-mono text-blue-600">{s.active_exam || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const RilisTokenTab = ({ token, duration, maxQuestions, refreshData, isRefreshing }: { token: string, duration: number, maxQuestions: number, refreshData: () => void, isRefreshing: boolean }) => {
    // Local state for Max Questions input
    const [localMaxQ, setLocalMaxQ] = useState(maxQuestions);
    const [isSavingQ, setIsSavingQ] = useState(false);

    useEffect(() => {
        setLocalMaxQ(maxQuestions);
    }, [maxQuestions]);

    const handleSaveMaxQ = async () => {
        setIsSavingQ(true);
        try {
            await api.saveMaxQuestions(Number(localMaxQ));
            refreshData();
            alert("Jumlah soal berhasil disimpan. Perhitungan nilai akan menyesuaikan jumlah soal.");
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan.");
        } finally {
            setIsSavingQ(false);
        }
    };

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

                {/* MAX QUESTIONS SETTING */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl mb-6 text-left shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Layers size={14}/> Jumlah Soal Tampil
                        </label>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">0 = Semua Soal</span>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none text-center"
                            value={localMaxQ}
                            onChange={(e) => setLocalMaxQ(Number(e.target.value))}
                            placeholder="0"
                            min="0"
                        />
                        <button 
                            onClick={handleSaveMaxQ} 
                            disabled={isSavingQ || localMaxQ == maxQuestions}
                            className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                        >
                            {isSavingQ ? <Loader2 size={14} className="animate-spin"/> : "Simpan"}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 italic border-t border-slate-100 pt-2">
                        <span className="font-bold text-slate-600">Catatan Penting:</span> Jika diset (contoh: 40), siswa mengerjakan 40 soal acak. 
                        <br/>Nilai akhir akan dihitung berdasarkan <b>Total Bobot Soal Tampil</b> (Contoh: Skor Benar / Total Bobot 40 Soal * 100), bukan total bank soal.
                    </p>
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
    // ... (Content of BankSoalTab same as previous)
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
                // Use raw: false to ensure numbers with leading zeros (e.g., "01") are treated as text "01"
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
                
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
        if (type === 'PGK') return "Masukkan 2 huruf opsi benar dipisah koma (Misal: A,C). Opsi tersedia hanya 3 (A,B,C).";
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
                        <p className="text-xs text-slate-400">Edit database Bank soal.</p>
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
                                    {currentQ.tipe_soal !== 'PGK' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi D / Pernyataan 4</label>
                                            <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.opsi_d} onChange={e => setCurrentQ({...currentQ, opsi_d: e.target.value})} />
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button onClick={() => setModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition">Batal</button>
                            <button type="submit" form="qForm" disabled={loadingData} className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition flex items-center gap-2">
                                {loadingData ? <><div className="loader w-4 h-4 border-2"></div> Menyimpan...</> : <><Save size={18}/> Simpan Data</>}
                            </button>
                        </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rekap' | 'analisis' | 'ranking' | 'bank_soal' | 'data_user' | 'status_tes' | 'kelompok_tes' | 'rilis_token' | 'atur_sesi' | 'atur_gelombang'>('overview');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [dashboardData, setDashboardData] = useState<any>({ 
      students: [], 
      questionsMap: {}, 
      totalUsers: 0, 
      token: 'TOKEN',
      duration: 60,
      maxQuestions: 0, // Default 0 (All)
      statusCounts: { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 },
      activityFeed: [],
      allUsers: [], // Extended user data for Status/Group tabs
      schedules: [] // New field
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
        case 'atur_sesi': return "Atur Sesi & Absensi";
        case 'atur_gelombang': return "Atur Gelombang Sekolah";
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

    // Find schedule for current proktor
    const mySchedule = useMemo(() => {
        if (user.role === 'admin_sekolah' && dashboardData.schedules) {
            return dashboardData.schedules.find((s:any) => s.school === user.kelas_id);
        }
        return null;
    }, [user, dashboardData.schedules]);

    // NEW: Calculate Unique Schools for Admin Pusat
    const uniqueSchoolsCount = useMemo(() => {
        if (!dashboardData.allUsers) return 0;
        const schools = new Set(dashboardData.allUsers.map((u: any) => u.school).filter((s: any) => s && s !== '-' && s.trim() !== ''));
        return schools.size;
    }, [dashboardData.allUsers]);

    return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
        {user.role === 'admin_sekolah' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-200 p-2 rounded-lg"><School size={20}/></div>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide">Mode Proktor</h3>
                        <p className="text-sm">Menampilkan data untuk: <b>{user.kelas_id}</b></p>
                    </div>
                </div>
            </div>
        )}

        {/* --- NEW: SCHEDULE CARD FOR PROKTOR --- */}
        {user.role === 'admin_sekolah' && mySchedule && (
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-full"><Calendar size={32}/></div>
                    <div>
                         <h2 className="text-xl font-bold">Jadwal Ujian Aktif</h2>
                         <p className="opacity-90 text-sm">Anda telah dijadwalkan oleh admin pusat.</p>
                    </div>
                 </div>
                 <div className="flex gap-4 text-center">
                    <div className="bg-white/10 px-6 py-3 rounded-xl border border-white/20">
                        <p className="text-xs uppercase font-bold text-indigo-200">Tanggal Pelaksanaan</p>
                        <p className="text-xl font-bold">{new Date(mySchedule.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="bg-white text-indigo-900 px-6 py-3 rounded-xl shadow-md">
                        <p className="text-xs uppercase font-bold text-indigo-400">Sesi Gelombang</p>
                        <p className="text-xl font-extrabold">{mySchedule.gelombang}</p>
                    </div>
                 </div>
            </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 ${user.role === 'admin_pusat' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-6`}>
            
            {/* NEW CARD: Total Sekolah (Only Admin Pusat) */}
            {user.role === 'admin_pusat' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Sekolah</p>
                        <h3 className="text-3xl font-extrabold text-slate-700 mt-1">{uniqueSchoolsCount}</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl text-orange-500"><School size={24}/></div>
                </div>
            )}

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

                {/* UPDATED: Config Card (Duration & Questions) */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center gap-3 relative overflow-hidden">
                    
                    {/* Duration Row */}
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Clock size={12}/> Durasi</p>
                        {isEditingDuration ? (
                            <div className="flex gap-1">
                                <input type="number" className="w-12 p-0.5 border border-slate-300 rounded text-center font-mono font-bold text-sm" value={durationInput} onChange={e=>setDurationInput(Number(e.target.value))} />
                                <button onClick={handleUpdateDuration} className="bg-indigo-600 text-white p-0.5 rounded hover:bg-indigo-700"><Save size={12}/></button>
                                <button onClick={()=>{ setDurationInput(Number(dashboardData.duration)); setIsEditingDuration(false); }} className="bg-slate-200 text-slate-600 p-0.5 rounded hover:bg-slate-300"><X size={12}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-mono font-bold text-slate-800">{dashboardData.duration} <span className="text-[10px] text-slate-400 font-sans font-normal">Min</span></span>
                                {user.role === 'admin_pusat' && (
                                    <button onClick={()=>{ setIsEditingDuration(true); }} className="text-slate-400 hover:text-indigo-500 transition"><Edit size={12}/></button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Max Questions Row */}
                    <div className="flex items-center justify-between pt-1">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Layers size={12}/> Jml. Soal</p>
                        <span className="text-lg font-mono font-bold text-slate-800">
                            {dashboardData.maxQuestions === 0 ? "Semua" : dashboardData.maxQuestions}
                        </span>
                    </div>
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
                            } else if (log.action === 'WORKING' || log.action === 'RESUME') { // Fallback from logs
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
                                        
                                        <div className="text-xs text-slate-500 mb-2 space-y-1">
                                            <div className="flex items-center gap-1">
                                                <School size={12} className="text-slate-400"/>
                                                <span className="truncate font-medium">{log.school || '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin size={12} className="text-slate-400"/>
                                                <span className="truncate font-medium">{log.kecamatan || '-'}</span>
                                            </div>
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
    // 1. State for Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');

    // 2. Derive Unique Options based on available data
    const uniqueSchools = useMemo(() => {
        const schools = new Set(sortedStudents.map((s: any) => s.school).filter(Boolean));
        return Array.from(schools).sort();
    }, [sortedStudents]);

    const uniqueSubjects = useMemo(() => {
        const subjects = new Set(sortedStudents.map((s: any) => s.subject).filter(Boolean));
        return Array.from(subjects).sort();
    }, [sortedStudents]);

    // 3. Filter Data
    const filteredRekap = useMemo(() => {
        return sortedStudents.filter((s: any) => {
            const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.username.toLowerCase().includes(searchTerm.toLowerCase());
            const matchSchool = filterSchool === 'all' || s.school === filterSchool;
            const matchSubject = filterSubject === 'all' || s.subject === filterSubject;
            return matchName && matchSchool && matchSubject;
        });
    }, [sortedStudents, searchTerm, filterSchool, filterSubject]);

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
        // Export filtered data, not just all sorted data
        const dataToExport = filteredRekap.map((s: any, i: number) => ({
            No: i + 1,
            Username: s.username,
            "Nama Peserta": s.fullname,
            "Asal Sekolah": s.school,
            Mapel: s.subject,
            Score: s.score,
            Predikat: getScorePredicate(s.score),
            "Waktu Mulai": calculateStartTime(s.timestamp, s.duration),
            "Waktu Selesai": formatTime(s.timestamp),
            Durasi: formatDurationToText(s.duration)
        }));
        exportToExcel(dataToExport, "Rekap_Nilai_Peserta", "Rekap Nilai");
    };

    const printIndividualRecap = (student: any) => {
        const predicate = getScorePredicate(student.score);
        const dateStr = new Date(student.timestamp).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return alert("Pop-up blocked. Please allow pop-ups.");
  
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Hasil Tes - ${student.fullname}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
               @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
               body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-print-color-adjust: exact; }
            </style>
          </head>
          <body class="bg-white p-8">
              <div class="max-w-2xl mx-auto border-2 border-slate-800 p-8 rounded-xl relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                  
                  <div class="text-center border-b-2 border-slate-100 pb-6 mb-8">
                      <h1 class="text-3xl font-extrabold text-slate-800 tracking-tight uppercase">Laporan Hasil Tes</h1>
                      <p class="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Computer Based Test (CBT) System</p>
                  </div>
  
                  <div class="grid grid-cols-1 gap-6 mb-8">
                      <div class="bg-slate-50 p-6 rounded-xl border border-slate-100">
                           <table class="w-full text-sm font-medium text-slate-700">
                              <tr><td class="py-2 w-32 text-slate-400 font-bold uppercase text-xs">Nama Peserta</td><td class="font-bold text-lg text-slate-800">${student.fullname}</td></tr>
                              <tr><td class="py-2 text-slate-400 font-bold uppercase text-xs">Nomor Peserta</td><td class="font-mono font-bold">${student.username}</td></tr>
                              <tr><td class="py-2 text-slate-400 font-bold uppercase text-xs">Asal Sekolah</td><td>${student.school}</td></tr>
                              <tr><td class="py-2 text-slate-400 font-bold uppercase text-xs">Mata Ujian</td><td><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">${student.subject}</span></td></tr>
                              <tr><td class="py-2 text-slate-400 font-bold uppercase text-xs">Waktu Ujian</td><td>${dateStr}</td></tr>
                          </table>
                      </div>
                  </div>
  
                  <div class="flex flex-col items-center justify-center bg-slate-900 text-white rounded-2xl p-8 mb-10 shadow-xl relative overflow-hidden">
                       <div class="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                       <p class="text-xs font-bold text-blue-200 uppercase tracking-[0.2em] mb-2 z-10">Pencapaian Nilai Akhir</p>
                       <div class="text-7xl font-extrabold mb-4 z-10">${student.score}</div>
                       <div class="px-4 py-1.5 bg-white/10 rounded-full border border-white/20 text-sm font-bold z-10">Predikat: <span class="text-yellow-400">${predicate}</span></div>
                  </div>
  
                  <div class="flex justify-between items-end mt-12 text-sm text-slate-600">
                      <div class="text-xs text-slate-400 italic">
                          Dicetak pada: ${new Date().toLocaleString('id-ID')}
                      </div>
                      <div class="text-center">
                          <p class="mb-16">Mengetahui,</p>
                          <p class="font-bold text-slate-800 border-b border-slate-300 pb-1 px-4 inline-block">Proktor / Pengawas</p>
                      </div>
                  </div>
              </div>
              <script>
                  setTimeout(() => { window.print(); window.close(); }, 500);
              </script>
          </body>
          </html>
        `);
        printWindow.document.close();
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
                <div className="flex gap-2">
                    <button onClick={handleExport} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                        <FileText size={16}/> Export Excel
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cari Nama / Username..." 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={filterSchool}
                        onChange={(e) => setFilterSchool(e.target.value)}
                    >
                        <option value="all">Semua Sekolah</option>
                        {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                    >
                        <option value="all">Semua Mapel</option>
                        {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('username')}>Username <ArrowUpDown size={12} className="inline ml-1"/></th>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('fullname')}>Nama Peserta <ArrowUpDown size={12} className="inline ml-1"/></th>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('school')}>Asal Sekolah <ArrowUpDown size={12} className="inline ml-1"/></th>
                            <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('subject')}>Mapel <ArrowUpDown size={12} className="inline ml-1"/></th>
                            <th className="p-4 text-center cursor-pointer hover:text-indigo-600" onClick={()=>handleSort('score')}>Score <ArrowUpDown size={12} className="inline ml-1"/></th>
                            <th className="p-4 text-center">Predikat</th>
                            <th className="p-4">Waktu Mulai</th>
                            <th className="p-4">Waktu Selesai</th>
                            <th className="p-4">Durasi</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredRekap.length === 0 ? (
                            <tr><td colSpan={10} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan sesuai filter.</td></tr>
                        ) : filteredRekap.map((s: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 transition">
                                <td className="p-4 font-mono font-bold text-slate-600">{s.username}</td>
                                <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                <td className="p-4 text-slate-600">{s.school}</td>
                                <td className="p-4 text-slate-600"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold">{s.subject}</span></td>
                                <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${s.score >= 75 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>{s.score}</span></td>
                                <td className="p-4 text-center">{getPredicateBadge(s.score)}</td>
                                <td className="p-4 text-slate-500 font-mono text-xs">{calculateStartTime(s.timestamp, s.duration)}</td>
                                <td className="p-4 text-slate-500 font-mono text-xs">{formatTime(s.timestamp)}</td>
                                <td className="p-4 text-slate-500 font-bold text-xs">{formatDurationToText(s.duration)}</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => printIndividualRecap(s)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition" title="Cetak Rekap Individu">
                                        <Printer size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 text-right">
                Menampilkan {filteredRekap.length} dari {sortedStudents.length} data
            </div>
        </div>
    );
  };

  const RankingTab = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(filteredStudents.map((s: any) => s.school).filter(Boolean));
        return Array.from(schools).sort();
    }, [filteredStudents]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(filteredStudents.map((s: any) => s.kecamatan).filter(Boolean));
        return Array.from(kecs).sort();
    }, [filteredStudents]);

    const rankingData = useMemo(() => {
        return [...filteredStudents]
            .filter((s: any) => {
                const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  s.username.toLowerCase().includes(searchTerm.toLowerCase());
                const matchSchool = filterSchool === 'all' || s.school === filterSchool;
                const matchKecamatan = filterKecamatan === 'all' || s.kecamatan === filterKecamatan;
                return matchName && matchSchool && matchKecamatan;
            })
            .sort((a: any, b: any) => b.score - a.score);
    }, [filteredStudents, searchTerm, filterSchool, filterKecamatan]);

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
            "Kecamatan": s.kecamatan || '-',
            Nilai: s.score,
            Predikat: getScorePredicate(s.score),
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

            {/* Filter Section */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cari Nama / Username..." 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={filterSchool}
                        onChange={(e) => { setFilterSchool(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="all">Semua Sekolah</option>
                        {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                        value={filterKecamatan}
                        onChange={(e) => { setFilterKecamatan(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="all">Semua Kecamatan</option>
                        {uniqueKecamatans.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-amber-50 text-amber-900/50 font-bold uppercase text-xs"><tr><th className="p-4 w-16 text-center">#</th><th className="p-4 cursor-pointer hover:text-amber-700">Username</th><th className="p-4 cursor-pointer hover:text-amber-700">Nama Lengkap</th><th className="p-4 cursor-pointer hover:text-amber-700">Sekolah</th><th className="p-4 cursor-pointer hover:text-amber-700">Kecamatan</th><th className="p-4 text-center cursor-pointer hover:text-amber-700">Nilai</th><th className="p-4 text-center">Predikat</th><th className="p-4 cursor-pointer hover:text-amber-700">Durasi</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {currentData.length === 0 ? ( <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">Belum ada data peringkat.</td></tr> ) : (
                            currentData.map((s, i) => {
                                const realRank = startIndex + i + 1;
                                let rankBadge = <span className="font-mono text-slate-400 font-bold">#{realRank}</span>;
                                if (realRank === 1) rankBadge = <span className="text-2xl">🥇</span>;
                                if (realRank === 2) rankBadge = <span className="text-2xl">🥈</span>;
                                if (realRank === 3) rankBadge = <span className="text-2xl">🥉</span>;
                                return ( <tr key={i} className={`hover:bg-amber-50/30 transition ${realRank <= 3 ? 'bg-amber-50/10' : ''}`}><td className="p-4 text-center">{rankBadge}</td><td className="p-4 font-mono font-bold text-slate-600">{s.username}</td><td className="p-4 font-bold text-slate-700">{s.fullname}</td><td className="p-4 text-slate-600">{s.school}</td><td className="p-4 text-slate-500 text-xs font-medium uppercase tracking-wide">{s.kecamatan || '-'}</td><td className="p-4 text-center"><div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${s.score >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{s.score}</div></td><td className="p-4 text-center">{getPredicateBadge(s.score)}</td><td className="p-4 text-slate-500 font-mono text-xs">{formatDurationToText(s.duration)}</td></tr> );
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
    // Explicit type to fix "unknown is not assignable to Key" error
    const subjects = useMemo((): string[] => {
        if (!dashboardData?.questionsMap) return [];
        return Object.keys(dashboardData.questionsMap) as string[];
    }, [dashboardData]);

    const [localSubject, setLocalSubject] = useState(subjects[0] || '');
    const [localSchool, setLocalSchool] = useState('Semua');

    useEffect(() => { if (!localSubject && subjects.length > 0) setLocalSubject(subjects[0]); }, [subjects, localSubject]);

    const studentsBySubject = filteredStudents.filter((s: any) => s.subject === localSubject);
    
    // Explicit type to fix "unknown is not assignable to Key" error
    const availableSchools = useMemo((): string[] => {
        const schools = new Set(studentsBySubject.map((s: any) => s.school));
        const arr = Array.from(schools).filter((s): s is string => typeof s === 'string' && !!s).sort();
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
                Kecamatan: s.kecamatan || '-',
                Nilai: s.score,
                Predikat: getScorePredicate(s.score)
            };
            currentQuestions.forEach((q: any, idx: number) => {
                const val = s.itemAnalysis ? s.itemAnalysis[q.id] : undefined;
                row[`Q${idx + 1}`] = val !== undefined ? val : '-';
            });
            return row;
        });

        // --- ADD SUMMARY ROWS ---
        
        // 1. Jumlah Benar
        const correctRow: any = {
            No: '',
            "Nama Siswa": 'JUMLAH BENAR',
            Sekolah: '',
            Kecamatan: '',
            Nilai: ''
        };
        stats.forEach((st: any, i: number) => {
            correctRow[`Q${i + 1}`] = st.correct;
        });
        dataToExport.push(correctRow);

        // 2. Persentase
        const pctRow: any = {
            No: '',
            "Nama Siswa": 'PERSENTASE',
            Sekolah: '',
            Kecamatan: '',
            Nilai: ''
        };
        stats.forEach((st: any, i: number) => {
            pctRow[`Q${i + 1}`] = `${st.pct}%`;
        });
        dataToExport.push(pctRow);

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
                    {/* Fix: cast subjects to any[] and map parameter s to any to prevent unknown error on line 2157 */}
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><BookOpen size={16}/></div><select className="w-full md:w-48 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none" value={localSubject} onChange={(e) => { setLocalSubject(e.target.value); setLocalSchool('Semua'); }}>{subjects.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                    {/* Fix: cast availableSchools to any[] and map parameter s to any to prevent unknown error on line 2168 */}
                    <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Filter size={16}/></div><select className="w-full md:w-48 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none" value={localSchool} onChange={(e) => setLocalSchool(e.target.value)}>{availableSchools.map((s) => <option key={s} value={s}>{s === 'Semua' ? 'Semua Sekolah' : s}</option>)}</select></div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 border-b text-center bg-slate-100 font-bold text-slate-700 w-10">NO</th>
                            <th className="p-3 border-b text-left bg-slate-100 font-bold text-slate-700 min-w-[200px] sticky left-0 shadow-sm z-10">
                                NAMA SISWA
                                <span className="text-[10px] font-normal text-slate-500 block">{localSchool !== 'Semua' ? localSchool : 'Semua Sekolah'}</span>
                            </th>
                            <th className="p-3 border-b text-left bg-slate-100 font-bold text-slate-700 min-w-[200px]">SEKOLAH</th>
                            <th className="p-3 border-b text-left bg-slate-100 font-bold text-slate-700 min-w-[150px]">KECAMATAN</th>
                            {currentQuestions.map((q: any, i: number) => ( <th key={q.id} className="p-2 border-b bg-slate-50 font-bold text-slate-600 min-w-[40px] text-xs">Q{i+1}</th> ))}
                            <th className="p-3 border-b bg-indigo-50 font-bold text-indigo-700 w-24">NILAI</th>
                            <th className="p-3 border-b bg-indigo-50 font-bold text-indigo-700 w-24">PREDIKAT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {finalStudents.length === 0 ? ( <tr><td colSpan={currentQuestions.length + 6} className="p-8 text-slate-400 italic">Tidak ada data siswa untuk filter ini.</td></tr> ) : finalStudents.map((s: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 border-r border-slate-100 text-slate-500 font-mono text-xs">{idx+1}</td>
                                <td className="p-2 border-r border-slate-100 text-left font-medium text-slate-800 sticky left-0 bg-white z-10 shadow-sm">{s.fullname}</td>
                                <td className="p-2 border-r border-slate-100 text-left text-xs text-slate-600 whitespace-nowrap">{s.school}</td>
                                <td className="p-2 border-r border-slate-100 text-left text-xs text-slate-600">{s.kecamatan || '-'}</td>
                                {currentQuestions.map((q: any) => { const val = s.itemAnalysis ? s.itemAnalysis[q.id] : undefined; const isCorrect = val == 1; return ( <td key={q.id} className="p-1 border-r border-slate-100"><div className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : (val !== undefined ? 'bg-rose-100 text-rose-700' : 'bg-gray-50 text-gray-300')}`}>{val !== undefined ? val : '-'}</div></td> ) })}<td className="p-2 font-bold bg-indigo-50/30 text-indigo-700 border-l border-slate-100">{s.score}</td><td className="p-2 border-l border-slate-100">{getPredicateBadge(s.score)}</td>
                            </tr>
                        ))}
                        {finalStudents.length > 0 && ( 
                            <>
                                <tr className="bg-slate-50 border-t-2 border-slate-200">
                                    <td colSpan={4} className="p-3 font-bold text-right text-slate-600 uppercase text-xs sticky left-0 bg-slate-50 z-10">Jumlah Benar</td>
                                    {stats.map((st: any, i: number) => <td key={i} className="p-2 font-bold text-slate-700">{st.correct}</td>)}
                                    <td className="bg-slate-100"></td><td className="bg-slate-100"></td>
                                </tr>
                                <tr className="bg-slate-100">
                                    <td colSpan={4} className="p-3 font-bold text-right text-slate-600 uppercase text-xs sticky left-0 bg-slate-100 z-10">Persentase</td>
                                    {stats.map((st: any, i: number) => <td key={i} className="p-2 font-bold text-xs text-blue-600">{st.pct}%</td>)}
                                    <td className="bg-slate-200"></td><td className="bg-slate-200"></td>
                                </tr>
                            </> 
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden fade-in" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Sidebar Header */}
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
          <button onClick={() => { setActiveTab('atur_sesi'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'atur_sesi' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Clock size={20} /> Atur Sesi</button>
          
          {(user.role === 'admin_pusat' || user.role === 'admin_sekolah') && (
            <button onClick={() => { setActiveTab('data_user'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'data_user' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><List size={20} /> Daftar Peserta</button>
          )}

          {user.role === 'admin_pusat' && (
              <button onClick={() => { setActiveTab('atur_gelombang'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'atur_gelombang' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={20} /> Atur Gelombang</button>
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
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${user.role === 'admin_pusat' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-700'}`}>
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
              <button onClick={fetchData} disabled={isRefreshing || loading} title="Refresh Data" className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition relative disabled:opacity-70 disabled:cursor-wait">
                <RefreshCw size={20} className={isRefreshing || loading ? "animate-spin" : ""} />
              </button>
              <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm hidden md:block"><Settings size={20} className="text-slate-400" /></div>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">{user.username.charAt(0).toUpperCase()}</div>
            </div>
          </div>

          {loading ? (
             <DashboardSkeleton />
          ) : (
             <>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'status_tes' && <StatusTesTab currentUser={user} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'kelompok_tes' && <KelompokTesTab currentUser={user} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'atur_sesi' && <AturSesiTab currentUser={user} students={dashboardData.allUsers || []} refreshData={fetchData} isLoading={isRefreshing} />}
                {activeTab === 'data_user' && (user.role === 'admin_pusat' || user.role === 'admin_sekolah') && <DaftarPesertaTab currentUser={user} onDataChange={fetchData} />}
                {activeTab === 'atur_gelombang' && user.role === 'admin_pusat' && <AturGelombangTab students={dashboardData.allUsers || []} />}
                {activeTab === 'rilis_token' && <RilisTokenTab token={dashboardData.token} duration={dashboardData.duration} maxQuestions={dashboardData.maxQuestions} refreshData={fetchData} isRefreshing={isRefreshing} />}
                {activeTab === 'bank_soal' && user.role === 'admin_pusat' && <BankSoalTab />}
                {activeTab === 'rekap' && user.role === 'admin_pusat' && <RekapTab />}
                {activeTab === 'ranking' && user.role === 'admin_pusat' && <RankingTab />}
                {activeTab === 'analisis' && user.role === 'admin_pusat' && <AnalisisTab />}
             </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
