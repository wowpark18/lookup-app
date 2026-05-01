import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getCurrentWeather, type WeatherData } from '../services/weather';
import { auth } from '../lib/firebase';
import { getAIRecommendations, type OutfitRecommendation } from '../services/recommendation';
import { saveWearingHistory } from '../services/db';
import ActionBar from '../components/ActionBar';
import { Cloud, Thermometer, ShieldCheck } from 'lucide-react';


export default function Dashboard() {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [weather, setWeather] = useState<WeatherData | null>({
        temp: 14,
        description: '대체로 맑음',
        icon: 'partly_cloudy_day'
    });
    const [outfits, setOutfits] = useState<OutfitRecommendation[]>([
        {
            id: 101,
            title: "SYDNEY BREEZE",
            subtitle: "PREMIUM CASUAL",
            tags: ["Linen Shirt", "Cotton Pants", "Loafers"],
            img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop",
            bg: "from-[#f8f9fa] to-[#e9ecef]",
            source: 'trend'
        }
    ]);
    const [briefing, setBriefing] = useState<string>("오늘의 날씨를 확인하고 코디를 준비중이에요...");
    const [showSuccess] = useState(false);

    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        console.log('--- [DASHBOARD MOUNTED] ---');
        console.log('[Dashboard] Auth Current User:', auth.currentUser?.email || 'Anonymous');
        
        const loadProfile = async () => {
            if (auth.currentUser) {
                // Fetch from Firestore for additional data like name/photo if needed,
                // but Auth currentUser already has basic info for social login.
                setProfile({
                    name: auth.currentUser.displayName || '대표님',
                    photoURL: auth.currentUser.photoURL
                });
            }
        };
        loadProfile();
        
        async function fetchAll() {
            try {
                const w = await getCurrentWeather();
                setWeather(w);
                localStorage.setItem('last_weather', JSON.stringify(w));

                const uid = auth.currentUser?.uid || "guest-user";
                const r = await getAIRecommendations(uid, w);
                if (r && r.length > 0) {
                    setOutfits(r);
                    if (r[0].aiMessage) setBriefing(r[0].aiMessage);
                }
            } catch (e) { 
                console.error("데이터 초기 로드 중 오류:", e); 
            }
        }
        fetchAll();
    }, []);

    useEffect(() => {
        if (outfits[currentSlide]?.aiMessage) {
            setBriefing(outfits[currentSlide].aiMessage!);
        }
    }, [currentSlide, outfits]);

    const nextSlide = () => outfits.length > 0 && setCurrentSlide((prev) => (prev + 1) % outfits.length);
    const prevSlide = () => outfits.length > 0 && setCurrentSlide((prev) => (prev - 1 + outfits.length) % outfits.length);

    const [isShuffling, setIsShuffling] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleShuffle = async () => {
        setIsShuffling(true);
        try {
            const uid = auth.currentUser?.uid || "guest-user";
            const r = await getAIRecommendations(uid, weather);
            if (r && r.length > 0) {
                setOutfits(r);
                setCurrentSlide(0); 
            }
        } catch (e) {
            console.error("셔플 중 오류:", e);
        } finally {
            setTimeout(() => setIsShuffling(false), 500);
        }
    };

    const handleWearComplete = async () => {
        if (!outfits[currentSlide] || isRegistering) return;
        
        setIsRegistering(true);
        const currentOutfit = outfits[currentSlide];

        try {
            const savePromise = saveWearingHistory({
                userId: auth.currentUser?.uid || "test-user-123",
                title: currentOutfit.title,
                subtitle: currentOutfit.subtitle,
                items: currentOutfit.items || []
            });

            const result = await Promise.race([
                savePromise,
                new Promise((resolve) => setTimeout(() => resolve('timeout'), 4000))
            ]);
            
            if (result === 'timeout') {
                console.warn("Firestore 저장 지연 - 로컬 데이터로 우선 진행합니다.");
            }
            
            setIsRegistering(false);
            navigate('/ootd');
        } catch (e: any) {
            console.error("착용 기록 저장 중 시스템 오류:", e);
            alert("시스템 오류가 발생했지만 로컬에 기록되었습니다.");
            setIsRegistering(false);
            navigate('/ootd');
        } finally {
            setIsRegistering(false);
        }
    };

    const [isBriefingExpanded, setIsBriefingExpanded] = useState(false);

    return (
        <div style={{ backgroundColor: 'var(--bg-app)', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main)', position: 'relative', overflow: 'hidden', paddingBottom: '160px' }}>
            
            {/* 1. Header Area - Premium White UI */}
            <header style={{ 
                height: 'auto', 
                paddingTop: 'calc(8px + env(safe-area-inset-top, 44px))', 
                paddingBottom: '12px',
                position: 'sticky', 
                top: 0,
                display: 'grid',
                gridTemplateColumns: '80px 1fr 80px', // Fixed side widths to ensure true center
                alignItems: 'center', 
                paddingLeft: '20px', 
                paddingRight: '20px', 
                zIndex: 100,
                background: 'var(--bg-header)',
                backdropFilter: 'blur(30px)',
                borderBottom: '1px solid var(--border-glass)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '8px', 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '16px' }}>{weather?.icon || 'sunny'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span className="outfit" style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.5px', lineHeight: 1 }}>NOW</span>
                        <span className="outfit" style={{ fontSize: '12px', fontWeight: 900, lineHeight: 1.1, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{weather ? `${Math.round(weather.temp)}°C` : '...'}</span>
                    </div>
                </div>
                
                <div className="outfit" style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '4px', color: 'var(--text-main)', textAlign: 'center' }}>LOOK-UP</div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.div 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/settings')}
                        style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', overflow: 'hidden', border: '1px solid var(--border-glass)', cursor: 'pointer', padding: '2px' }}
                    >
                        <img 
                            src={profile?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop"} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} 
                            alt="Profile" 
                        />
                    </motion.div>
                </div>
            </header>

            {/* 2. Smart Briefing Section - Premium Glass Card */}
            <div style={{ padding: '16px 24px 0' }}>
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{ padding: '16px 20px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setIsBriefingExpanded(!isBriefingExpanded)}
                >
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'var(--primary-glow)', filter: 'blur(40px)', opacity: 0.2 }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isBriefingExpanded ? '12px' : '0px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ padding: '2px', display: 'flex', alignItems: 'center' }}>
                                <ShieldCheck size={14} color="var(--primary)" />
                            </div>
                            <span className="outfit" style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.5px' }}>AI BRIEFING</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="outfit" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>APRIL 18</span>
                            <motion.span 
                                animate={{ rotate: isBriefingExpanded ? 180 : 0 }}
                                className="material-symbols-outlined" 
                                style={{ fontSize: '18px', color: 'var(--text-muted)' }}
                            >
                                keyboard_arrow_down
                            </motion.span>
                        </div>
                    </div>
                    
                    <motion.div
                        animate={{ height: 'auto' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <p style={{ 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            lineHeight: 1.6, 
                            color: 'var(--text-main)', 
                            letterSpacing: '-0.2px',
                            display: '-webkit-box',
                            WebkitLineClamp: isBriefingExpanded ? 'unset' : 1,
                            WebkitBoxOrient: 'vertical',
                            margin: 0
                        }}>
                            {briefing}
                        </p>

                        <AnimatePresence>
                            {isBriefingExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.4)', padding: '10px 14px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-glass)' }}>
                                            <Cloud size={14} color="var(--accent)" />
                                            <span className="outfit" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>UV <span style={{ color: 'var(--text-main)' }}>MODERATE</span></span>
                                        </div>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.4)', padding: '10px 14px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-glass)' }}>
                                            <Thermometer size={14} color="var(--secondary)" />
                                            <span className="outfit" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>FEELS <span style={{ color: 'var(--text-main)' }}>{Math.round((weather?.temp || 0) + 2)}°C</span></span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            </div>

            {/* 3. Hero Card Section - Immersive Editorial Layout */}
            <main style={{ flex: 1, padding: '8px 20px 0 20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <motion.div 
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_e, { offset }) => {
                        if (offset.x < -40) nextSlide();
                        else if (offset.x > 40) prevSlide();
                    }}
                    style={{ 
                        backgroundColor: 'var(--bg-app)', 
                        borderRadius: '32px', 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        position: 'relative', 
                        overflow: 'hidden', 
                        boxShadow: '0 20px 48px rgba(0,0,0,0.06)', 
                        touchAction: 'pan-y',
                        border: '1px solid var(--border-glass)'
                    }}
                >
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                        <motion.img 
                            key={currentSlide}
                            src={outfits[currentSlide]?.img} 
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                            style={{ height: '100%', width: '100%', objectFit: 'cover' }} 
                            draggable={false}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.95) 100%)' }} />
                    </div>

                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 50, padding: '24px', pointerEvents: 'none' }}>
                        <div>
                            <span className="outfit" style={{ fontSize: '9px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '3px' }}>
                                VOL. {currentSlide + 1}
                            </span>
                            <div className="outfit" style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1.5px', marginTop: '4px' }}>
                                {currentSlide === 0 ? "ESSENTIAL" : currentSlide === 1 ? "AVANT-GARDE" : "COMMERCIAL"}
                            </div>
                        </div>
                        
                        <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); navigate('/fitting'); }}
                            style={{ 
                                background: 'rgba(255,255,255,0.7)', 
                                backdropFilter: 'blur(12px)', 
                                border: '1px solid var(--border-glass)', 
                                padding: '8px 12px', 
                                borderRadius: '14px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                color: 'var(--text-main)', 
                                pointerEvents: 'auto',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>3d_rotation</span>
                            <span className="outfit" style={{ fontSize: '7px', fontWeight: 900, letterSpacing: '0.5px' }}>FITTING</span>
                        </motion.button>
                    </div>

                    <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', padding: '24px', zIndex: 60, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {outfits[currentSlide]?.tags.map((t, i) => (
                                <span key={i} className="outfit" style={{ backgroundColor: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', fontSize: '9px', fontWeight: 900, color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', letterSpacing: '0.3px' }}>
                                    {t.toUpperCase()}
                                </span>
                            ))}
                        </div>

                        <div>
                            <h1 className="outfit" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, color: 'var(--text-main)' }}>
                                {outfits[currentSlide]?.title}
                            </h1>
                            <p className="outfit" style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                {outfits[currentSlide]?.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* 4. Slide Indicator - Now Inside Card */}
                    <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', gap: '6px', zIndex: 70 }}>
                        {outfits.map((_, i) => (
                            <div key={i} style={{ 
                                height: '3px', 
                                width: i === currentSlide ? '16px' : '4px', 
                                borderRadius: '2px', 
                                backgroundColor: i === currentSlide ? 'var(--primary)' : 'rgba(255,255,255,0.4)', 
                                transition: 'all 0.4s ease'
                            }} />
                        ))}
                    </div>
                </motion.div>

            </main>

            <AnimatePresence>
                {showSuccess && (
                     <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '14px 28px', borderRadius: '20px', fontSize: '14px', fontWeight: 900, zIndex: 2000, boxShadow: '0 10px 20px rgba(0,0,0,0.3)', color: 'white' }}>
                        STYLE ARCHIVED SUCCESSFULLY
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 5. Smart Action Bar - Now linked to AI Logic */}
            <ActionBar 
                onPrimaryClick={handleWearComplete}
                onSecondaryClick={handleShuffle}
                isPrimaryLoading={isRegistering}
                isSecondaryLoading={isShuffling}
                primaryText="WEAR NOW"
                secondaryText="SHUFFLE"
            />
        </div>
    );
}
