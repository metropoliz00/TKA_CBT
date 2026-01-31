import React, { useState, useEffect } from 'react';
import { Home, LogOut, Menu, Monitor, Group, Clock, Printer, List, Calendar, Key, FileQuestion, LayoutDashboard, ClipboardList, BarChart3, Award, RefreshCw, X, CreditCard } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { DashboardSkeleton } from '../utils/adminHelpers';

// Import New Sub-components
import OverviewTab from './admin/OverviewTab';
import AturGelombangTab from './admin/AturGelombangTab';
import KelompokTesTab from './admin/KelompokTesTab';
import AturSesiTab from './admin/AturSesiTab';
import CetakAbsensiTab from './admin/CetakAbsensiTab';
import CetakKartuTab from './admin/CetakKartuTab';
import RekapTab from './admin/RekapTab';
import RankingTab from './admin/RankingTab';
import AnalisisTab from './admin/AnalisisTab';
import StatusTesTab from './admin/StatusTesTab';
import DaftarPesertaTab from './admin/DaftarPesertaTab';
import RilisTokenTab from './admin/RilisTokenTab';
import BankSoalTab from './admin/BankSoalTab';
import RekapSurveyTab from './admin/RekapSurveyTab';

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rekap' | 'rekap_survey' | 'analisis' | 'ranking' | 'bank_soal' | 'data_user' | 'status_tes' | 'kelompok_tes' | 'rilis_token' | 'atur_sesi' | 'atur_gelombang' | 'cetak_absensi' | 'cetak_kartu'>('overview');
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
        case 'cetak_kartu': return "Cetak Kartu Peserta";
        default: return "Dashboard";
    }
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
          <button onClick={() => { setActiveTab('cetak_kartu'); setIsSidebarOpen(false); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition ${activeTab === 'cetak_kartu' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><CreditCard size={20} /> Cetak Kartu</button>
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
                    <p className="text-[7px] font-bold text-slate-800 leading-tight break-words flex-1">{currentUserState.nama_lengkap || currentUserState.username}</p>
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
                {activeTab === 'overview' && <OverviewTab dashboardData={dashboardData} currentUserState={currentUserState} />}
                {activeTab === 'status_tes' && <StatusTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'kelompok_tes' && <KelompokTesTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} />}
                {activeTab === 'atur_sesi' && <AturSesiTab currentUser={currentUserState} students={dashboardData.allUsers || []} refreshData={fetchData} isLoading={isRefreshing} />}
                {activeTab === 'cetak_absensi' && <CetakAbsensiTab currentUser={currentUserState} students={dashboardData.allUsers || []} />}
                {activeTab === 'cetak_kartu' && <CetakKartuTab currentUser={currentUserState} students={dashboardData.allUsers || []} schedules={dashboardData.schedules || []} />}
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
