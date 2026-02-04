import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FileText, Loader2, Printer } from 'lucide-react';
import { api } from '../../services/api';
import { exportToExcel, formatDurationToText } from '../../utils/adminHelpers';
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

    const handlePrint = () => {
        if (filteredData.length === 0) return alert("Tidak ada data untuk dicetak.");

        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Pop-up blocked. Please allow pop-ups.");

        const schoolName = filterSchool !== 'all' ? filterSchool : 'Semua Sekolah';
        const kecamatanName = filterKecamatan !== 'all' ? filterKecamatan : 'Semua Kecamatan';
        const dateNow = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const dateOnly = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const signatureDate = `Tuban, ${dateOnly}`;
        const adminName = currentUser.nama_lengkap || "Administrator";
        
        // Generate Rows
        const rowsHtml = filteredData.map((d, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${d.username}</td>
                <td>${d.nama}</td>
                <td>${d.sekolah}</td>
                <td>${d.kecamatan}</td>
                <td style="text-align: center;">${d.nilai_bi}</td>
                <td style="text-align: center;">${d.nilai_mtk}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rekap Nilai TKA 2026</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 20px; color: #000; }
                    .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
                    .logo { height: 80px; width: auto; object-fit: contain; }
                    .header-text { text-align: center; flex-grow: 1; padding: 0 10px; }
                    .header-text h2 { margin: 0; font-size: 18px; text-transform: uppercase; line-height: 1.2; }
                    .header-text h3 { margin: 5px 0 0; font-size: 16px; font-weight: normal; }
                    .info-table { margin-bottom: 20px; font-size: 14px; width: 100%; }
                    .info-table td { padding: 2px; vertical-align: top; }
                    .main-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .main-table th, .main-table td { border: 1px solid black; padding: 6px; }
                    .main-table th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
                    .signature-section { margin-top: 50px; float: right; width: 250px; text-align: center; font-size: 14px; }
                    @media print {
                        @page { size: A4 landscape; margin: 1cm; }
                        button { display: none; }
                        body { padding: 0; }
                        .header-container { -webkit-print-color-adjust: exact; }
                        .main-table th { -webkit-print-color-adjust: exact; background-color: #f0f0f0 !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header-container">
                    <img src="https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png" class="logo" alt="Logo Kiri" />
                    <div class="header-text">
                        <h2>REKAPITULASI NILAI</h2>
                        <h2>TRY OUT TKA TAHUN 2026</h2>
                    </div>
                    <img src="https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png" class="logo" alt="Logo Kanan" />
                </div>

                <table class="info-table">
                    <tr><td width="150">Cakupan Wilayah</td><td>: ${kecamatanName}</td></tr>
                    <tr><td width="150">Sekolah</td><td>: ${schoolName}</td></tr>
                    <tr><td>Tanggal Cetak</td><td>: ${dateNow}</td></tr>
                </table>

                <table class="main-table">
                    <thead>
                        <tr>
                            <th width="40">No</th>
                            <th>Username</th>
                            <th>Nama Peserta</th>
                            <th>Sekolah</th>
                            <th>Kecamatan</th>
                            <th width="80">B. Indo</th>
                            <th width="80">Matematika</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="signature-section">
                    <p>${signatureDate}</p>
                    <p>Koordinator / Proktor</p>
                    <br/><br/><br/>
                    <p style="text-decoration: underline; font-weight: bold;">${adminName}</p>
                    <p style="font-size: 12px;">NIP. ........................................</p>
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
                     <button onClick={handlePrint} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition shadow-lg shadow-rose-200">
                        <Printer size={16}/> Cetak PDF
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
                            <th className="p-4 text-center border-l border-slate-200 bg-blue-50/50">B. Indo</th>
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