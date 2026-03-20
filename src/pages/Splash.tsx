import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Wand2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Splash() {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    navigate('/dashboard');
                } else {
                    navigate('/login');
                }
            });
            return () => unsubscribe();
        }, 2000); // 2초 후 인증 상태 확인

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.8 }}
            style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-dark)',
                backgroundImage: 'linear-gradient(180deg, rgba(7,5,15,1) 0%, rgba(21,15,36,1) 100%)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Magic Background Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(157, 78, 221, 0.4) 0%, rgba(255, 0, 110, 0.1) 40%, rgba(157, 78, 221, 0) 70%)',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    zIndex: 1,
                    filter: 'blur(20px)'
                }}
            />

            {/* Animated Logo Container */}
            <motion.div
                initial={{ y: 20, scale: 0.8 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                style={{
                    position: 'relative',
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 5,
                    marginBottom: '24px'
                }}
            >
                {/* Spinning Outer Ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '2px dashed rgba(255, 255, 255, 0.2)',
                        borderTopColor: 'var(--secondary)',
                        borderBottomColor: 'var(--primary)'
                    }}
                />

                {/* Inner Glass Circle */}
                <div style={{
                    width: '80%',
                    height: '80%',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(157, 78, 221, 0.5)'
                }}>
                    <motion.div
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Wand2 size={40} color="white" />
                    </motion.div>
                </div>

                {/* Floating Sparkles */}
                <motion.div
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], x: [0, 20, 0], y: [0, -20, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    style={{ position: 'absolute', top: '-10px', right: '-10px' }}
                >
                    <Sparkles size={24} color="var(--secondary)" />
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                    textAlign: 'center',
                    zIndex: 5
                }}
            >
                <h1 className="outfit text-gradient" style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '4px', marginBottom: '12px' }}>LOOK-UP</h1>
                <p style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 400, letterSpacing: '1px', marginBottom: '8px' }}>
                    AI Fashion Director
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                    <p style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600, letterSpacing: '2px' }}>AR MAGIC MIRROR</p>
                    <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                </div>
            </motion.div>
        </motion.div>
    );
}
