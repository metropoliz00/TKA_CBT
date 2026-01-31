import React, { useState, useMemo, useEffect } from 'react';
import { Users, BookOpen, BarChart3, Settings, LogOut, Home, LayoutDashboard, Award, Activity, FileText, RefreshCw, Key, FileQuestion, Plus, Trash2, Edit, Save, X, Search, CheckCircle2, AlertCircle, Clock, PlayCircle, Filter, ChevronLeft, ChevronRight, School, UserCheck, GraduationCap, Shield, Loader2, Upload, Download, Group, Menu, ArrowUpDown, Monitor, List, Layers, Calendar, MapPin, Printer, ClipboardList, Camera } from 'lucide-react';
import { api } from '../services/api';
import { User, QuestionRow, SchoolSchedule, Exam } from '../types';
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
        if (h > 0) textParts.push(`${h}h`);
        if (m > 0) textParts.push(`${m}m`);
        if (s > 0) textParts.push(`${s}s`);
        
        return textParts.length > 0 ? textParts.join(' ') : '0s';
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

// --- Component Implementations ---

const AturGelombangTab = ({ students }: { students: any[] }) => {
    const [schedules, setSchedules] = useState<Record<string, { gelombang: string, tanggal: string }>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bulkGelombang, setBulkGelombang] = useState('Gelombang 1');
    const [bulkDate, setBulkDate] = useState('');
    const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());

    const uniqueSchools = useMemo<string[]>(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students]);

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
                                    <input type="checkbox" checked={selectedSchools.has(school)} onChange={() => {
                                        const newSet = new Set(selectedSchools);
                                        if (newSet.has(school)) newSet.delete(school);
                                        else newSet.add(school);
                                        setSelectedSchools(newSet);
                                    }} />
                                </td>
                                <td className="p-4 font-bold text-slate-700">{school}</td>
                                <td className="p-4">
                                    <select className="p-2 border border-slate-200 rounded bg-white w-full max-w-[200px]" value={schedules[school]?.gelombang || 'Gelombang 1'} onChange={(e) => handleChange(school, 'gelombang', e.target.value)}>
                                        <option>Gelombang 1</option>
                                        <option>Gelombang 2</option>
                                        <option>Gelombang 3</option>
                                        <option>Gelombang 4</option>
                                        <option>Susulan</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <input type="date" className="p-2 border border-slate-200 rounded bg-white" value={schedules[school]?.tanggal || ''} onChange={(e) => handleChange(school, 'tanggal', e.target.value)}/>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

