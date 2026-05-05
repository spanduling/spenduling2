import React, { useState, useEffect } from 'react';
import { User, UserRole, Exam, AppSettings } from './types';
import { db } from './services/database'; // SWITCHED TO REAL DB
import { cacheManager } from './utils/cache'; 
import { ExamInterface } from './components/ExamInterface';
import { AdminDashboard } from './components/AdminDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { StudentFlow } from './components/StudentFlow';
import { BackgroundShapes } from './components/BackgroundShapes';
import { LogIn, Lock, Eye, EyeOff, Calendar, X, AlertTriangle } from 'lucide-react';
import 'katex/dist/katex.min.css';

const UserCircleIcon = ({className, size}: {className?: string, size?: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="10" r="3"></circle>
        <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path>
    </svg>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };
  
  // Schedule Modal State
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedSchedule, setBlockedSchedule] = useState<Exam[]>([]);
  
  // App Settings State
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'UJIAN ONLINE',
    appSubtitle: 'Computer Based Test',
    themeColor: '#2459a9',
    gradientEndColor: '#60a5fa',
    logoStyle: 'circle',
    schoolLogoUrl: '',
    antiCheat: { isActive: true, freezeDurationSeconds: 15, alertText: 'Violation!', enableSound: true },
    showTokenToStudents: false
  });

  useEffect(() => {
    cacheManager.initialize();
    loadSettings();
    restoreSession();
  }, []);

  useEffect(() => {
    const logo = settings.schoolLogoUrl;
    if (logo) {
      const faviconLinks = document.querySelectorAll("link[rel*='icon']");
      faviconLinks.forEach(link => {
        (link as HTMLLinkElement).href = logo;
      });
      
      if (faviconLinks.length === 0) {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = logo;
        document.head.appendChild(newLink);
      }
    }
  }, [settings.schoolLogoUrl]);

  const loadSettings = async () => {
    try {
      const s = await db.getSettings();
      setSettings(s);
      if (s.appName) {
        document.title = `${s.appName} - CBT`;
      }
    } catch (error) {
      console.error("Failed to load settings", error);
    }
  };

  // PERSISTENCE LOGIC: Restore state from storage on reload
  const restoreSession = () => {
      try {
          const savedUser = sessionStorage.getItem('das_user');
          const savedExam = sessionStorage.getItem('das_exam');
          
          if (savedUser) {
              const parsedUser = JSON.parse(savedUser);
              setCurrentUser(parsedUser);
          }
          
          if (savedExam) {
              const parsedExam = JSON.parse(savedExam);
              setActiveExam(parsedExam);
          }
      } catch (e) {
          console.error("Failed to restore session", e);
      }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Request fullscreen immediately on user gesture
    try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => console.warn(err));
        } else if ((document.documentElement as any).webkitRequestFullscreen) { /* Safari */
            (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) { /* IE11 */
            (document.documentElement as any).msRequestFullscreen();
        }
    } catch (err) {
        console.warn("Fullscreen request denied or failed:", err);
    }

    setLoading(true);
    
    try {
      const user = await db.login(loginInput, passwordInput);
      
      if (user) {
        // --- SCHEDULE CHECK LOGIC ---
        if (user.role === UserRole.STUDENT) {
          const allExams = await db.getExams();
          
          // Get exams where this student's school is in schoolAccess OR student has a specific mapping
          const mappedExamIds = user.mappings?.map(m => m.examId) || [];
          const studentSchool = (user.school || '').trim();
          
          const myExams = allExams.filter(e => {
            const isMappedToSchool = e.schoolAccess?.some(s => s.trim() === studentSchool);
            const isMappedToStudent = mappedExamIds.includes(e.id);
            return isMappedToSchool || isMappedToStudent;
          });
          
          // Simple YYYY-MM-DD comparison for "Today" (using local date)
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          // Check if ANY exam is scheduled for today (either via schoolAccess or specific mapping)
          const hasExamToday = myExams.some(e => {
            // Check if scheduled via schoolAccess for today
            const isSchoolScheduledToday = e.schoolAccess?.some(s => s.trim() === studentSchool) && (e.examDate || '').trim() === todayStr;
            if (isSchoolScheduledToday) return true;
            
            // Check if scheduled via specific student mapping for today
            const examMappings = user.mappings?.filter(m => m.examId === e.id) || [];
            if (examMappings.some(m => {
                const mapDate = (m.examDate || '').trim();
                if (mapDate.includes('|')) {
                    const [start, end] = mapDate.split('|');
                    return todayStr >= start && todayStr <= end;
                }
                return mapDate === todayStr;
            })) return true;
            
            return false;
          });

          if (!hasExamToday) {
              // BLOCK LOGIN and Show Schedule
              setBlockedSchedule(myExams);
              setShowBlockedModal(true);
              setLoading(false);
              
              // Exit fullscreen if blocked
              try {
                  if (document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                  }
              } catch (e) {}
              
              return; 
          }
        }

        // 1. Save Session immediately
        sessionStorage.setItem('das_user', JSON.stringify(user));
        setCurrentUser(user);
      } else {
        showToast('Data tidak ditemukan atau Password salah. \nPastikan Username dan Password benar.', 'error');
        // Exit fullscreen on error
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        } catch (e) {}
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Terjadi kesalahan saat login.', 'error');
      // Exit fullscreen on error
      try {
          if (document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
          }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear Session Storage
    sessionStorage.removeItem('das_user');
    sessionStorage.removeItem('das_exam');
    sessionStorage.removeItem('das_student_flow_step'); // Clear flow state too
    sessionStorage.removeItem('das_student_flow_exam');

    cacheManager.clearSession();
    setCurrentUser(null);
    setActiveExam(null);
    setLoginInput('');
    setPasswordInput('');
    loadSettings(); 

    // Exit Fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
    }
  };

  const handleStartExam = async (exam: Exam) => {
      setLoading(true);
      try {
          // Pre-fetch all questions in one go for offline readiness
          const fullExamData = await db.getExamById(exam.id);
          if (fullExamData) {
              // Save Active Exam state including full questions
              sessionStorage.setItem('das_exam', JSON.stringify(fullExamData));
              setActiveExam(fullExamData);
          } else {
              showToast("Gagal mengambil data soal ujian.", "error");
          }
      } catch (err) {
          console.error("Failed to fetch exam questions", err);
          showToast("Koneksi gagal. Tidak dapat mengunduh soal ujian.", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleExamComplete = () => {
      // Clear Active Exam state but keep User logged in
      sessionStorage.removeItem('das_exam');
      setActiveExam(null);
  };

  const loginBgStyle = {
    background: `linear-gradient(to bottom, ${settings.themeColor}, ${settings.gradientEndColor})`
  };

  return (
    <>
      
      {!currentUser ? (
        <div className="min-h-screen relative font-sans overflow-hidden" style={loginBgStyle}>
          
          <BackgroundShapes />

          <header className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                      {settings.ministryLogoUrl && (
                          <div className="bg-white p-1 rounded-full shadow">
                              <img 
                                  src={settings.ministryLogoUrl} 
                                  className="h-10 w-10 object-contain" 
                                  alt="Ministry Logo"
                                  referrerPolicy="no-referrer"
                              />
                          </div>
                      )}
                      <div>
                          <h1 className="text-xl font-extrabold text-white tracking-wide drop-shadow-sm">{settings.appName}</h1>
                          {settings.appSubtitle && <p className="text-xs text-blue-100 opacity-90">{settings.appSubtitle}</p>}
                      </div>
                  </div>
              </div>
          </header>

          <div className="min-h-screen flex items-center justify-center p-4 pt-20">
              <div className="bg-white/95 backdrop-blur-sm p-8 md:p-12 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-white/50 animate-in zoom-in-95 duration-500">
              
              {settings.schoolLogoUrl && (
                  <div className="flex justify-center mb-6">
                      <img 
                          src={settings.schoolLogoUrl} 
                          className="w-40 h-auto object-contain animate-float-slow filter drop-shadow-xl" 
                          alt="School Logo" 
                          referrerPolicy="no-referrer"
                      />
                  </div>
              )}
              
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Selamat Datang</h2>
              <p className="text-gray-500 text-center mb-8 text-sm">Silakan login untuk memulai ujian</p>

              <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                  <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Nomor Peserta / Username</label>
                      <div className="relative">
                          <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                          <input 
                              type="text"
                              placeholder="Nomor Peserta / Username" 
                              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-blue-100 outline-none transition text-gray-700"
                              style={{ borderColor: settings.themeColor }}
                              value={loginInput}
                              onChange={(e) => setLoginInput(e.target.value)}
                              autoComplete="new-password"
                          />
                      </div>
                  </div>
                  
                  <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                      <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                          <input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Password" 
                              className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:ring-4 focus:ring-blue-100 outline-none transition text-gray-700"
                              style={{ borderColor: settings.themeColor }}
                              value={passwordInput}
                              onChange={(e) => setPasswordInput(e.target.value)}
                              autoComplete="new-password"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                      </div>
                  </div>

                  <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full text-white font-bold py-3.5 rounded-lg shadow-lg transition transform active:scale-95 flex items-center justify-center mt-4"
                  style={{ background: `linear-gradient(to right, ${settings.themeColor}, ${settings.gradientEndColor})` }}
                  >
                  {loading ? 'Memuat...' : <><LogIn className="mr-2" size={18}/> Masuk</>}
                  </button>
              </form>
              </div>
          </div>

          <div className="fixed bottom-6 w-full text-center z-20 pointer-events-none display-none print:hidden">
                {settings.footerText && (
                  <span className="inline-block bg-white/80 backdrop-blur rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg border border-white/50" style={{ color: settings.themeColor }}>
                    {settings.footerText}
                  </span>
                )}
          </div>

        </div>
      ) : currentUser.role === UserRole.SUPER_ADMIN ? (
        <SuperAdminDashboard user={currentUser} onLogout={handleLogout} settings={settings} onSettingsChange={refreshSettings} />
      ) : (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PROKTOR) ? (
        <AdminDashboard 
          user={currentUser} 
          onLogout={handleLogout} 
          appName={settings.appName} 
          onSettingsChange={refreshSettings} 
          themeColor={settings.themeColor} 
          settings={settings}
        />
      ) : activeExam ? (
        <ExamInterface 
          user={currentUser} 
          exam={activeExam} 
          onComplete={handleExamComplete} 
          appName={settings.appName}
          themeColor={settings.themeColor}
          settings={settings}
        />
      ) : (
        <StudentFlow 
            user={currentUser} 
            onStartExam={handleStartExam} 
            onLogout={handleLogout} 
            settings={settings}
            onRefreshSettings={refreshSettings}
        />
      )}

      {/* JOS JIS SCHEDULE POPUP MODAL */}
      {showBlockedModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300 relative">
                  {/* Decorative Header */}
                  <div className="h-32 relative" style={{ background: `linear-gradient(to right, ${settings.themeColor}, ${settings.gradientEndColor})` }}>
                      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                           <div className="bg-white p-2 rounded-full shadow-lg">
                               <div className="bg-orange-100 p-3 rounded-full">
                                    <Calendar className="text-orange-600 w-10 h-10" />
                               </div>
                           </div>
                      </div>
                      <button onClick={() => setShowBlockedModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="pt-16 pb-8 px-8 text-center">
                      <h3 className="text-2xl font-extrabold text-gray-800 mb-2">Maaf, Belum Ada Jadwal</h3>
                      <p className="text-gray-500 mb-2 text-sm">Tidak ada ujian yang aktif untuk sekolah Anda hari ini.</p>
                      <div className="flex flex-col items-center gap-1 mb-6">
                          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border">Tanggal: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border">Sekolah: {currentUser?.school || '-'}</span>
                      </div>
                      <p className="text-gray-500 mb-6 text-xs italic">Berikut adalah jadwal ujian Anda yang terdaftar:</p>
                      
                      {blockedSchedule.length > 0 ? (
                          <div className="border rounded-xl overflow-hidden bg-gray-50 text-left max-h-60 overflow-y-auto custom-scrollbar">
                               {blockedSchedule
                                 .sort((a,b) => (a.examDate || '').localeCompare(b.examDate || ''))
                                 .map((ex, idx) => {
                                     const mapping = currentUser?.mappings?.find(m => m.examId === ex.id);
                                     let displayDate = mapping?.examDate || ex.examDate || 'Belum diatur';
                                     if (displayDate.includes('|')) {
                                         const [start, end] = displayDate.split('|');
                                         displayDate = `${start} s/d ${end}`;
                                     }
                                     const displaySession = mapping?.session || ex.session || 'Sesi 1';
                                     
                                     return (
                                       <div key={ex.id} className="p-4 border-b last:border-0 flex justify-between items-center bg-white hover:bg-blue-50 transition">
                                           <div>
                                               <h4 className="font-bold text-gray-800 text-sm">{ex.title}</h4>
                                               <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border">{displayDate}</span>
                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded border border-blue-200 font-bold">{displaySession}</span>
                                               </div>
                                           </div>
                                       </div>
                                     );
                                 })}
                          </div>
                      ) : (
                          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-bold">
                              Belum ada mata ujian yang dimapping untuk sekolah Anda. Hubungi Admin.
                          </div>
                      )}

                      <button 
                        onClick={() => setShowBlockedModal(false)}
                        className="w-full mt-6 py-3 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95"
                        style={{ backgroundColor: settings.themeColor }}
                      >
                          Mengerti
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* CUSTOM TOAST */}
      {toast && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
              <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
                  toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-green-600 border-green-500 text-white'
              }`}>
                  <span className="font-bold text-sm">{toast.message}</span>
              </div>
          </div>
      )}
    </>
  );
};

export default App;
