import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot } from 'lucide-react';
import { chatWithGuardian } from '../services/ai';
import { getWardrobeItems, getUserProfile, type UserProfile } from '../services/db';
import { auth } from '../lib/firebase';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: '당신의 패션 사감 요정입니다. 오늘 차림새가 그게 뭔가요? 제가 하나하나 깐깐하게 점검해 드릴 테니 각오하세요! 🧚‍♀️✨',
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (auth.currentUser) {
                const data = await getUserProfile(auth.currentUser.uid);
                setProfile(data);
            }
        };
        loadProfile();
    }, []);

    // [개선] 바텀 네비게이션 숨김 및 뷰포트 높이 대응
    const [viewportHeight, setViewportHeight] = useState('85dvh');

    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                // 키보드가 올라오면 visualViewport.height가 줄어듭니다.
                // 전쳬 뷰포트 대비 비율로 계산하거나 픽셀값을 직접 사용합니다.
                const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.8;
                setViewportHeight(isKeyboardOpen ? `${window.visualViewport.height - 20}px` : '85dvh');
            }
        };

        window.visualViewport?.addEventListener('resize', handleResize);
        
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            handleResize(); // 초기 체크
            const bottomNav = document.querySelector('nav');
            if (bottomNav) {
                bottomNav.style.opacity = '0';
                bottomNav.style.pointerEvents = 'none';
                bottomNav.style.transform = 'translate(-50%, 100%)';
                bottomNav.style.transition = 'all 0.3s ease';
            }
        } else {
            document.body.style.overflow = 'auto';
            const bottomNav = document.querySelector('nav');
            if (bottomNav) {
                bottomNav.style.opacity = '1';
                bottomNav.style.pointerEvents = 'auto';
                bottomNav.style.transform = 'translate(-50%, 0)';
            }
        }
        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            document.body.style.overflow = 'auto';
            const bottomNav = document.querySelector('nav');
            if (bottomNav) {
                bottomNav.style.opacity = '1';
                bottomNav.style.pointerEvents = 'auto';
                bottomNav.style.transform = 'translate(-50%, 0)';
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const uid = auth.currentUser?.uid || '';
            const wardrobe = uid ? await getWardrobeItems(uid) : [];
            const personalColor = localStorage.getItem('personal_color') || '미설정';
            const localWeather = localStorage.getItem('last_weather');
            const weatherDesc = localWeather ? JSON.parse(localWeather).description : "선선한 맑은 날씨 (18도)"; 

            const aiResponse = await chatWithGuardian(userMsg.content, {
                wardrobe,
                personalColor,
                weather: weatherDesc,
                profile: profile || undefined
            });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error("사감 요정 응답 오류:", err);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "흥, 제 회로가 잠시 꼬였군요. 다시 말해봐요! ✨",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating FAB */}
            {!isOpen && (
                <motion.button
                    drag
                    dragMomentum={false}
                    dragConstraints={{ left: -300, right: 0, top: -600, bottom: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9, cursor: 'grabbing' }}
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed', bottom: '260px', right: '16px',
                        width: '60px', height: '60px', borderRadius: '20px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        boxShadow: '0 8px 32px rgba(157, 78, 221, 0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid rgba(255,255,255,0.2)', zIndex: 20000, cursor: 'grab',
                        touchAction: 'none'
                    }}
                >
                    <Bot color="white" size={28} />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{ position: 'absolute', top: -4, right: -4, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00ff00', border: '2px solid white', boxShadow: '0 0 10px rgba(0,255,0,0.5)' }}
                    />
                </motion.button>
            )}

            {/* Chat Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 10000,
                            backgroundColor: 'var(--bg-overlay)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Backdrop Click */}
                        <div onClick={() => setIsOpen(false)} style={{ position: 'absolute', inset: 0 }} />

                        {/* Chat Container */}
                        <motion.div
                            initial={{ y: '100%', x: '-50%', opacity: 0 }}
                            animate={{ y: 0, x: '-50%', opacity: 1 }}
                            exit={{ y: '100%', x: '-50%', opacity: 0 }}
                            style={{
                                width: '100%', maxWidth: '440px', 
                                height: viewportHeight, 
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border-glass)',
                                borderTopLeftRadius: '32px', borderTopRightRadius: '32px',
                                overflow: 'hidden',
                                position: 'fixed', bottom: 0, 
                                left: '50%',
                                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
                                zIndex: 10001,
                                display: 'flex', flexDirection: 'column',
                                transition: 'height 0.2s ease-out'
                            }}
                        >
                            {/* Standardized Header */}
                            <div style={{ 
                                padding: 'calc(16px + env(safe-area-inset-top, 0px)) 24px 16px', 
                                background: 'linear-gradient(90deg, #9d4edd, #ff4d97)', 
                                color: 'white', 
                                display: 'grid',
                                gridTemplateColumns: '40px 1fr 40px',
                                alignItems: 'center'
                            }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Bot size={24} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 className="outfit" style={{ fontSize: '15px', fontWeight: 900, margin: 0, letterSpacing: '1px' }}>FASHION GUARDIAN</h3>
                                    <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 600 }}>LOOK-UP AI ASSISTANT</span>
                                </div>
                                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'flex-end' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Messages area */}
                            <div ref={scrollRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'transparent' }}>
                                {messages.map(msg => (
                                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{
                                            maxWidth: '85%', padding: '14px 18px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-app)',
                                            color: msg.role === 'user' ? '#fff' : 'var(--text-main)',
                                            border: '1px solid var(--border-glass)',
                                            boxShadow: msg.role === 'user' ? '0 4px 12px var(--primary-glow)' : '0 2px 8px rgba(0,0,0,0.02)',
                                            fontSize: '14px', lineHeight: 1.6, fontWeight: 500
                                        }}>
                                            {msg.content}
                                        </div>
                                        <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px', fontWeight: 600 }}>
                                            {msg.role === 'assistant' ? '사감 요정 | ' : 'ME | '}
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderRadius: '18px', background: 'var(--bg-app)', border: '1px solid var(--border-glass)', width: 'fit-content' }}>
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                                    </div>
                                )}
                            </div>

                            {/* Input area - Standardized with padding for safe area if needed */}
                            <div style={{ padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', backgroundColor: 'transparent', borderTop: '1px solid var(--border-glass)' }}>
                                <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-app)', padding: '8px 16px', borderRadius: '16px', alignItems: 'center', border: '1px solid var(--border-glass)' }}>
                                    <input
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                                        placeholder="사감 요정에게 물어보세요..."
                                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}
                                    />
                                    <button onClick={handleSend} style={{ background: 'var(--primary)', border: 'none', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px var(--primary-glow)' }}>
                                        <Send size={18} color="white" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
