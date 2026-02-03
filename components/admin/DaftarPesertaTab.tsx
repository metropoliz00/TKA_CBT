import React, { useState, useEffect, useMemo } from 'react';
import { Users, FileText, Download, Upload, Loader2, Plus, Search, Edit, Trash2, X, Camera, Save } from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types';
import * as XLSX from 'xlsx';
import { exportToExcel } from '../../utils/adminHelpers';

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
                 <table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Username</th><th className="p-4">Nama Lengkap</th><th className="p-4">Role</th><th className="p-4">Sekolah</th><th className="p-4">Kecamatan</th><th className="p-4 text-center">Aksi</th></tr></thead>
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

export default DaftarPesertaTab;
