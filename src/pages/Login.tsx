import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanFace, Mail, Lock, LogIn, UserPlus, Fingerprint } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { saveUserProfile } from '../services/db';

export default function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                navigate('/dashboard');
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // 새 사용자 프로필 데이터베이스 생성
                await saveUserProfile(userCredential.user.uid, {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    name: email.split('@')[0], 
                });
                navigate('/dashboard');
            }
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || '인증에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setIsLoading(true);
        try {
            const userCredential = await signInAnonymously(auth);
            await saveUserProfile(userCredential.user.uid, {
                uid: userCredential.user.uid,
                email: '게스트',
                name: 'Guest User',
            });
            navigate('/dashboard');
        } catch (error: any) {
            console.error(error);
            setErrorMsg('게스트 로그인에 실패했습니다. 관리자에게 문의하세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Background elements */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(157, 78, 221, 0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(0, 255, 204, 0.1) 0%, transparent 70%)', filter: 'blur(40px)' }} />

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="glass-panel" 
                style={{ width: '90%', maxWidth: '400px', padding: '40px 30px', borderRadius: '24px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
                <div style={{ background: 'rgba(157, 78, 221, 0.15)', padding: '16px', borderRadius: '50%', marginBottom: '24px', boxShadow: '0 0 20px rgba(157, 78, 221, 0.3)' }}>
                    <ScanFace size={40} color="var(--primary)" />
                </div>
                
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginBottom: '8px', letterSpacing: '-0.5px' }}>Look-UP</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px', textAlign: 'center' }}>
                    나만의 3D 인공지능 스타일리스트
                </p>

                {errorMsg && (
                    <div style={{ width: '100%', padding: '12px', background: 'rgba(255, 59, 48, 0.15)', color: '#ff3b30', fontSize: '13px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Mail size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="email"
                            placeholder="이메일"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%', padding: '16px 16px 16px 48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px', color: 'white', fontSize: '15px', outline: 'none', transition: 'border-color 0.3s'
                            }}
                            required
                        />
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%', padding: '16px 16px 16px 48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px', color: 'white', fontSize: '15px', outline: 'none', transition: 'border-color 0.3s'
                            }}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        style={{
                            marginTop: '8px', width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--primary)', color: 'white', 
                            fontWeight: 700, fontSize: '16px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 15px rgba(157, 78, 221, 0.4)', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLogin ? <LogIn size={20}/> : <UserPlus size={20}/>}
                        {isLoading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
                    </button>
                </form>

                <div style={{ width: '100%', display: 'flex', alignItems: 'center', margin: '24px 0', opacity: 0.5 }}>
                    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, white)' }} />
                    <span style={{ margin: '0 12px', fontSize: '12px', color: 'white' }}>또는</span>
                    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, white)' }} />
                </div>

                <button 
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    style={{
                        width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', 
                        fontWeight: 600, fontSize: '15px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                    }}
                >
                    <Fingerprint size={20} color="var(--secondary)" />
                    게스트(비회원)로 둘러보기
                </button>

                <p 
                    onClick={() => setIsLogin(!isLogin)} 
                    style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                </p>
            </motion.div>
        </div>
    );
}
