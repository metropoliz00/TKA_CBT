import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Save, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { SchoolSchedule } from '../../types';

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

export default AturGelombangTab;
