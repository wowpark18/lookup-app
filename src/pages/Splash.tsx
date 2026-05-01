import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Splash() {
    const navigate = useNavigate();
    const [showFallback, setShowFallback] = useState(false);

    useEffect(() => {
        let navigated = false;
        let navTimer: any = null;

        const handleNavigation = (user: any) => {
            if (navigated) return;
            navigated = true;
            if (user) {
                console.log('[Splash] 이미 로그인된 사용자입니다:', user.email);
                navigate('/dashboard', { replace: true });
            } else {
                console.log('[Splash] 로그인이 필요한 사용자입니다.');
                navigate('/login', { replace: true });
            }
        };

        // 웅장한 브랜드 노출을 위해 최소 2초 대기 후 상태에 따라 이동
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('[Splash] Auth state changed:', user ? 'Logged In' : 'Logged Out');
            if (navTimer) clearTimeout(navTimer);
            
            navTimer = setTimeout(() => {
                handleNavigation(user);
            }, 2000);
        });

        // [코다리 부장] 4초 후에도 반응 없으면 버튼이라도 띄워줌
        const fallbackTimer = setTimeout(() => {
            if (!navigated) setShowFallback(true);
        }, 4000);

        // [코다리 부장] 네트워크 문제 등으로 인증 체크가 무한 대기되는 현상 방지 (6초 후 강제 이동 시도 및 버튼 노출)
        const safetyTimer = setTimeout(() => {
            if (!navigated) {
                console.warn('[Splash] 인증 확인 지연으로 인해 강제 이동을 시도합니다.');
                handleNavigation(null);
            }
        }, 6000);

        return () => {
            unsubscribe();
            if (navTimer) clearTimeout(navTimer);
            clearTimeout(fallbackTimer);
            clearTimeout(safetyTimer);
        };
    }, [navigate]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-screen relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
            {/* Premium Mesh Gradient Background */}
            <motion.div
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.6, 0.4],
                    rotate: [0, 90, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute rounded-full z-0 pointer-events-none"
                style={{ 
                    width: '70vw', 
                    height: '70vw', 
                    background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', 
                    top: '5%', 
                    left: '-15%',
                    filter: 'blur(40px)'
                }}
            />
            <motion.div
                animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.5, 0.3],
                    rotate: [0, -90, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute rounded-full z-0 pointer-events-none"
                style={{ 
                    width: '90vw', 
                    height: '90vw', 
                    background: 'radial-gradient(circle, var(--secondary-glow) 0%, transparent 70%)', 
                    bottom: '-15%', 
                    right: '-15%',
                    filter: 'blur(60px)'
                }}
            />

            {/* Central Animated Logo Container */}
            <motion.div
                initial={{ y: 30, opacity: 0, filter: 'blur(10px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-center z-10 flex flex-col items-center w-full px-6"
            >
                {/* Glowing Glass Icon */}
                <motion.div 
                    className="flex items-center justify-center rounded-full relative mb-8 animate-float"
                    style={{ 
                        width: '100px', 
                        height: '100px', 
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.4))',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 20px 40px var(--primary-glow), inset 0 0 0 1px rgba(255,255,255,0.5)',
                        zIndex: 2
                    }}
                >
                    <div className="absolute inset-0 rounded-full animate-pulse" style={{ zIndex: -1 }}></div>
                    <span 
                        className="material-symbols-outlined text-gradient" 
                        style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}
                    >
                        auto_fix_high
                    </span>
                </motion.div>
                
                <h1 className="text-gradient" style={{ fontSize: '56px', fontWeight: '900', letterSpacing: '-2px', marginBottom: '16px', lineHeight: '1' }}>
                    LOOK-UP
                </h1>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.2))' }}></div>
                    <p style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '700', letterSpacing: '6px', textTransform: 'uppercase', opacity: 0.8 }}>
                        AI Fashion Director
                    </p>
                    <div style={{ width: '40px', height: '1px', background: 'linear-gradient(270deg, transparent, rgba(0,0,0,0.2))' }}></div>
                </div>

                <AnimatePresence>
                    {showFallback && (
                        <motion.button
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/login')}
                            className="glass-button"
                            style={{
                                marginTop: '48px',
                                padding: '16px 32px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
                            직접 시작하기
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
