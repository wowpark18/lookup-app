import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, Mail, Lock, LogIn, UserPlus, Fingerprint, CheckCircle2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInAnonymously, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from 'firebase/auth';
import { saveUserProfile } from '../services/db';
import { getAuthErrorMessage, validateEmail } from '../lib/authUtils';
import { Capacitor } from '@capacitor/core';

export default function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingType, setLoadingType] = useState<'email' | 'google' | 'apple' | 'guest' | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    
    // [코다리 부장] 실시간 로그 기록 함수
    const addLog = (msg: string) => {
        console.log(`[KodariLog] ${msg}`);
        setDebugLogs(prev => [msg, ...prev].slice(0, 5));
    };

    useEffect(() => {
        addLog("Login component mounted");
        window.onerror = (msg) => addLog(`JS Error: ${msg}`);
        
        // [코다리 부장] 화면 전체 클릭 감지기 (레이어 간섭 체크용)
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            addLog(`Tap: ${target.tagName}#${target.id || 'none'}.${target.className || 'none'}`);
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    // Capacitor 환경 체크 (모바일 기기 여부)
    const isNative = Capacitor.isNativePlatform();

    // [코다리 부장] 중복 내비게이션 방지 및 상태 추적을 위한 플래그
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        // 리다이렉트 결과 처리 (모바일 환경 대응)
        const checkRedirectResult = async () => {
            try {
                console.log("[Login] Checking redirect result...");
                setLoadingType('email'); // 잠시 공통 로딩 표시
                
                const result = await Promise.race([
                    getRedirectResult(auth),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Redirect Timeout")), 5000))
                ]) as any;

                if (result) {
                    const user = result.user;
                    console.log("[Login] Redirect login success:", user.email);
                    handleLoginSuccess();
                }
            } catch (error: any) {
                console.log("[Login] Redirect check finished/skipped:", error.message);
            } finally {
                // 초기 체크 후 로딩 해제 (다른 작업에 방해 안되게)
                if (loadingType === 'email') setLoadingType(null);
            }
        };

        checkRedirectResult();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            addLog(`Auth changed: ${user ? 'User detected' : 'No user'}`);
            if (user && !isRedirecting) {
                addLog("Auth detected via listener! Navigating...");
                setIsRedirecting(true);
                handleNavigation();
            }
        });
        return () => unsubscribe();
    }, [navigate, isRedirecting]);

    // [코다리 부장] 절대 실패하지 않는 내비게이션 함수
    const handleNavigation = () => {
        addLog("Attempting navigation to dashboard...");
        
        // 1순위: React Router navigate
        navigate('/dashboard', { replace: true });

        // 2순위: 혹시 모를 앱 지연 대비 (1.5초 후에도 안 넘어가면 강제 리로드 이동)
        setTimeout(() => {
            if (window.location.pathname !== '/dashboard') {
                addLog("Navigation seems delayed. Trying fallback...");
                // window.location.href = '/dashboard'; // SPA에서는 권장되지 않으나 최후의 수단
            }
        }, 1500);
    };

    const handleLoginSuccess = () => {
        addLog("handleLoginSuccess called");
        if (isRedirecting) return;
        
        setIsLoading(false);
        setShowSuccess(true);
        setIsRedirecting(true);
        
        addLog("Setting success timer...");
        setTimeout(() => {
            handleNavigation();
        }, 800); 
    };

    const handleGoogleLogin = async () => {
        addLog('Google login clicked');
        setLoadingType('google');
        setIsLoading(true);
        setErrorMsg('');
        const provider = new GoogleAuthProvider();
        
        // [코다리 부장] 무한 로딩 방지용 타임아웃 (10초)
        const timeout = setTimeout(() => {
            if (isLoading) {
                addLog('Google login timed out');
                setIsLoading(false);
                setLoadingType(null);
                setErrorMsg('로그인 응답이 없습니다. 다시 시도해주세요.');
            }
        }, 10000);

        try {
            if (isNative) {
                addLog('Native: signInWithRedirect starting...');
                // 네이티브는 리다이렉트 후 앱이 재시작되므로 결과는 useEffect에서 처리됨
                await signInWithRedirect(auth, provider);
            } else {
                addLog('Web: signInWithPopup starting...');
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                
                // 배경에서 프로필 저장
                saveUserProfile(user.uid, {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || 'Google User',
                    photoURL: user.photoURL,
                    provider: 'google',
                    updatedAt: new Date().toISOString()
                }).catch(e => addLog(`Profile save err: ${e.message}`));
                
                clearTimeout(timeout);
                handleLoginSuccess();
            }
        } catch (error: any) {
            clearTimeout(timeout);
            addLog(`Google Err: ${error.code}`);
            console.error("Google 로그인 오류:", error);
            setErrorMsg(getAuthErrorMessage(error.code));
            setIsLoading(false);
            setLoadingType(null);
        }
    };

    const handleAppleLogin = () => {
        addLog('Apple login clicked (Pending)');
        // 정식 계정 등록 전까지 안내 메시지로 대체
        setErrorMsg('Apple 로그인은 정식 출시 버전에서 제공될 예정입니다. 구글 로그인이나 이메일 로그인을 이용해주세요! 🍏');
        
        // 버튼 로딩 상태가 걸리지 않도록 즉시 해제
        setIsLoading(false);
        setLoadingType(null);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[Login] Email auth submitted, isLogin:', isLogin);
        
        if (!validateEmail(email)) {
            setErrorMsg('올바른 이메일 형식을 입력해주세요.');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('비밀번호는 최소 6자리 이상이어야 합니다.');
            return;
        }

        setLoadingType('email');
        setIsLoading(true);
        setErrorMsg('');

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                console.log('[Login] Email sign-in successful');
                handleLoginSuccess();
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log('[Login] Email sign-up successful');
                saveUserProfile(userCredential.user.uid, {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    name: email.split('@')[0], 
                    provider: 'email',
                    createdAt: new Date().toISOString()
                }).catch(e => console.error("[Background] Email profile save failed:", e));
                handleLoginSuccess();
            }
        } catch (error: any) {
            console.error("[Login] Email auth error:", error);
            setErrorMsg(getAuthErrorMessage(error.code));
            setIsLoading(false);
            setLoadingType(null);
        }
    };

    const handleGuestLogin = async () => {
        console.log('[Login] Guest login button clicked');
        setLoadingType('guest');
        setIsLoading(true);
        setErrorMsg('');
        
        try {
            console.log('[Login] Calling signInAnonymously...');
            const userCredential = await Promise.race([
                signInAnonymously(auth),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout")), 5000))
            ]) as any;

            addLog("Guest login successful!");
            
            // [코다리 부장] 저장을 기다리지 않고 배경에서 처리
            saveUserProfile(userCredential.user.uid, {
                uid: userCredential.user.uid,
                email: '게스트',
                name: 'Guest User',
                isGuest: true,
                provider: 'anonymous',
                createdAt: new Date().toISOString()
            }).catch(e => addLog(`Save fail: ${e.message}`));
            
            addLog("Calling handleLoginSuccess...");
            handleLoginSuccess();
        } catch (error: any) {
            addLog(`Login Error: ${error.message}`);
            if (error.message === "Auth Timeout") {
                setErrorMsg('네트워크 연결이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
            } else {
                setErrorMsg('게스트 로그인에 실패했습니다. 관리자에게 문의하세요.');
            }
            setIsLoading(false);
            setLoadingType(null);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            {/* Background elements - pointer-events: none is critical here to prevent blocking clicks */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(157, 78, 221, 0.1) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(0, 255, 204, 0.05) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <AnimatePresence>
                {showSuccess ? (
                    <motion.div 
                        key="success-animation"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        style={{ position: 'absolute', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
                    >
                        <div style={{ background: 'var(--primary)', padding: '24px', borderRadius: '30px', boxShadow: '0 20px 40px var(--primary-glow)' }}>
                            <CheckCircle2 size={60} color="white" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>환영합니다!</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>스타일 라이프를 시작합니다.</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="login-form-container"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6 }}
                        className="glass-panel" 
                        style={{ width: '100%', maxWidth: '420px', padding: '40px 30px', borderRadius: '40px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                        <motion.div 
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            style={{ background: 'var(--primary)', padding: '16px', borderRadius: '24px', marginBottom: '24px', boxShadow: '0 10px 30px var(--primary-glow)' }}
                        >
                            <ScanFace size={40} color="white" />
                        </motion.div>
                        
                        <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-1.5px' }}>Look-UP</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '32px', textAlign: 'center', fontWeight: 600 }}>
                            AI 스타일리스트가 제안하는 완벽한 핏
                        </p>

                        {errorMsg && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ width: '100%', padding: '14px', background: 'rgba(255, 59, 48, 0.08)', color: '#ff3b30', fontSize: '13px', borderRadius: '16px', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(255,59,48,0.1)', fontWeight: 600 }}
                            >
                                {errorMsg}
                            </motion.div>
                        )}

                        <form onSubmit={handleAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="email"
                                    placeholder="이메일 주소"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    style={{
                                        width: '100%', padding: '18px 18px 18px 52px', background: 'rgba(0, 0, 0, 0.03)', border: '1px solid var(--border-glass)',
                                        borderRadius: '20px', color: 'var(--text-main)', fontSize: '15px', outline: 'none', transition: 'all 0.3s'
                                    }}
                                    required
                                />
                            </div>
                            
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="password"
                                    placeholder="비밀번호"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    style={{
                                        width: '100%', padding: '18px 18px 18px 52px', background: 'rgba(0, 0, 0, 0.03)', border: '1px solid var(--border-glass)',
                                        borderRadius: '20px', color: 'var(--text-main)', fontSize: '15px', outline: 'none', transition: 'all 0.3s'
                                    }}
                                    required
                                />
                            </div>

                            <motion.button 
                                whileTap={{ scale: 0.98 }}
                                type="submit" 
                                disabled={isLoading}
                                style={{
                                    marginTop: '8px', width: '100%', padding: '18px', borderRadius: '20px', 
                                    background: 'linear-gradient(135deg, var(--primary), #b06ab3)', 
                                    color: 'white', fontWeight: 800, fontSize: '17px', border: 'none', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    boxShadow: '0 10px 25px var(--primary-glow)', 
                                    cursor: isLoading ? 'not-allowed' : 'pointer', 
                                    opacity: isLoading ? 0.8 : 1
                                }}
                            >
                                {isLoading && loadingType === 'email' ? (
                                    <div className="spinner" style={{ width: '20px', height: '20px' }} />
                                ) : (
                                    <>
                                        {isLogin ? <LogIn size={20}/> : <UserPlus size={20}/>}
                                        <span>{isLogin ? '로그인' : '회원가입 시작하기'}</span>
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Social Login UI */}
                        <div style={{ width: '100%', marginTop: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
                                <span style={{ margin: '0 16px', fontSize: '13px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.5px' }}>간편 로그인</span>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                                <motion.button 
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isLoading}
                                    style={{ 
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        padding: '14px', borderRadius: '18px', background: '#fff', 
                                        border: '1px solid #eee', cursor: isLoading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)', position: 'relative'
                                    }}
                                    onClick={handleGoogleLogin}
                                >
                                    {isLoading && loadingType === 'google' ? (
                                        <div className="spinner-primary" style={{ width: '20px', height: '20px' }} />
                                    ) : (
                                        <>
                                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px', position: 'absolute', left: '20px' }} />
                                            <span style={{ color: '#555', fontWeight: 700, fontSize: '15px' }}>Google로 계속하기</span>
                                        </>
                                    )}
                                </motion.button>

                                <motion.button 
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isLoading}
                                    style={{ 
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        padding: '14px', borderRadius: '18px', background: '#000', 
                                        border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative'
                                    }}
                                    onClick={handleAppleLogin}
                                >
                                    {isLoading && loadingType === 'apple' ? (
                                        <div className="spinner" style={{ width: '20px', height: '20px' }} />
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 384 512" style={{ width: '18px', fill: 'white', position: 'absolute', left: '22px' }}>
                                                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 21.8-88.5 21.8-11.4 0-51.1-22.2-84.6-21.8-54.1.6-100.8 33.4-124 93.9s-12.1 123.8 33.6 189c44.9 65.1 82.3 125.1 114.6 125.1 31.4 0 45.4-23.8 90.8-23.8 45 0 58.2 24 90.4 24 33.6 0 71.1-60.1 115.6-125.1 19.3-28.2 27.6-54.3 27.9-55.7l-.1-.6c-.2-.1-67-25-67.4-93.5zM249.1 81.3c26.5-32.2 23.5-60.9 22.1-67.4-25.9 1.1-51.2 16.2-66.2 33.7-15.7 18.5-21.5 44.8-19.1 66.2 3.8 1.1 27.1 2.2 63.2-32.5z"/>
                                            </svg>
                                            <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Apple로 계속하기</span>
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>

                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '32px', gap: '8px' }}>
                            <button 
                                onClick={handleGuestLogin}
                                disabled={isLoading}
                                style={{
                                    padding: '8px 16px', borderRadius: '12px', background: 'transparent', color: 'var(--text-muted)', 
                                    fontWeight: 600, fontSize: '14px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', 
                                    cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1
                                }}
                            >
                                {isLoading && loadingType === 'guest' ? (
                                  <div className="spinner-primary" style={{ width: '14px', height: '14px' }} />
                                ) : (
                                  <>
                                    <Fingerprint size={16} />
                                    게스트로 둘러보기
                                  </>
                                )}
                            </button>
                            <div style={{ width: '1px', height: '14px', background: 'var(--border-glass)', alignSelf: 'center' }} />
                            <button 
                                onClick={() => {
                                    console.log('[Login] Toggle sign-up/login clicked');
                                    setIsLogin(!isLogin);
                                }} 
                                disabled={isLoading}
                                style={{ padding: '8px 16px', fontSize: '14px', color: 'var(--primary)', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', border: 'none', background: 'transparent', opacity: isLoading ? 0.6 : 1 }}
                            >
                                {isLogin ? '회원가입' : '로그인으로 변경'}
                            </button>
                        </div>
                        
                        {/* [코다리 부장] 상태 모니터링용 디버그 정보 (대표님 확인용) */}
                        <div style={{ position: 'fixed', bottom: '10px', left: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', zIndex: 1000 }}>
                            <div style={{ background: 'rgba(0,0,0,0.7)', padding: '8px 12px', borderRadius: '12px', marginBottom: '8px', width: '100%', maxWidth: '300px' }}>
                                {debugLogs.map((log, i) => (
                                    <p key={i} style={{ fontSize: '9px', color: '#00ffcc', margin: 0, fontFamily: 'monospace' }}>{`> ${log}`}</p>
                                ))}
                            </div>
                            <p style={{ fontSize: '10px', color: 'rgba(0,0,0,0.4)', marginBottom: '4px' }}>
                                Status: {isLoading ? `Loading(${loadingType})` : 'Idle'} | Redirect: {isRedirecting ? 'YES' : 'NO'}
                            </p>
                            
                            <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
                                <button 
                                    onClick={() => handleNavigation()}
                                    style={{ 
                                        padding: '8px 16px', borderRadius: '10px', 
                                        background: 'var(--primary)', color: 'white', 
                                        fontSize: '11px', fontWeight: 'bold', border: 'none',
                                        boxShadow: '0 4px 10px var(--primary-glow)',
                                    }}
                                >
                                    강제 이동 🚀
                                </button>
                                <button 
                                    onClick={() => {
                                        auth.signOut();
                                        window.location.reload();
                                    }}
                                    style={{ 
                                        padding: '8px 16px', borderRadius: '10px', 
                                        background: '#666', color: 'white', 
                                        fontSize: '11px', fontWeight: 'bold', border: 'none',
                                    }}
                                >
                                    초기화 🔄
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
