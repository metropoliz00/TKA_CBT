import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FileText, Loader2, FileDown } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel, exportToPDF, formatDurationToText } from '../../utils/adminHelpers';
import { User } from '../../types';

const RekapTab = ({ students, currentUser }: { students: any[], currentUser: User }) => {
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

    const handlePdfExport = () => {
        const title = "Hasil Rekapitulasi Nilai Try Out TKA 2026";
        const columns = ['No', 'Username', 'Nama', 'Sekolah', 'Kecamatan', 'B. Indo', 'Matematika'];
        const rows = filteredData.map((d, i) => [
            i + 1,
            d.username,
            d.nama,
            d.sekolah,
            d.kecamatan,
            d.nilai_bi !== '-' ? d.nilai_bi : '-',
            d.nilai_mtk !== '-' ? d.nilai_mtk : '-'
        ]);
        
        // Define styles for value columns to ensure equal width and centering
        const colStyles = {
            0: { halign: 'center', cellWidth: 10 }, // No
            5: { halign: 'center', cellWidth: 25 }, // B. Indo (Nilai)
            6: { halign: 'center', cellWidth: 25 }  // Matematika (Nilai)
        };

        exportToPDF(title, columns, rows, {
            school: filterSchool,
            kecamatan: filterKecamatan,
            signerName: currentUser.nama_lengkap || currentUser.username
        }, colStyles);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><LayoutDashboard size={20}/> Rekapitulasi Nilai</h3>
                    <p className="text-xs text-slate-400">Hasil ujian.</p>
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
                     <button onClick={handlePdfExport} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition shadow-lg shadow-rose-200">
                        <FileDown size={16}/> PDF
                     </button>
                     <button onClick={() => exportToExcel(filteredData, "Rekap_Nilai_TKA")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
                        <FileText size={16}/> Excel
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

export default RekapTab;