const KelompokTesTab = ({ currentUser, students, refreshData }: { currentUser: User, students: any[], refreshData: () => void }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    useEffect(() => {
        api.getExams().then(setExams);
    }, []);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.username.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (currentUser.role === 'admin_sekolah') {
                return matchName && (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase();
            }
            
            let matchFilter = true;
            if (filterSchool !== 'all') matchFilter = matchFilter && s.school === filterSchool;
            if (filterKecamatan !== 'all') matchFilter = matchFilter && (s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase();

            return matchName && matchFilter;
        });
    }, [students, searchTerm, currentUser, filterSchool, filterKecamatan]);

    const handleSave = async () => {
        if (!selectedExam) return alert("Pilih ujian terlebih dahulu");
        if (selectedUsers.size === 0) return alert("Pilih siswa");
        setLoading(true);
        try {
            await api.assignTestGroup(Array.from(selectedUsers).map(String), selectedExam, '');
            alert("Berhasil set ujian aktif.");
            refreshData();
            setSelectedUsers(new Set());
        } catch(e) { console.error(e); alert("Gagal."); }
        setLoading(false);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedUsers(new Set(filteredStudents.map(s => s.username)));
        else setSelectedUsers(new Set());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><Group size={20}/> Kelompok Tes (Set Ujian Aktif)</h3>
            
            <div className="flex flex-col gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pilih Ujian</label>
                         <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-indigo-700" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                            <option value="">-- Pilih Ujian --</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.nama_ujian}</option>)}
                        </select>
                    </div>
                    
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Kecamatan</label>
                            <select 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterKecamatan}
                                onChange={e => setFilterKecamatan(e.target.value)}
                            >
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Sekolah</label>
                            <select 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterSchool}
                                onChange={e => setFilterSchool(e.target.value)}
                            >
                                <option value="all">Semua Sekolah</option>
                                {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        </>
                    )}
                    
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cari Peserta</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Nama / Username..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 pt-4 mt-2">
                     <div className="text-xs text-slate-500 font-bold">
                        Terpilih: {selectedUsers.size} Siswa
                     </div>
                     <button onClick={handleSave} disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Kelompok
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedUsers.has(s.username))}/></th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4">Ujian Aktif Saat Ini</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada peserta yang cocok.</td></tr>
                        ) : filteredStudents.map(s => (
                            <tr key={s.username} className="hover:bg-slate-50 transition">
                                <td className="p-4">
                                    <input type="checkbox" checked={selectedUsers.has(s.username)} onChange={() => {
                                        const newSet = new Set(selectedUsers);
                                        if (newSet.has(s.username)) newSet.delete(s.username);
                                        else newSet.add(s.username);
                                        setSelectedUsers(newSet);
                                    }}/>
                                </td>
                                <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                <td className="p-4 text-slate-600">{s.school}</td>
                                <td className="p-4 text-slate-600">{s.kecamatan || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.active_exam ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.active_exam || 'Belum Ada'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="mt-4 text-xs text-slate-400">
                Total Peserta Tampil: {filteredStudents.length}
            </div>
        </div>
    );
};

const AturSesiTab = ({ currentUser, students, refreshData, isLoading }: { currentUser: User, students: any[], refreshData: () => void, isLoading: boolean }) => {
    const [sessionInput, setSessionInput] = useState('Sesi 1');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchName = s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              s.username.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (currentUser.role === 'admin_sekolah') {
                return matchName && (s.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase();
            }
            
            let matchFilter = true;
            if (filterSchool !== 'all') matchFilter = matchFilter && s.school === filterSchool;
            if (filterKecamatan !== 'all') matchFilter = matchFilter && (s.kecamatan || '').toLowerCase() === filterKecamatan.toLowerCase();

            return matchName && matchFilter;
        });
    }, [students, searchTerm, currentUser, filterSchool, filterKecamatan]);

    const handleSave = async () => {
        if (!sessionInput) return alert("Pilih sesi");
        if (selectedUsers.size === 0) return alert("Pilih siswa");
        const updates = Array.from(selectedUsers).map(u => ({ username: String(u), session: sessionInput }));
        await api.updateUserSessions(updates);
        alert("Sesi berhasil diupdate");
        refreshData();
        setSelectedUsers(new Set());
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedUsers(new Set(filteredStudents.map(s => s.username)));
        else setSelectedUsers(new Set());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><Clock size={20}/> Atur Sesi Ujian</h3>
            <div className="flex flex-col xl:flex-row gap-4 mb-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Set Sesi</label>
                        <select className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100" value={sessionInput} onChange={e => setSessionInput(e.target.value)}>
                            <option value="">-- Pilih Sesi --</option>
                            <option value="Sesi 1">Sesi 1</option>
                            <option value="Sesi 2">Sesi 2</option>
                            <option value="Sesi 3">Sesi 3</option>
                            <option value="Sesi 4">Sesi 4</option>
                        </select>
                    </div>
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Kecamatan</label>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterKecamatan}
                                onChange={e => setFilterKecamatan(e.target.value)}
                            >
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Filter Sekolah</label>
                            <select 
                                className="p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100"
                                value={filterSchool}
                                onChange={e => setFilterSchool(e.target.value)}
                            >
                                <option value="all">Semua Sekolah</option>
                                {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        </>
                    )}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Peserta</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Nama / Username..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <button onClick={handleSave} disabled={isLoading} className="h-[38px] px-6 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2 whitespace-nowrap">
                        {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Atur Sesi
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" onChange={e => toggleSelectAll(e.target.checked)} checked={filteredStudents.length > 0 && selectedUsers.size === filteredStudents.length} /></th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4">Sesi Saat Ini</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada peserta yang cocok dengan filter.</td></tr>
                        ) : filteredStudents.map(s => (
                            <tr key={s.username} className="hover:bg-slate-50 transition">
                                <td className="p-4">
                                    <input type="checkbox" checked={selectedUsers.has(s.username)} onChange={() => {
                                        const newSet = new Set(selectedUsers);
                                        if (newSet.has(s.username)) newSet.delete(s.username);
                                        else newSet.add(s.username);
                                        setSelectedUsers(newSet);
                                    }}/>
                                </td>
                                <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                <td className="p-4 text-slate-600">{s.school}</td>
                                <td className="p-4 text-slate-600">{s.kecamatan || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.session ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {s.session || 'Belum Diatur'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 text-xs text-slate-400 flex justify-between">
                <span>Total Peserta: {filteredStudents.length}</span>
                <span>Terpilih: {selectedUsers.size}</span>
            </div>
        </div>
    );
};

const CetakAbsensiTab = ({ currentUser, students }: { currentUser: User, students: any[] }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedSession, setSelectedSession] = useState('');
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    useEffect(() => {
        api.getExams().then(res => {
            setExams(res.filter(e => !e.id.startsWith('Survey_')));
        });
    }, []);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(students.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [students]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (currentUser.role === 'admin_sekolah') {
                if ((s.school || '').toLowerCase() !== (currentUser.kelas_id || '').toLowerCase()) return false;
            } else {
                if (filterSchool !== 'all' && s.school !== filterSchool) return false;
                if (filterKecamatan !== 'all' && (s.kecamatan || '').toLowerCase() !== filterKecamatan.toLowerCase()) return false;
            }
            if (selectedSession && s.session !== selectedSession) return false;
            if (s.role !== 'siswa' && s.role !== undefined) return false; 
            return true;
        });
    }, [students, currentUser, filterSchool, filterKecamatan, selectedSession]);

    const handlePrint = () => {
        if (filteredStudents.length === 0) return alert("Tidak ada data siswa untuk dicetak.");

        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Pop-up blocked. Please allow pop-ups.");

        const schoolName = currentUser.role === 'admin_sekolah' ? currentUser.kelas_id : (filterSchool !== 'all' ? filterSchool : 'Semua Sekolah');
        const kecamatanName = currentUser.role === 'admin_sekolah' ? (currentUser.kecamatan || '-') : (filterKecamatan !== 'all' ? filterKecamatan : '-');
        const sesiName = selectedSession || 'Semua Sesi';
        const examName = exams.find(e => e.id === selectedExamId)?.nama_ujian || '...........................';
        
        const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const signatureDate = `Tuban, ${dateNow}`;
        const proktorName = currentUser.nama_lengkap || "...........................";

        const rowsHtml = filteredStudents.map((s, idx) => `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${s.username}</td>
                <td>${s.fullname}</td>
                <td>${s.school}</td>
                <td style="text-align: center;">${s.session || '-'}</td>
                <td></td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Absensi_TKA 2026</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; }
                    .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
                    .logo { height: 80px; width: auto; object-fit: contain; }
                    .header-text { text-align: center; flex-grow: 1; padding: 0 10px; }
                    .header-text h2 { margin: 0; font-size: 18px; text-transform: uppercase; line-height: 1.2; }
                    .header-text h3 { margin: 5px 0 0; font-size: 16px; font-weight: normal; }
                    .info-table { margin-bottom: 20px; font-size: 14px; width: 100%; }
                    .info-table td { padding: 4px; vertical-align: top; }
                    .main-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .main-table th, .main-table td { border: 1px solid black; padding: 8px; }
                    .main-table th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
                    .signature-section { margin-top: 50px; float: right; width: 250px; text-align: center; font-size: 14px; }
                    @media print {
                        @page { size: A4; margin: 1.5cm; }
                        button { display: none; }
                        body { padding: 0; }
                        .header-container { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header-container">
                    <img src="https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png" class="logo" alt="Logo Kiri" />
                    <div class="header-text">
                        <h2>DAFTAR HADIR</h2>
                        <h2>PESERTA TRY OUT TKA TAHUN 2026</h2>
                        <h3>${schoolName} ${kecamatanName !== '-' ? `- Kecamatan ${kecamatanName}` : ''}</h3>
                    </div>
                    <img src="https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png" class="logo" alt="Logo Kanan" />
                </div>

                <table class="info-table">
                    <tr><td width="150">Mata Pelajaran</td><td>: ${examName}</td></tr>
                    <tr><td width="150">Sesi</td><td>: ${sesiName}</td></tr>
                    <tr><td>Hari, Tanggal</td><td>: ${dateNow}</td></tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th width="40">No</th>
                            <th>Username</th>
                            <th>Nama Peserta</th>
                            <th>Sekolah</th>
                            <th width="80">Sesi</th>
                            <th width="100">Tanda Tangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="signature-section">
                    <p>${signatureDate}</p>
                    <p>Proktor</p>
                    <br/><br/><br/>
                    <p><strong>${proktorName}</strong></p>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
             <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-700"><Printer size={20}/> Cetak Daftar Hadir (Absensi)</h3>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mata Pelajaran</label>
                         <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                            <option value="">-- Pilih Mapel --</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.nama_ujian}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Sesi</label>
                         <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
                            <option value="">Semua Sesi</option>
                            <option value="Sesi 1">Sesi 1</option>
                            <option value="Sesi 2">Sesi 2</option>
                            <option value="Sesi 3">Sesi 3</option>
                            <option value="Sesi 4">Sesi 4</option>
                        </select>
                    </div>
                    
                    {currentUser.role === 'admin_pusat' && (
                        <>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Kecamatan</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
                                <option value="all">Semua Kecamatan</option>
                                {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Sekolah</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
                                <option value="all">Semua Sekolah</option>
                                {uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        </>
                    )}
                </div>
                
                <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
                    <button onClick={handlePrint} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-900 transition flex items-center gap-2 shadow-lg">
                        <Printer size={16}/> Cetak Absensi
                    </button>
                </div>
             </div>

             <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4 w-10">No</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Sesi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                         {filteredStudents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada data siswa sesuai filter.</td></tr>
                        ) : (
                            filteredStudents.map((s, idx) => (
                                <tr key={s.username} className="hover:bg-slate-50">
                                    <td className="p-4 text-center text-slate-500 font-mono">{idx+1}</td>
                                    <td className="p-4 font-mono font-bold text-slate-600">{s.username}</td>
                                    <td className="p-4 font-bold text-slate-700">{s.fullname}</td>
                                    <td className="p-4 text-slate-600">{s.school}</td>
                                    <td className="p-4"><span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold">{s.session || '-'}</span></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

const RekapTab = ({ students }: { students: any[] }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');

    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);

    useEffect(() => {
        setLoading(true);
        api.getRecap().then(setData).catch(console.error).finally(() => setLoading(false));
    }, []);

    const pivotedData = useMemo(() => {
        const map = new Map();
        data.forEach(d => {
            const key = d.username;
            if (!map.has(key)) {
                map.set(key, {
                    username: d.username,
                    nama: d.nama,
                    sekolah: d.sekolah,
                    kecamatan: userMap[d.username]?.kecamatan || '-',
                    nilai_bi: '-',
                    nilai_mtk: '-',
                    durasi_bi: '-',
                    durasi_mtk: '-'
                });
            }
            const entry = map.get(key);
            const subject = (d.mapel || '').toLowerCase();
            if (subject.includes('bahasa') || subject.includes('indo') || subject.includes('literasi')) {
                entry.nilai_bi = d.nilai;
                entry.durasi_bi = d.durasi;
            } else if (subject.includes('matematika') || subject.includes('mtk') || subject.includes('numerasi')) {
                entry.nilai_mtk = d.nilai;
                entry.durasi_mtk = d.durasi;
            }
        });
        return Array.from(map.values());
    }, [data, userMap]);

    const filteredData = useMemo(() => {
        return pivotedData.filter(d => {
            const matchSchool = filterSchool === 'all' || (d.sekolah && d.sekolah.toLowerCase() === filterSchool.toLowerCase());
            const matchKecamatan = filterKecamatan === 'all' || (d.kecamatan && d.kecamatan.toLowerCase() === filterKecamatan.toLowerCase());
            return matchSchool && matchKecamatan;
        });
    }, [pivotedData, filterSchool, filterKecamatan]);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(pivotedData.map(d => d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [pivotedData]);
    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><LayoutDashboard size={20}/> Rekapitulasi Nilai</h3>
                    <p className="text-xs text-slate-400">Hasil ujian .</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap">
                     <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}>
                        <option value="all">Semua Kecamatan</option>
                        {uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}
                     </select>
                     <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
                        <option value="all">Semua Sekolah</option>
                        {uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}
                     </select>
                     <button onClick={() => exportToExcel(filteredData, "Rekap_Nilai_TKA")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
                        <FileText size={16}/> Export
                     </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4 w-12 text-center">No</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Nama Peserta</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4 text-center border-l border-slate-200 bg-blue-50/50">Bahasa Indonesia</th>
                            <th className="p-4 text-center border-l border-slate-200 bg-orange-50/50">Matematika</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data nilai...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan untuk filter ini.</td></tr>
                        ) : (
                            filteredData.map((d, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-center text-slate-500">{i + 1}</td>
                                    <td className="p-4 font-mono text-slate-600">{d.username}</td>
                                    <td className="p-4 font-bold text-slate-700">{d.nama}</td>
                                    <td className="p-4 text-slate-600">{d.sekolah}</td>
                                    <td className="p-4 text-slate-600">{d.kecamatan}</td>
                                    <td className="p-4 text-center border-l border-slate-100 bg-blue-50/10">
                                        {d.nilai_bi !== '-' ? (<div className="flex flex-col items-center"><span className="text-lg font-bold text-blue-600">{d.nilai_bi}</span><span className="text-[10px] text-slate-400 font-mono">{formatDurationToText(d.durasi_bi)}</span></div>) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="p-4 text-center border-l border-slate-100 bg-orange-50/10">
                                        {d.nilai_mtk !== '-' ? (<div className="flex flex-col items-center"><span className="text-lg font-bold text-orange-600">{d.nilai_mtk}</span><span className="text-[10px] text-slate-400 font-mono">{formatDurationToText(d.durasi_mtk)}</span></div>) : <span className="text-slate-300">-</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs text-slate-400">
                <span>Total Data: {filteredData.length}</span>
            </div>
        </div>
    );
};

const RankingTab = ({ students }: { students: any[] }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterSchool, setFilterSchool] = useState('all');
    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);
    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);
    const uniqueSchools = useMemo(() => {
        const schools = new Set(data.map(d => d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [data]);
    useEffect(() => {
        setLoading(true);
        api.getRecap().then(res => { setData(res); }).catch(console.error).finally(() => setLoading(false));
    }, []);
    const pivotedData = useMemo(() => {
        const map = new Map<string, any>();
        data.forEach(d => {
            const key = d.username;
            if (!map.has(key)) {
                map.set(key, {
                    username: d.username,
                    nama: d.nama,
                    sekolah: d.sekolah,
                    kecamatan: userMap[d.username]?.kecamatan || '-',
                    score_bi: null,
                    score_mtk: null
                });
            }
            const entry = map.get(key);
            const subject = (d.mapel || '').toLowerCase();
            const val = parseFloat(d.nilai);
            const safeVal = isNaN(val) ? 0 : val;
            if (subject.includes('bahasa') || subject.includes('indo') || subject.includes('literasi')) {
                entry.score_bi = safeVal;
            } else if (subject.includes('matematika') || subject.includes('mtk') || subject.includes('numerasi')) {
                entry.score_mtk = safeVal;
            }
        });
        const result = Array.from(map.values()).map(item => {
            const bi = item.score_bi !== null ? item.score_bi : 0;
            const mtk = item.score_mtk !== null ? item.score_mtk : 0;
            const avg = (bi + mtk) / 2;
            return { ...item, avg };
        });
        return result.sort((a, b) => b.avg - a.avg);
    }, [data, userMap]);
    const filteredData = useMemo(() => {
        return pivotedData.filter(d => {
            const kecMatch = filterKecamatan === 'all' || (d.kecamatan && d.kecamatan.toLowerCase() === filterKecamatan.toLowerCase());
            const schoolMatch = filterSchool === 'all' || (d.sekolah && d.sekolah.toLowerCase() === filterSchool.toLowerCase());
            return kecMatch && schoolMatch;
        });
    }, [pivotedData, filterKecamatan, filterSchool]);
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><Award size={20}/> Peringkat Peserta</h3>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}><option value="all">Semua Sekolah</option>{uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <button onClick={() => exportToExcel(filteredData, "Peringkat_Siswa_TKA")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"><FileText size={16}/> Export</button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4 text-center w-16">Rank</th>
                            <th className="p-4">Nama</th>
                            <th className="p-4">Sekolah</th>
                            <th className="p-4">Kecamatan</th>
                            <th className="p-4 text-center bg-blue-50/50 border-l border-slate-200">B. Indonesia</th>
                            <th className="p-4 text-center bg-orange-50/50 border-l border-slate-200">Matematika</th>
                            <th className="p-4 text-center border-l border-slate-200">Nilai Akhir</th>
                            <th className="p-4 text-center border-l border-slate-200">Predikat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>
                        ) : (
                            filteredData.map((d, i) => (
                                <tr key={i} className="border-b hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-center text-slate-500"><div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${i < 3 ? 'bg-yellow-100 text-yellow-700 font-black' : 'bg-slate-100'}`}>{i+1}</div></td>
                                    <td className="p-4 font-bold text-slate-700">{d.nama}</td>
                                    <td className="p-4 text-slate-600">{d.sekolah}</td>
                                    <td className="p-4 text-slate-600">{d.kecamatan}</td>
                                    <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/10 border-l border-slate-100">{d.score_bi !== null ? d.score_bi : '-'}</td>
                                    <td className="p-4 text-center font-bold text-orange-600 bg-orange-50/10 border-l border-slate-100">{d.score_mtk !== null ? d.score_mtk : '-'}</td>
                                    <td className="p-4 text-center font-extrabold text-indigo-700 text-lg border-l border-slate-100">{d.avg.toFixed(2)}</td>
                                    <td className="p-4 text-center border-l border-slate-100">{getPredicateBadge(d.avg)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AnalisisTab = ({ students }: { students: any[] }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const userMap = useMemo(() => {
        const map: Record<string, any> = {};
        students.forEach(s => map[s.username] = s);
        return map;
    }, [students]);
    useEffect(() => { 
        api.getExams().then(res => {
            setExams(res.filter(e => !e.id.startsWith('Survey_')));
        }); 
    }, []);
    useEffect(() => {
        if (!selectedExam) return;
        setLoading(true);
        api.getRecap().then(res => {
            const examData = res.filter((r: any) => r.mapel === selectedExam);
            setData(examData);
        }).catch(console.error).finally(() => setLoading(false));
    }, [selectedExam]);
    const uniqueSchools = useMemo(() => {
        const schools = new Set(data.map(d => d.sekolah).filter(Boolean));
        return Array.from(schools).sort();
    }, [data]);
    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(students.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [students]);
    const { parsedData, questionIds } = useMemo(() => {
        const parsed = data.map(d => {
            let ans = {};
            try {
                if (typeof d.analisis === 'string') {
                    ans = JSON.parse(d.analisis);
                } else {
                    ans = d.analisis || {};
                }
            } catch (e) {
                console.error("Failed to parse analysis JSON", e);
            }
            return { ...d, ansMap: ans };
        });
        const allKeys = new Set<string>();
        parsed.forEach(p => { Object.keys(p.ansMap).forEach(k => allKeys.add(k)); });
        const sortedKeys = Array.from(allKeys).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        return { parsedData: parsed, questionIds: sortedKeys };
    }, [data]);
    const filteredParsedData = useMemo(() => {
        return parsedData.filter(d => {
            const user = userMap[d.username];
            const userKecamatan = user ? user.kecamatan : '-';
            const schoolMatch = filterSchool === 'all' || d.sekolah === filterSchool;
            const kecMatch = filterKecamatan === 'all' || (userKecamatan && userKecamatan.toLowerCase() === filterKecamatan.toLowerCase());
            return schoolMatch && kecMatch;
        });
    }, [parsedData, filterSchool, filterKecamatan, userMap]);
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div><h3 className="font-bold text-lg flex items-center gap-2"><BarChart3 size={20}/> Analisis Butir Soal</h3><p className="text-xs text-slate-400">Detail jawaban benar/salah setiap peserta.</p></div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}><option value="all">Semua Sekolah</option>{uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}><option value="">-- Pilih Ujian --</option>{exams.map(e => <option key={e.id} value={e.id}>{e.nama_ujian}</option>)}</select>
                    {filteredParsedData.length > 0 && (<button onClick={() => {
                            const exportData = filteredParsedData.map(d => {
                                const row: any = { Nama: d.nama, Sekolah: d.sekolah, Kecamatan: userMap[d.username]?.kecamatan || '-', Nilai: d.nilai };
                                questionIds.forEach(q => row[q] = d.ansMap[q]);
                                return row;
                            });
                            exportToExcel(exportData, `Analisis_${selectedExam}`);
                        }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"><FileText size={16}/> Export</button>)}
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase">
                        <tr>
                            <th className="p-3 w-10 text-center border-r border-slate-200">No</th>
                            <th className="p-3 border-r border-slate-200">Username</th>
                            <th className="p-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Nama Peserta</th>
                            <th className="p-3">Sekolah</th>
                            <th className="p-3">Kecamatan</th>
                            <th className="p-3 border-r border-slate-200">Nilai</th>
                            {questionIds.map(q => (<th key={q} className="p-3 text-center min-w-[40px]">{q}</th>))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (<tr><td colSpan={6 + questionIds.length} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data analisis...</td></tr>) : filteredParsedData.length === 0 ? (<tr><td colSpan={6 + questionIds.length} className="p-8 text-center text-slate-400 italic">Silakan pilih ujian untuk melihat data.</td></tr>) : (filteredParsedData.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="p-3 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                            <td className="p-3 font-mono text-slate-600 border-r border-slate-100">{d.username}</td>
                            <td className="p-3 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100">{d.nama}</td>
                            <td className="p-3 text-slate-600">{d.sekolah}</td>
                            <td className="p-3 text-slate-600">{userMap[d.username]?.kecamatan || '-'}</td>
                            <td className="p-3 font-bold text-indigo-600 border-r border-slate-100">{d.nilai}</td>
                            {questionIds.map(q => { const val = d.ansMap[q]; const isCorrect = val === 1; return (<td key={q} className={`p-1 text-center font-bold border-l border-slate-50 ${val === undefined ? 'text-slate-300' : isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{val === undefined ? '-' : val}</td>); })}
                        </tr>)))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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

const DaftarPesertaTab = ({ currentUser, onDataChange }: { currentUser: User, onDataChange: () => void }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all'); 
    const [filterSchool, setFilterSchool] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<{
        id: string; username: string; password: string; fullname: string; role: string; 
        school: string; kecamatan: string; gender: string; photo?: string; photo_url?: string 
    }>({ id: '', username: '', password: '', fullname: '', role: 'siswa', school: '', kecamatan: '', gender: 'L', photo: '', photo_url: '' });
    
    useEffect(() => { loadUsers(); }, []);
    const loadUsers = async () => { setLoading(true); try { const data = await api.getUsers(); setUsers(data); } catch(e) { console.error(e); } finally { setLoading(false); } };
    const handleDelete = async (username: string) => { if(!confirm("Yakin ingin menghapus pengguna ini?")) return; setLoading(true); try { await api.deleteUser(username); setUsers(prev => prev.filter(u => u.username !== username)); onDataChange(); } catch (e) { alert("Gagal menghapus user."); } finally { setLoading(false); } };
    
    const handleEdit = (user: any) => { 
        setFormData({ 
            id: user.id, username: user.username, password: user.password, fullname: user.fullname, 
            role: user.role, school: user.school || '', kecamatan: user.kecamatan || '', gender: user.gender || 'L',
            photo: '', photo_url: user.photo_url || ''
        }); 
        setIsModalOpen(true); 
    };
    
    const handleAdd = () => { 
        setFormData({ 
            id: '', username: '', password: '', fullname: '', role: 'siswa', 
            school: currentUser.role === 'admin_sekolah' ? currentUser.kelas_id : '', 
            kecamatan: '', gender: 'L', photo: '', photo_url: '' 
        }); 
        setIsModalOpen(true); 
    };
    
    const handleSave = async (e: React.FormEvent) => { e.preventDefault(); setIsSaving(true); try { await api.saveUser(formData); await loadUsers(); setIsModalOpen(false); onDataChange(); } catch (e) { console.error(e); alert("Gagal menyimpan data."); } finally { setIsSaving(false); } };
    const uniqueSchools = useMemo<string[]>(() => { const schools = new Set(users.map(u => u.school).filter(Boolean)); return Array.from(schools).sort() as string[]; }, [users]);
    const filteredUsers = useMemo(() => { let res = users; if (filterRole !== 'all') res = res.filter(u => u.role === filterRole); if (filterSchool !== 'all') res = res.filter(u => u.school === filterSchool); if (searchTerm) { const lower = searchTerm.toLowerCase(); res = res.filter(u => u.username.toLowerCase().includes(lower) || u.fullname.toLowerCase().includes(lower) || (u.school && u.school.toLowerCase().includes(lower)) || (u.kecamatan && u.kecamatan.toLowerCase().includes(lower))); } if (currentUser.role === 'admin_sekolah') res = res.filter(u => u.role === 'siswa' && (u.school || '').toLowerCase() === (currentUser.kelas_id || '').toLowerCase()); return res; }, [users, filterRole, filterSchool, searchTerm, currentUser]);
    const handleExport = () => { const dataToExport = filteredUsers.map((u, i) => ({ No: i + 1, Username: u.username, Password: u.password, "Nama Lengkap": u.fullname, Role: u.role, "Jenis Kelamin": u.gender, "Sekolah / Kelas": u.school, "Kecamatan": u.kecamatan || '-' })); exportToExcel(dataToExport, "Data_Pengguna", "Users"); };
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || e.target.files.length === 0) return; setIsImporting(true); const file = e.target.files[0]; const reader = new FileReader(); reader.onload = async (evt) => { try { const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' }); const wsName = wb.SheetNames[0]; const ws = wb.Sheets[wsName]; const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }); const parsedUsers = []; for (let i = 1; i < data.length; i++) { const row: any = data[i]; if (!row[0]) continue; parsedUsers.push({ username: String(row[0]), password: String(row[1]), role: String(row[2] || 'siswa').toLowerCase(), fullname: String(row[3]), gender: String(row[4] || 'L').toUpperCase(), school: String(row[5] || ''), kecamatan: String(row[6] || ''), photo_url: String(row[7] || '') }); } if (parsedUsers.length > 0) { await api.importUsers(parsedUsers); alert(`Berhasil mengimpor ${parsedUsers.length} pengguna.`); await loadUsers(); onDataChange(); } else { alert("Tidak ada data valid yang ditemukan."); } } catch (err) { console.error(err); alert("Gagal membaca file Excel."); } finally { setIsImporting(false); if (e.target) e.target.value = ''; } }; reader.readAsBinaryString(file); };
    const downloadTemplate = () => { const ws = XLSX.utils.json_to_sheet([ { "Username": "siswa001", "Password": "123", "Role (siswa/admin_sekolah/admin_pusat)": "siswa", "Nama Lengkap": "Ahmad Siswa", "L/P": "L", "Sekolah / Kelas": "UPT SD Negeri Remen 2", "Kecamatan": "Jenu", "Link Foto (Opsional)": "https://..." }, { "Username": "proktor01", "Password": "123", "Role (siswa/admin_sekolah/admin_pusat)": "admin_sekolah", "Nama Lengkap": "Pak Guru", "L/P": "L", "Sekolah / Kelas": "UPT SD Negeri Glodog", "Kecamatan": "Palang", "Link Foto (Opsional)": "" } ]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template_User"); XLSX.writeFile(wb, "Template_Import_User.xlsx"); };
    
    // Handle Image Selection and Compression
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { alert("Ukuran file terlalu besar. Maks 2MB"); return; }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Increased from 300 for better quality
                    const maxSize = 500;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                    } else {
                        if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                    }
                    
                    canvas.width = Math.floor(width);
                    canvas.height = Math.floor(height);
                    
                    if (ctx) {
                        // Fill white background to prevent black background on transparent images
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Quality 0.9
                        setFormData(prev => ({ ...prev, photo: dataUrl }));
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 fade-in space-y-6">
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                 <div><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Users size={20}/> Manajemen Pengguna</h3><p className="text-slate-400 text-xs">Tambah, edit, hapus, atau impor data pengguna.</p></div>
                 <div className="flex flex-wrap gap-2">
                    <button onClick={handleExport} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition border border-emerald-100"><FileText size={14}/> Export Data</button>
                    {currentUser.role === 'admin_pusat' && (<><button onClick={downloadTemplate} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-200 transition"><Download size={14}/> Template</button><label className={`cursor-pointer bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition ${isImporting ? 'opacity-50 cursor-wait' : ''}`}>{isImporting ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>} {isImporting ? "Mengimpor..." : "Impor Excel"}<input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={isImporting} /></label></>)}
                    <button onClick={handleAdd} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition"><Plus size={14}/> Tambah User</button>
                 </div>
             </div>
             <div className="flex flex-col md:flex-row gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Cari Username, Nama, Sekolah, atau Kecamatan..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                {currentUser.role === 'admin_pusat' && (
                    <><select className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}><option value="all">Semua Sekolah</option>{uniqueSchools.map(s => <option key={s} value={s}>{s}</option>)}</select><select className="p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 bg-white" value={filterRole} onChange={e => setFilterRole(e.target.value)}><option value="all">Semua Role</option><option value="siswa">Siswa</option><option value="admin_sekolah">Proktor (Admin Sekolah)</option><option value="admin_pusat">Admin Pusat</option></select></>
                )}
             </div>
             <div className="overflow-x-auto rounded-lg border border-slate-200">
                 <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Username</th><th className="p-4">Nama Lengkap</th><th className="p-4">Role</th><th className="p-4">Sekolah / Kelas</th><th className="p-4">Kecamatan</th><th className="p-4 text-center">Aksi</th></tr></thead>
                     <tbody className="divide-y divide-slate-100">
                         {loading ? (<tr><td colSpan={6} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</td></tr>) : filteredUsers.length === 0 ? (<tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>) : (filteredUsers.map(u => (<tr key={u.id || u.username} className="hover:bg-slate-50 transition"><td className="p-4 font-mono font-bold text-slate-600">{u.username}</td><td className="p-4 text-slate-700 flex items-center gap-3">{u.photo_url ? <img src={u.photo_url} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} /> : <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-300">{u.fullname.charAt(0)}</div>}<div className="hidden w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-300">{u.fullname.charAt(0)}</div><span>{u.fullname}</span></td><td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === 'admin_pusat' ? 'bg-purple-100 text-purple-600' : u.role === 'admin_sekolah' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>{u.role === 'admin_sekolah' ? 'Proktor' : u.role}</span></td><td className="p-4 text-slate-600 text-xs">{u.school || '-'}</td><td className="p-4 text-slate-600 text-xs">{u.kecamatan || '-'}</td><td className="p-4 flex justify-center gap-2"><button onClick={() => handleEdit(u)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"><Edit size={16}/></button><button onClick={() => handleDelete(u.username)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={16}/></button></td></tr>)))}
                     </tbody>
                 </table>
             </div>
             {isModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl"><h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button></div>
                         <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="flex justify-center mb-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-white flex items-center justify-center shadow-sm">
                                            {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-300"/>}
                                        </div>
                                        <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 shadow-md">
                                            <Upload size={14}/>
                                            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageChange} />
                                        </label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label><input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={!!formData.id && formData.role !== 'siswa'} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label><input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label><input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} /></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label><select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} disabled={currentUser.role !== 'admin_pusat'}><option value="siswa">Siswa</option><option value="admin_sekolah">Proktor</option><option value="admin_pusat">Admin Pusat</option></select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jenis Kelamin</label><select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-white" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div></div>
                                {(formData.role === 'siswa' || formData.role === 'admin_sekolah') && (<div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{formData.role === 'siswa' ? 'Kelas / Sekolah' : 'Nama Sekolah (Untuk Proktor)'}</label><input required type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} placeholder={formData.role === 'siswa' ? "Sekolah" : "Sekolah"} disabled={currentUser.role === 'admin_sekolah'} /></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kecamatan</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.kecamatan} onChange={e => setFormData({...formData, kecamatan: e.target.value})} placeholder="Kecamatan"/></div></div>)}
                                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">Batal</button><button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2">{isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Simpan</button></div>
                            </form>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

// ... (Rest of AdminDashboard)
// ... RilisTokenTab, BankSoalTab, RekapSurveyTab, AdminDashboard ...

const RilisTokenTab = ({ token, duration, maxQuestions, surveyDuration, refreshData, isRefreshing }: { token: string, duration: number, maxQuestions: number, surveyDuration: number, refreshData: () => void, isRefreshing: boolean }) => {
    const [localMaxQ, setLocalMaxQ] = useState(maxQuestions);
    const [isSavingQ, setIsSavingQ] = useState(false);
    const [surveyDur, setSurveyDur] = useState(surveyDuration || 30);
    
    // States for Token and Exam Duration editing
    const [tokenInput, setTokenInput] = useState(token);
    const [isEditingToken, setIsEditingToken] = useState(false);
    const [durationInput, setDurationInput] = useState(duration);
    const [isEditingDuration, setIsEditingDuration] = useState(false);

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
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Manajemen Token & Sesi</h2>
                <p className="text-slate-500 mb-8">Atur token akses, durasi, dan batas soal untuk semua sesi ujian.</p>
                
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
                            <span className="font-mono text-5xl font-extrabold tracking-[0.2em] cursor-pointer" onClick={() => navigator.clipboard.writeText(token)} title="Klik untuk salin">{token}</span>
                            <button onClick={()=>setIsEditingToken(true)} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition"><Edit size={18}/></button>
                        </div>
                    )}
                </div>

                {/* Exam Duration Section */}
                <div className="grid grid-cols-2 gap-4 mb-6">
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
                                <button onClick={()=>setIsEditingDuration(true)} className="text-indigo-400 hover:text-indigo-600"><Edit size={14}/></button>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center">
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Status Sistem</p>
                        <p className="text-xl font-bold text-emerald-600 flex items-center justify-center gap-2"><CheckCircle2 size={20}/> Aktif</p>
                    </div>
                </div>

                {/* Other Settings */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl mb-6 text-left shadow-sm space-y-4">
                    <div><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Layers size={14}/> Jumlah Soal Tampil (Exam)</label><span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">0 = Semua</span></div><div className="flex gap-2"><input type="number" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none text-center" value={localMaxQ} onChange={(e) => setLocalMaxQ(Number(e.target.value))} placeholder="0" min="0"/><button onClick={handleSaveMaxQ} disabled={isSavingQ || localMaxQ == maxQuestions} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition">{isSavingQ ? <Loader2 size={14} className="animate-spin"/> : "Simpan"}</button></div></div>
                    <div className="border-t border-slate-100 pt-4"><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Clock size={14}/> Durasi Survey (Menit)</label></div><div className="flex gap-2"><input type="number" className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none text-center" value={surveyDur} onChange={(e) => setSurveyDur(Number(e.target.value))} placeholder="30" min="1"/><button onClick={handleSaveSurveyDur} disabled={isSavingQ} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition">Simpan</button></div></div>
                </div>
                
                <button onClick={refreshData} disabled={isRefreshing} className={`w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition shadow-lg flex items-center justify-center gap-2 ${isRefreshing ? 'opacity-75 cursor-wait' : ''}`}><RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? "Memuat Data..." : "Refresh Data"}</button>
            </div>
        </div>
    )
}

const BankSoalTab = () => {
    // ... existing implementation ...
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
            // Filter standard subjects plus Add Survey sheets manually
            let names = list.map(l => l.nama_ujian);
            const listIds = list.map(l => l.id);
            const forbidden = ['Rangking', 'Nilai', 'Rekap_Analisis', 'Config', 'Users', 'Ranking', 'Logs'];
            const filtered = listIds.filter(n => !forbidden.includes(n) && !n.startsWith('Survey_'));
            filtered.push('Survey_Karakter', 'Survey_Lingkungan');
            
            setSubjects(filtered);
            if (filtered.length > 0) setSelectedSubject(filtered[0]);
        };
        loadSubjects();
    }, []);

    useEffect(() => {
        if (!selectedSubject) return;
        const loadQ = async () => {
            setLoadingData(true);
            try {
                // Determine if it is a survey
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
        const isSurvey = selectedSubject.startsWith('Survey_');
        setCurrentQ({
            id: isSurvey ? `S${questions.length + 1}` : `Q${questions.length + 1}`,
            text_soal: '',
            tipe_soal: isSurvey ? 'LIKERT' : 'PG',
            gambar: '',
            opsi_a: '',
            opsi_b: '',
            opsi_c: '',
            opsi_d: '',
            kunci_jawaban: '',
            bobot: isSurvey ? 1 : 10
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
        const finalQ = { ...currentQ, kunci_jawaban: currentQ.kunci_jawaban.toUpperCase() };
        await api.saveQuestion(selectedSubject, finalQ);
        const data = await api.getRawQuestions(selectedSubject);
        setQuestions(data);
        setModalOpen(false);
        setLoadingData(false);
    };

    // --- IMPORT / EXPORT LOGIC ---
    const downloadTemplate = () => {
        const isSurvey = selectedSubject.startsWith('Survey_');
        // Update Template for Survey to use Scale 1, 2, 3, 4
        // A=1, B=2, C=3, D=4
        const header = isSurvey 
            ? ["ID", "Pernyataan", "Skala 1 (Nilai 1)", "Skala 2 (Nilai 2)", "Skala 3 (Nilai 3)", "Skala 4 (Nilai 4)"]
            : ["ID Soal", "Teks Soal", "Tipe Soal (PG/PGK/BS)", "Link Gambar", "Opsi A", "Opsi B", "Opsi C", "Opsi D"];
        
        const row = isSurvey 
            ? [
                {
                    "ID": "S1", 
                    "Pernyataan": "Saya merasa senang belajar hal baru.", 
                    "Skala 1 (Nilai 1)": "Sangat Kurang Sesuai",
                    "Skala 2 (Nilai 2)": "Kurang Sesuai",
                    "Skala 3 (Nilai 3)": "Sesuai",
                    "Skala 4 (Nilai 4)": "Sangat Sesuai",
                }
              ]
            : [{
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
            }];

        const ws = XLSX.utils.json_to_sheet(row);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, isSurvey ? "Template_Survey.xlsx" : "Template_Soal_CBT.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setImporting(true);
        const file = e.target.files[0];
        const reader = new FileReader();
        const isSurvey = selectedSubject.startsWith('Survey_');
        
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
                
                const parsedQuestions: QuestionRow[] = [];
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!row[0]) continue;
                    
                    if (isSurvey) {
                         // Mapping for Survey based on new template (Scale 1 up to 4):
                         // 0:ID, 1:Pernyataan, 2:Skala 1, 3:Skala 2, 4:Skala 3, 5:Skala 4, 6:Kunci, 7:Bobot
                         parsedQuestions.push({
                            id: String(row[0]),
                            text_soal: String(row[1] || ""),
                            tipe_soal: 'LIKERT',
                            gambar: "",
                            opsi_a: String(row[2] || ""), // Skala 1 (Nilai 1)
                            opsi_b: String(row[3] || ""), // Skala 2 (Nilai 2)
                            opsi_c: String(row[4] || ""), // Skala 3 (Nilai 3)
                            opsi_d: String(row[5] || ""), // Skala 4 (Nilai 4)
                            kunci_jawaban: String(row[6] || ""), // Key
                            bobot: Number(row[7] || 1) // Weight
                        });
                    } else {
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
                }

                if (parsedQuestions.length > 0) {
                     await api.importQuestions(selectedSubject, parsedQuestions);
                     alert(`Berhasil mengimpor ${parsedQuestions.length} soal.`);
                     setLoadingData(true);
                     const freshData = await api.getRawQuestions(selectedSubject);
                     setQuestions(freshData);
                     setLoadingData(false);
                } else {
                    alert("Tidak ada data soal yang ditemukan dalam file.");
                }

            } catch (err) {
                console.error(err);
                alert("Gagal membaca file Excel.");
            } finally {
                setImporting(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const isSurveyMode = selectedSubject.startsWith('Survey_');

    return (
        <div className="space-y-6 fade-in max-w-full mx-auto">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><FileQuestion size={24}/></div>
                    <div>
                        <h3 className="font-bold text-slate-800">Manajemen Bank Soal & Survey</h3>
                        <p className="text-xs text-slate-400">Edit database soal ujian and survey.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select 
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold min-w-[200px]"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                    >
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button onClick={downloadTemplate} className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition">
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
                        <span className="text-sm font-bold text-slate-400 animate-pulse">Memuat Data...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4 w-16">ID</th>
                                    <th className="p-4 min-w-[200px]">{isSurveyMode ? 'Pernyataan Survey' : 'Teks Soal'}</th>
                                    {!isSurveyMode && <th className="p-4 w-20">Tipe</th>}
                                    {!isSurveyMode && <th className="p-4 w-20">Kunci</th>}
                                    {isSurveyMode && (
                                        <>
                                            <th className="p-4">Skala 1</th>
                                            <th className="p-4">Skala 2</th>
                                            <th className="p-4">Skala 3</th>
                                            <th className="p-4">Skala 4</th>
                                        </>
                                    )}
                                    <th className="p-4 w-32 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {questions.length === 0 ? (
                                    <tr><td colSpan={10} className="p-8 text-center text-slate-400 italic">Belum ada data di sheet ini.</td></tr>
                                ) : questions.map((q, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition">
                                        <td className="p-4 font-mono font-bold text-slate-600">{q.id}</td>
                                        <td className="p-4">
                                            <div className="line-clamp-2 font-medium text-slate-700">{q.text_soal}</div>
                                            {q.gambar && <span className="text-xs text-blue-500 flex items-center gap-1 mt-1"><FileQuestion size={12}/> Ada Gambar</span>}
                                        </td>
                                        {!isSurveyMode && <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{q.tipe_soal}</span></td>}
                                        {!isSurveyMode && <td className="p-4 font-mono text-emerald-600 font-bold">{q.kunci_jawaban}</td>}
                                        {isSurveyMode && (
                                            <>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_a}</td>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_b}</td>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_c}</td>
                                                <td className="p-4 text-xs text-slate-500">{q.opsi_d}</td>
                                            </>
                                        )}
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
             
             {/* EDIT MODAL */}
             {modalOpen && currentQ && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                     <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Edit size={20} className="text-indigo-600"/> {currentQ.id ? 'Edit Data' : 'Tambah Baru'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1">
                            <form id="qForm" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID</label>
                                            <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.id} onChange={e => setCurrentQ({...currentQ, id: e.target.value})} />
                                        </div>
                                        {!isSurveyMode && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipe</label>
                                            <select className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-indigo-100 outline-none" value={currentQ.tipe_soal} onChange={e => setCurrentQ({...currentQ, tipe_soal: e.target.value as any})}>
                                                <option value="PG">Pilihan Ganda</option>
                                                <option value="PGK">Pilihan Ganda Kompleks</option>
                                                <option value="BS">Benar / Salah</option>
                                            </select>
                                        </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teks {isSurveyMode ? 'Pernyataan' : 'Soal'}</label>
                                        <textarea required rows={5} className="w-full p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={currentQ.text_soal} onChange={e => setCurrentQ({...currentQ, text_soal: e.target.value})}></textarea>
                                    </div>
                                    
                                    {!isSurveyMode && (
                                    <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kunci Jawaban</label>
                                            <input required type="text" className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-700" value={currentQ.kunci_jawaban} onChange={e => setCurrentQ({...currentQ, kunci_jawaban: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bobot Nilai</label>
                                            <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.bobot} onChange={e => setCurrentQ({...currentQ, bobot: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    </>
                                    )}
                                </div>
                                {isSurveyMode ? (
                                    <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                        <h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Konfigurasi Likert (1, 2, 3, 4)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 1 (Nilai 1)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_a} onChange={e => setCurrentQ({...currentQ, opsi_a: e.target.value})} placeholder="Sangat Kurang Sesuai" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 2 (Nilai 2)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_b} onChange={e => setCurrentQ({...currentQ, opsi_b: e.target.value})} placeholder="Kurang Sesuai" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 3 (Nilai 3)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_c} onChange={e => setCurrentQ({...currentQ, opsi_c: e.target.value})} placeholder="Sesuai" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label Skala 4 (Nilai 4)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_d} onChange={e => setCurrentQ({...currentQ, opsi_d: e.target.value})} placeholder="Sangat Sesuai" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target (Misal: 4)</label>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.kunci_jawaban} onChange={e => setCurrentQ({...currentQ, kunci_jawaban: e.target.value})} placeholder="4" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bobot (Default 1)</label>
                                                <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.bobot} onChange={e => setCurrentQ({...currentQ, bobot: Number(e.target.value)})} placeholder="1" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Pilihan Jawaban / Pernyataan</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi A / Pernyataan 1</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_a} onChange={e => setCurrentQ({...currentQ, opsi_a: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi B / Pernyataan 2</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_b} onChange={e => setCurrentQ({...currentQ, opsi_b: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi C / Pernyataan 3</label>
                                        <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_c} onChange={e => setCurrentQ({...currentQ, opsi_c: e.target.value})} />
                                    </div>
                                    {currentQ.tipe_soal !== 'PGK' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opsi D / Pernyataan 4</label>
                                            <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-lg" value={currentQ.opsi_d} onChange={e => setCurrentQ({...currentQ, opsi_d: e.target.value})} />
                                        </div>
                                    )}
                                </div>
                                )}
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

const RekapSurveyTab = () => {
    const [selectedSurvey, setSelectedSurvey] = useState('Survey_Karakter');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await api.getSurveyRecap(selectedSurvey);
                setData(res);
            } catch(e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, [selectedSurvey]);

    const getSurveyPredicate = (avgVal: any) => {
        const val = parseFloat(avgVal);
        if (isNaN(val)) return "-";
        if (val > 3.25) return "Sangat Baik";
        if (val > 2.5) return "Baik";
        if (val > 1.75) return "Cukup";
        return "Kurang";
    };

    const getPredicateColor = (pred: string) => {
        switch(pred) {
            case "Sangat Baik": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "Baik": return "bg-blue-100 text-blue-700 border-blue-200";
            case "Cukup": return "bg-orange-100 text-orange-700 border-orange-200";
            default: return "bg-red-100 text-red-700 border-red-200";
        }
    };

    const handleExport = () => {
        const exportData = data.map((d, i) => {
            const row: any = {
                No: i + 1,
                Timestamp: d.timestamp,
                Username: d.username,
                Nama: d.nama,
                Sekolah: d.sekolah,
                Kecamatan: d.kecamatan, 
                "Total Skor": d.total,
                "Rata-rata": d.rata,
                "Predikat": getSurveyPredicate(d.rata),
                Durasi: d.durasi
            };
            if(d.items) {
                Object.keys(d.items).forEach(k => {
                    row[k] = d.items[k];
                });
            }
            return row;
        });
        exportToExcel(exportData, `Rekap_${selectedSurvey}`, "Data");
    };

    const questionKeys = useMemo(() => {
        const keys = new Set<string>();
        data.forEach(d => {
            if (d.items) {
                Object.keys(d.items).forEach(k => keys.add(k));
            }
        });
        return Array.from(keys).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    }, [data]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden fade-in">
             <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-800 flex items-left gap-2"><ClipboardList size={20}/> Rekap & Analisis Survey</h3>
                    <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 4: Sangat Sesuai</span>
                        <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 3: Sesuai</span>
                        <span className="flex items-center gap-1 text-orange-600"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 2: Kurang</span>
                        <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500"></span> 1: Sangat Kurang</span>
                    </div>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                     <select className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm w-full lg:w-auto outline-none focus:ring-2 focus:ring-indigo-100" value={selectedSurvey} onChange={e => setSelectedSurvey(e.target.value)}>
                        <option value="Survey_Karakter">Survey Karakter</option>
                        <option value="Survey_Lingkungan">Survey Lingkungan Belajar</option>
                     </select>
                     <button onClick={handleExport} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 border border-emerald-100 transition shadow-sm">
                        <FileText size={14}/> Export
                     </button>
                </div>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                         <tr>
                             <th className="p-4 w-12 text-center border-r border-slate-200">No</th>
                             <th className="p-4 border-r border-slate-200">Username</th>
                             <th className="p-4 sticky left-0 bg-slate-50 border-r border-slate-200 z-10 min-w-[150px]">Nama</th>
                             <th className="p-4 min-w-[120px]">Sekolah</th>
                             <th className="p-4 min-w-[120px]">Kecamatan</th>
                             <th className="p-4 text-center">Total</th>
                             <th className="p-4 text-center border-r border-slate-200">Rata-rata</th>
                             <th className="p-4 text-center border-r border-slate-200">Predikat</th>
                             {questionKeys.map(k => (
                                 <th key={k} className="p-4 text-center min-w-[40px] border-l border-slate-100">{k}</th>
                             ))}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                         {loading ? (
                             <tr><td colSpan={8 + questionKeys.length} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat...</td></tr>
                         ) : data.length === 0 ? (
                             <tr><td colSpan={8 + questionKeys.length} className="p-8 text-center text-slate-400">Belum ada data survey ini.</td></tr>
                         ) : data.map((d, i) => {
                             const pred = getSurveyPredicate(d.rata);
                             return (
                             <tr key={i} className="hover:bg-slate-50 transition">
                                 <td className="p-4 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                                 <td className="p-4 font-mono text-slate-600 border-r border-slate-100">{d.username}</td>
                                 <td className="p-4 font-bold text-slate-700 sticky left-0 bg-white border-r border-slate-100 shadow-sm">{d.nama}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.sekolah}</td>
                                 <td className="p-4 text-slate-600 text-xs">{d.kecamatan}</td>
                                 <td className="p-4 text-center font-bold text-indigo-600">{d.total}</td>
                                 <td className="p-4 text-center font-bold bg-indigo-50 text-indigo-700 border-r border-slate-100">{d.rata}</td>
                                 <td className="p-4 text-center border-r border-slate-100">
                                     <span className={`px-2 py-1 rounded text-xs font-bold border ${getPredicateColor(pred)}`}>
                                         {pred}
                                     </span>
                                 </td>
                                 {questionKeys.map(k => {
                                     const valStr = d.items?.[k];
                                     const val = parseInt(valStr);
                                     let bgClass = "text-slate-300";
                                     if (val === 4) bgClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                                     else if (val === 3) bgClass = "bg-blue-50 text-blue-700 border-blue-100";
                                     else if (val === 2) bgClass = "bg-orange-50 text-orange-700 border-orange-100";
                                     else if (val === 1) bgClass = "bg-red-50 text-red-700 border-red-100";
                                     
                                     return (
                                         <td key={k} className={`p-2 text-center text-xs font-bold border-l border-b border-slate-50 ${bgClass}`}>
                                             {valStr || '-'}
                                         </td>
                                     );
                                 })}
                             </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
        </div>
    );
};


const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rekap' | 'rekap_survey' | 'analisis' | 'ranking' | 'bank_soal' | 'data_user' | 'status_tes' | 'kelompok_tes' | 'rilis_token' | 'atur_sesi' | 'atur_gelombang' | 'cetak_absensi'>('overview');
  const [dashboardData, setDashboardData] = useState<any>({ 
      students: [], 
      questionsMap: {}, 
      totalUsers: 0, 
      token: 'TOKEN',
      duration: 60,
      maxQuestions: 0, 
      surveyDuration: 30, // Initialize
      statusCounts: { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 },
      activityFeed: [],
      allUsers: [], 
      schedules: [] 
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // FIX: Local state for current user to allow updates without re-login
  const [currentUserState, setCurrentUserState] = useState<User>(user);

  useEffect(() => {
    setCurrentUserState(user);
  }, [user]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
        const data = await api.getDashboardData();
        setDashboardData(data);
        
        // FIX: Sync current user data if found in dashboard data
        if (data.allUsers && Array.isArray(data.allUsers)) {
            const freshUser = data.allUsers.find((u: any) => u.username === user.username);
            if (freshUser) {
                setCurrentUserState(prev => ({ ...prev, ...freshUser }));
            }
        }
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

  const getTabTitle = () => {
    switch(activeTab) {
        case 'overview': return "Dashboard Utama";
        case 'bank_soal': return "Manajemen Bank Soal & Survey";
        case 'rekap': return "Rekapitulasi Nilai";
        case 'rekap_survey': return "Rekap & Analisis Survey";
        case 'analisis': return "Analisis Butir Soal";
        case 'ranking': return "Peringkat Peserta";
        case 'data_user': return "Daftar Peserta";
        case 'status_tes': return "Status Tes & Reset Login";
        case 'kelompok_tes': return "Kelompok Tes (Assignment)";
        case 'atur_sesi': return "Atur Sesi & Absensi";
        case 'atur_gelombang': return "Atur Gelombang Sekolah";
        case 'rilis_token': return "Rilis Token";
        case 'cetak_absensi': return "Cetak Absensi";
        default: return "Dashboard";
    }
  };

  const OverviewTab = () => {
    const stats = useMemo(() => {
        let counts = dashboardData.statusCounts || { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
        let total = dashboardData.totalUsers || 0;

        if (currentUserState.role === 'admin_sekolah') {
            const mySchool = (currentUserState.kelas_id || '').toLowerCase();
            const schoolUsers = (dashboardData.allUsers || []).filter((u: any) => 
                (u.school || '').toLowerCase() === mySchool
            );
            
            const localCounts = { OFFLINE: 0, LOGGED_IN: 0, WORKING: 0, FINISHED: 0 };
            schoolUsers.forEach((u: any) => {
                const status = u.status as keyof typeof localCounts;
                if (localCounts[status] !== undefined) {
                    localCounts[status]++;
                }
            });

            counts = localCounts;
            total = schoolUsers.length;
        }

        return { counts, total };
    }, [dashboardData, currentUserState]);

    const { OFFLINE, LOGGED_IN, WORKING, FINISHED } = stats.counts;
    const displayTotalUsers = stats.total;
    const totalStatus = OFFLINE + LOGGED_IN + WORKING + FINISHED;
    
    const statusData = [
        { value: OFFLINE, color: '#e2e8f0', label: 'Belum Login' },
        { value: LOGGED_IN, color: '#facc15', label: 'Sudah Login' },
        { value: WORKING, color: '#3b82f6', label: 'Mengerjakan' },
        { value: FINISHED, color: '#10b981', label: 'Selesai' },
    ];
    
    const filteredFeed = useMemo(() => {
        const feed = dashboardData.activityFeed || [];
        if (currentUserState.role === 'admin_sekolah') {
            const mySchool = (currentUserState.kelas_id || '').toLowerCase();
            return feed.filter((log: any) => (log.school || '').toLowerCase() === mySchool);
        }
        return feed;
    }, [dashboardData.activityFeed, currentUserState]);

    const mySchedule = useMemo(() => {
        if (currentUserState.role === 'admin_sekolah' && dashboardData.schedules) {
            return dashboardData.schedules.find((s:any) => s.school === currentUserState.kelas_id);
        }
        return null;
    }, [currentUserState, dashboardData.schedules]);

    const uniqueSchoolsCount = useMemo(() => {
        if (!dashboardData.allUsers) return 0;
        const schools = new Set(dashboardData.allUsers.map((u: any) => u.school).filter((s: any) => s && s !== '-' && s.trim() !== ''));
        return schools.size;
    }, [dashboardData.allUsers]);

    return (
    <div className="space-y-6 fade-in max-w-7xl mx-auto">
        {currentUserState.role === 'admin_sekolah' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-200 p-2 rounded-lg"><School size={20}/></div>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wide">Mode Proktor</h3>
                        <p className="text-sm">Menampilkan data untuk: <b>{currentUserState.kelas_id}</b></p>
                    </div>
                </div>
            </div>
        )}

        {currentUserState.role === 'admin_sekolah' && mySchedule && (
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

        <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUserState.role === 'admin_pusat' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-6`}>
            {currentUserState.role === 'admin_pusat' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Sekolah</p>
                        <h3 className="text-3xl font-extrabold text-slate-700 mt-1">{uniqueSchoolsCount}</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl text-orange-500"><School size={24}/></div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Terdaftar</p><h3 className="text-3xl font-extrabold text-slate-700 mt-1">{displayTotalUsers}</h3></div>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            } else if (log.action === 'SURVEY') {
                                icon = <ClipboardList size={20}/>;
                                colorClass = "bg-purple-100 text-purple-600";
                                statusText = "Survey";
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
                                            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">{new Date(log.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false})}</span>
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

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden fade-in" onClick={() => setIsSidebarOpen(false)}></div>}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">Management System <span className="text-indigo-600">Center</span></h1>
            <p className="text-xs text-slate-400 mt-1">{currentUserState.role === 'admin_pusat' ? 'ADMIN' : 'PROKTOR'} Control Panel</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Home size={20} /> Dashboard</button>
          <div className="pt-4 pb-2 pl-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Manajemen Ujian</div>
          <button onClick={() => { setActiveTab('status_tes'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'status_tes' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Monitor size={20} /> Status Tes</button>
          <button onClick={() => { setActiveTab('kelompok_tes'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'kelompok_tes' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Group size={20} /> Kelompok Tes</button>
          <button onClick={() => { setActiveTab('atur_sesi'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'atur_sesi' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Clock size={20} /> Atur Sesi</button>
          <button onClick={() => { setActiveTab('cetak_absensi'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'cetak_absensi' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Printer size={20} /> Cetak Absensi</button>
          {(currentUserState.role === 'admin_pusat' || currentUserState.role === 'admin_sekolah') && (
            <button onClick={() => { setActiveTab('data_user'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'data_user' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><List size={20} /> Daftar Peserta</button>
          )}
          {currentUserState.role === 'admin_pusat' && (
              <button onClick={() => { setActiveTab('atur_gelombang'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'atur_gelombang' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={20} /> Atur Gelombang</button>
          )}
          <button onClick={() => { setActiveTab('rilis_token'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'rilis_token' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Key size={20} /> Rilis Token</button>
          {currentUserState.role === 'admin_pusat' && (
             <>
                <div className="pt-4 pb-2 pl-4 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Laporan & Data</div>
                <button onClick={() => { setActiveTab('bank_soal'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'bank_soal' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><FileQuestion size={20} /> Bank Soal & Survey</button>
                <button onClick={() => { setActiveTab('rekap'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'rekap' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Rekap Nilai</button>
                <button onClick={() => { setActiveTab('rekap_survey'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition text-left ${activeTab === 'rekap_survey' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><ClipboardList size={20} /> Rekap & Analisis Survey</button>
                <button onClick={() => { setActiveTab('analisis'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'analisis' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><BarChart3 size={20} /> Analisis Soal</button>
                <button onClick={() => { setActiveTab('ranking'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'ranking' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Award size={20} /> Peringkat</button>
             </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">User Profile</p>
                <div className="flex items-center gap-2">
                    {currentUserState.photo_url ? (
                        <img src={currentUserState.photo_url} className="w-8 h-8 rounded-full object-cover border border-slate-300 bg-white" alt="Profile" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold border border-indigo-200">{currentUserState.username.charAt(0).toUpperCase()}</div>
                    )}
                    <p className="text-sm font-bold text-slate-800 leading-tight break-words flex-1">{currentUserState.nama_lengkap || currentUserState.username}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${currentUserState.role === 'admin_pusat' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-700'}`}>{currentUserState.role === 'admin_pusat' ? 'Administrator' : 'Proktor'}</span>
            </div>
            <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition"><LogOut size={20} /> Logout</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50"><Menu size={20} /></button>
                <div><h2 className="text-2xl font-bold text-slate-800">{getTabTitle()}</h2></div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchData} disabled={isRefreshing || loading} title="Refresh Data" className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition relative disabled:opacity-70 disabled:cursor-wait">
                <RefreshCw size={20} className={isRefreshing || loading ? "animate-spin" : ""} />
              </button>
              {currentUserState.photo_url ? (
                  <img src={currentUserState.photo_url} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform bg-white" alt="Profile Header" />
              ) : (
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm cursor-pointer hover:bg-indigo-200 transition-colors">{currentUserState.username.charAt(0).toUpperCase()}</div>
              )}
            </div>
          </div>
          {loading ? <DashboardSkeleton /> : (
             <>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'status_tes' && <StatusTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'kelompok_tes' && <KelompokTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'atur_sesi' && <AturSesiTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} isLoading={isRefreshing} />}
                {activeTab === 'cetak_absensi' && <CetakAbsensiTab currentUser={currentUserState} students={dashboardData.allUsers || []} />}
                {activeTab === 'data_user' && (currentUserState.role === 'admin_pusat' || currentUserState.role === 'admin_sekolah') && <DaftarPesertaTab currentUser={currentUserState} onDataChange={fetchData} />}
                {activeTab === 'atur_gelombang' && currentUserState.role === 'admin_pusat' && <AturGelombangTab students={dashboardData.allUsers || []} />}
                {activeTab === 'rilis_token' && <RilisTokenTab token={dashboardData.token} duration={dashboardData.duration} maxQuestions={dashboardData.maxQuestions} surveyDuration={dashboardData.surveyDuration} refreshData={fetchData} isRefreshing={isRefreshing} />}
                {activeTab === 'bank_soal' && currentUserState.role === 'admin_pusat' && <BankSoalTab />}
                {activeTab === 'rekap' && currentUserState.role === 'admin_pusat' && <RekapTab students={dashboardData.allUsers} />}
                {activeTab === 'rekap_survey' && currentUserState.role === 'admin_pusat' && <RekapSurveyTab />}
                {activeTab === 'ranking' && currentUserState.role === 'admin_pusat' && <RankingTab students={dashboardData.allUsers} />}
                {activeTab === 'analisis' && currentUserState.role === 'admin_pusat' && <AnalisisTab students={dashboardData.allUsers} />}
             </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;