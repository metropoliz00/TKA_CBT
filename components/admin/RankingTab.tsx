import React, { useState, useMemo, useEffect } from 'react';
import { Award, FileText, Loader2, FileDown } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel, exportToPDF, getPredicateBadge, getScorePredicate } from '../../utils/adminHelpers';
import { User } from '../../types';

const RankingTab = ({ students, currentUser }: { students: any[], currentUser: User }) => {
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

    const handlePdfExport = () => {
        const title = "Hasil Peringkat Peserta TKA";
        const columns = ['Rank', 'Username', 'Nama', 'Sekolah', 'Kecamatan', 'Indo', 'Mat', 'Akhir', 'Predikat'];
        const rows = filteredData.map((d, i) => [
            i + 1,
            d.username,
            d.nama,
            d.sekolah,
            d.kecamatan,
            d.score_bi !== null ? d.score_bi : '-',
            d.score_mtk !== null ? d.score_mtk : '-',
            d.avg.toFixed(2),
            getScorePredicate(d.avg)
        ]);
        
        // Custom styles for specific columns (Indices start from 0)
        // Ensure score columns are centered and have equal width
        const colStyles = {
            0: { halign: 'center', cellWidth: 10 }, // Rank
            5: { halign: 'center', cellWidth: 15 }, // B. Indo
            6: { halign: 'center', cellWidth: 15 }, // Mat
            7: { halign: 'center', cellWidth: 15 }, // Akhir
            8: { halign: 'center', cellWidth: 20 }  // Predikat
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
                <h3 className="font-bold text-lg flex items-center gap-2"><Award size={20}/> Peringkat Peserta</h3>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)}><option value="all">Semua Kecamatan</option>{uniqueKecamatans.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}><option value="all">Semua Sekolah</option>{uniqueSchools.map((s:any) => <option key={s} value={s}>{s}</option>)}</select>
                    <button onClick={handlePdfExport} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition shadow-lg shadow-rose-200"><FileDown size={16}/> PDF</button>
                    <button onClick={() => exportToExcel(filteredData, "Peringkat_Siswa_TKA")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"><FileText size={16}/> Excel</button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-xs">
                        <tr>
                            <th className="p-4 text-center w-16">Rank</th>
                            <th className="p-4">Username</th>
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
                            <tr><td colSpan={9} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Memuat data...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={9} className="p-8 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>
                        ) : (
                            filteredData.map((d, i) => (
                                <tr key={i} className="border-b hover:bg-slate-50 transition">
                                    <td className="p-4 font-bold text-center text-slate-500"><div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${i < 3 ? 'bg-yellow-100 text-yellow-700 font-black' : 'bg-slate-100'}`}>{i+1}</div></td>
                                    <td className="p-4 font-mono text-slate-600">{d.username}</td>
                                    <td className="p-4 font-bold text-slate-600">{d.nama}</td>
                                    <td className="p-4 text-slate-600">{d.sekolah}</td>
                                    <td className="p-4 text-slate-600">{d.kecamatan}</td>
                                    <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/10 border-l border-slate-100">{d.score_bi !== null ? d.score_bi : '-'}</td>
                                    <td className="p-4 text-center font-bold text-orange-500 bg-orange-50/10 border-l border-slate-100">{d.score_mtk !== null ? d.score_mtk : '-'}</td>
                                    <td className="p-4 text-center font-extrabold text-indigo-600 text-lg border-l border-slate-100">{d.avg.toFixed(2)}</td>
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

export default RankingTab;