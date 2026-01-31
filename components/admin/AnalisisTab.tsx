import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, FileText, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel } from '../../utils/adminHelpers';
import { Exam } from '../../types';

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

export default AnalisisTab;
