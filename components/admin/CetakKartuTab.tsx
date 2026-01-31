import React, { useState, useMemo, useEffect } from 'react';
import { Printer, User as UserIcon, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../services/api';

const CetakKartuTab = ({ currentUser, students, schedules }: { currentUser: User, students: any[], schedules: any[] }) => {
    const [filterSchool, setFilterSchool] = useState('all');
    const [filterKecamatan, setFilterKecamatan] = useState('all');
    const [filterSession, setFilterSession] = useState('all'); // State untuk filter sesi
    const [showAll, setShowAll] = useState(false);
    
    // Local state to hold students with full data (including passwords)
    // Initialize with props, but fetch fresh data to ensure passwords are present
    const [localStudents, setLocalStudents] = useState<any[]>(students);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchFullData = async () => {
            setIsLoading(true);
            try {
                // Fetch from api.getUsers which includes passwords (unlike dashboard summary sometimes)
                const data = await api.getUsers();
                if (Array.isArray(data) && data.length > 0) {
                    setLocalStudents(data);
                }
            } catch (e) {
                console.error("Failed to load full student data for cards", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFullData();
    }, []);

    const uniqueSchools = useMemo(() => {
        const schools = new Set(localStudents.map(s => s.school).filter(Boolean));
        return Array.from(schools).sort() as string[];
    }, [localStudents]);

    const uniqueKecamatans = useMemo(() => {
        const kecs = new Set(localStudents.map(s => s.kecamatan).filter(Boolean).filter(k => k !== '-'));
        return Array.from(kecs).sort();
    }, [localStudents]);

    const filteredStudents = useMemo(() => {
        return localStudents.filter(s => {
            // Filter Role & School Context
            if (currentUser.role === 'admin_sekolah') {
                if ((s.school || '').toLowerCase() !== (currentUser.kelas_id || '').toLowerCase()) return false;
            } else {
                if (filterSchool !== 'all' && s.school !== filterSchool) return false;
                if (filterKecamatan !== 'all' && (s.kecamatan || '').toLowerCase() !== filterKecamatan.toLowerCase()) return false;
            }

            // Filter Session
            if (filterSession !== 'all' && s.session !== filterSession) return false;

            if (s.role !== 'siswa' && s.role !== undefined) return false; 
            return true;
        });
    }, [localStudents, currentUser, filterSchool, filterKecamatan, filterSession]);

    // Helper to find gelombang for a specific student's school
    const getGelombang = (schoolName: string) => {
        const sched = schedules.find((s: any) => s.school === schoolName);
        return sched ? sched.gelombang : '-';
    };

    const handlePrint = () => {
        if (filteredStudents.length === 0) return alert("Tidak ada data siswa untuk dicetak.");

        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Pop-up blocked. Please allow pop-ups.");

        const proktorName = currentUser.nama_lengkap || "...........................";
        
        const cardsHtml = filteredStudents.map((s) => `
            <div class="card">
                <div class="card-header">
                    <img src="https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png" class="logo" />
                    <div class="header-text">
                        <h2>KARTU PESERTA</h2>
                        <p class="title-sub">TRY OUT TKA TAHUN 2026</p>
                        <p class="school-name">${s.school} - ${s.kecamatan || '-'}</p>
                    </div>
                    <img src="https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png" class="logo" />
                </div>
                <div class="card-body">
                    <div class="info-col">
                        <table class="info-table">
                            <tr><td width="60">Nama</td><td>: <b>${s.fullname}</b></td></tr>
                            <tr><td>Sekolah</td><td>: ${s.school}</td></tr>
                            <tr><td>Gelombang</td><td>: ${getGelombang(s.school)}</td></tr>
                            <tr><td>Sesi</td><td>: <b>${s.session || '-'}</b></td></tr>
                            <tr><td>Username</td><td>: <b>${s.username}</b></td></tr>
                            <tr><td>Password</td><td>: <b>${s.password || '-'}</b></td></tr>
                        </table>
                    </div>
                    <div class="photo-col">
                        <div class="photo-box">
                            ${s.photo_url 
                                ? `<img src="${s.photo_url}" style="width:100%; height:100%; object-fit:cover;" />` 
                                : `<span style="font-size:8pt; color:#ccc; text-align:center;">FOTO<br>3x4</span>`
                            }
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="signature">
                        <p>Proktor</p>
                        <div class="sig-space"></div>
                        <p class="proktor-name"><b>${proktorName}</b></p>
                    </div>
                </div>
            </div>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Kartu Peserta_TKA 2026</title>
                <style>
                    @page { size: A4 portrait; margin: 1cm; }
                    body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; background: #eee; }
                    .page-container {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                        width: 190mm; /* A4 width minus margins roughly */
                        margin: 0 auto;
                    }
                    .card {
                        background: white;
                        border: 1px solid #000;
                        width: 90mm;
                        height: 55mm;
                        padding: 4px;
                        box-sizing: border-box;
                        position: relative;
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                    }
                    .card-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2px double #000;
                        padding-bottom: 3px;
                        margin-bottom: 2px;
                        height: 13mm;
                    }
                    .logo { height: 11mm; width: auto; object-fit: contain; }
                    .header-text { text-align: center; flex: 1; }
                    .header-text h2 { font-size: 9pt; margin: 0; font-weight: bold; }
                    .header-text .title-sub { font-size: 9pt; margin: 2px 0 0; font-weight: bold; }
                    .header-text .school-name { font-size: 7pt; margin: 2px 0 0; font-style: italic; }
                    
                    .card-body { 
                        display: flex; 
                        flex: 1; 
                        gap: 2px; 
                        padding-top: 8px; /* Identitas agak ke bawah */
                    }
                    .info-col { flex: 1; }
                    .info-table { width: 100%; font-size: 8pt; border-collapse: collapse; }
                    .info-table td { padding: 1px; vertical-align: top; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50mm; }
                    
                    .photo-col { width: 20mm; display: flex; justify-content: center; align-items: flex-start; padding-top: 0; }
                    .photo-box {
                        width: 18mm; height: 23mm;
                        border: 1px solid #999;
                        display: flex; align-items: center; justify-content: center;
                    }

                    .card-footer {
                        position: absolute;
                        bottom: 5px;
                        right: 45px; /* Moved further left */
                        width: 160px; /* Increased width to prevent cutting */
                        text-align: center;
                    }
                    .signature {
                        font-size: 8pt;
                    }
                    .signature p { margin: 0; }
                    .signature .proktor-name {
                        font-size: 7pt; /* Reduced size slightly */
                        line-height: 1.2;
                    }
                    .sig-space { height: 12px; }

                    @media print {
                        body { background: white; }
                        .page-container { gap: 5mm; }
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    ${cardsHtml}
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

    const displayedStudents = showAll ? filteredStudents : filteredStudents.slice(0, 12);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 fade-in p-6">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg flex items-center gap-2 text-slate-700"><Printer size={20}/> Cetak Kartu Peserta</h3>
                 {isLoading && <span className="text-xs text-indigo-600 font-bold flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Mengambil Data Password...</span>}
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Filter Sesi (Tersedia untuk semua role) */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filter Sesi</label>
                        <select className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-100" value={filterSession} onChange={e => setFilterSession(e.target.value)}>
                            <option value="all">Semua Sesi</option>
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
                    {currentUser.role === 'admin_sekolah' && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-center">
                            <p className="text-sm text-slate-600">Sekolah: <b>{currentUser.kelas_id}</b></p>
                            <p className="text-xs text-slate-400">Total Peserta: {filteredStudents.length}</p>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                    <div className="text-xs text-slate-500">
                        Siap cetak: <b>{filteredStudents.length}</b> kartu.
                    </div>
                    <button onClick={handlePrint} disabled={isLoading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50">
                        <Printer size={16}/> Print Kartu
                    </button>
                </div>
             </div>

             <div className="border border-slate-200 rounded-lg p-4 bg-slate-100 overflow-y-auto max-h-[700px]">
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-center">
                    {displayedStudents.map((s, idx) => (
                        <div key={idx} className="bg-white border border-slate-400 p-1 rounded-sm shadow-sm flex flex-col gap-1 relative text-[10px] mx-auto overflow-hidden" style={{ width: '340px', height: '208px', fontFamily: 'Arial, sans-serif' }}>
                            {/* Header Preview */}
                            <div className="flex justify-between items-center border-b-2 border-double border-slate-800 pb-1 mb-1 h-[45px]">
                                <img src="https://image2url.com/r2/default/images/1769821786493-a2e4eb8b-c903-460d-b8d9-44f326ff71bb.png" className="h-[35px] w-auto object-contain pl-1" alt="Logo"/>
                                <div className="text-center flex-1 leading-tight px-1">
                                    <h4 className="font-bold text-[11px]">KARTU PESERTA</h4>
                                    <p className="font-bold text-[9px]">TRY OUT TKA TAHUN 2026</p>
                                    <p className="text-[8px] italic mt-0.5 truncate max-w-[160px] mx-auto">{s.school} - {s.kecamatan || '-'}</p>
                                </div>
                                <img src="https://image2url.com/r2/default/images/1769821862384-d6ef24bf-e12c-4616-a255-7366afae4c30.png" className="h-[35px] w-auto object-contain pr-1" alt="Logo"/>
                            </div>
                            
                            {/* Body Preview */}
                            <div className="flex gap-2 flex-1 pt-2 px-1">
                                <div className="flex-1">
                                    <table className="w-full text-[9px] leading-relaxed">
                                        <tbody>
                                            <tr><td className="w-14">Nama</td><td>: <b>{s.fullname}</b></td></tr>
                                            <tr><td>Sekolah</td><td>: {s.school}</td></tr>
                                            <tr><td>Gelombang</td><td>: {getGelombang(s.school)}</td></tr>
                                            <tr><td>Sesi</td><td>: <b>{s.session || '-'}</b></td></tr>
                                            <tr><td>Username</td><td>: <b>{s.username}</b></td></tr>
                                            <tr><td>Password</td><td>: <b>{s.password || '-'}</b></td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="w-[68px] flex flex-col items-center">
                                    <div className="w-[55px] h-[70px] border border-slate-400 bg-slate-50 flex items-center justify-center text-[8px] text-slate-400 overflow-hidden">
                                        {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover"/> : <span className="text-center leading-tight">FOTO<br/>3x4</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Preview - Updated position and size */}
                            <div className="absolute bottom-1 right-12 text-[8px] text-center w-[150px]">
                                <p>Proktor</p>
                                <div className="h-6"></div>
                                <p className="font-bold leading-tight text-[7px]">{currentUser.nama_lengkap}</p>
                            </div>
                        </div>
                    ))}
                 </div>
                 
                 {filteredStudents.length === 0 && <p className="text-center text-slate-400 italic py-10">Tidak ada data siswa yang sesuai filter.</p>}
                 
                 {/* Load More Button */}
                 {filteredStudents.length > 12 && (
                     <div className="mt-8 flex justify-center pb-4">
                         <button 
                            onClick={() => setShowAll(!showAll)} 
                            className="bg-white border border-slate-300 text-slate-600 px-6 py-2 rounded-full font-bold text-xs hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm flex items-center gap-2 group"
                         >
                            {showAll ? (
                                <>Tutup Tampilan <ChevronUp size={16} className="group-hover:-translate-y-1 transition-transform"/></>
                            ) : (
                                <>Lihat Semua ({filteredStudents.length} Peserta) <ChevronDown size={16} className="group-hover:translate-y-1 transition-transform"/></>
                            )}
                         </button>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default CetakKartuTab;
