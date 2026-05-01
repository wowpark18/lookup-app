import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Image as ImageIcon, Zap, X, Sparkles, Loader2, Check, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';
import { addWardrobeItem, getWardrobeItemCount } from '../services/db';
import { analyzeClothingImage } from '../services/ai';
// import { Haptics, ImpactStyle } from '@capacitor/haptics'; // Optional: Install later if needed



interface ScannedItem {
    id: number;
    dataUrl: string;
    aiResult?: any;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
}

export default function OCRScan() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // States
    const [phase, setPhase] = useState<'capture' | 'review'>('capture');
    const [scanMode, setScanMode] = useState<'receipt' | 'tag' | 'clothes'>('clothes');
    const [isScanning, setIsScanning] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [capturedItems, setCapturedItems] = useState<ScannedItem[]>([]);
    // const [showSubscription, setShowSubscription] = useState(false);
    const [totalItemCount, setTotalItemCount] = useState(0); 
    const [isSavingAll, setIsSavingAll] = useState(false);
    
    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (auth.currentUser) {
            getWardrobeItemCount(auth.currentUser.uid).then(setTotalItemCount);
        }

        if (location.state?.photoData) {
            setCapturedItems([{ id: Date.now(), dataUrl: location.state.photoData, status: 'pending' }]);
            return;
        }

        startCamera();

        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err: any) {
                console.error("카메라 접근 권한이 없습니다.", err);
                alert("카메라를 시작할 수 없습니다: " + (err.message || "권한이 거부되었거나 보안 연결(HTTPS)이 필요합니다."));
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleCapture = () => {
        if (totalItemCount + capturedItems.length >= 30) {
            // setShowSubscription(true);
            alert("무료 버전은 30벌까지만 등록 가능합니다. 멤버십을 확인해주세요!");
            return;
        }

        if (isScanning) return;
        setIsScanning(true);
        setShowFlash(true);
        
        // Haptic feedback simulation
        try {
            // (window as any).Capacitor?.Plugins?.Haptics?.impact({ style: 'heavy' });
        } catch (e) {
            console.log("Haptics not available");
        }

        setTimeout(() => setShowFlash(false), 150);

        let dataUrl = "";
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 480;
            canvas.height = videoRef.current.videoHeight || 640;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            }
        }

        setTimeout(() => {
            setIsScanning(false);
            if (dataUrl) {
                setCapturedItems(prev => [...prev, { id: Date.now(), dataUrl, status: 'pending' }]);
            }
        }, 600);
    };

    const startAnalysisPhase = async () => {
        setPhase('review');
        stopCamera();
        
        // [병렬 처리] 2개씩 묶어서 분석
        const chunk = 2;
        const pendingIndices = capturedItems
            .map((item, idx) => (item.status === 'pending' || item.status === 'failed') ? idx : -1)
            .filter(idx => idx !== -1);

        for (let i = 0; i < pendingIndices.length; i += chunk) {
            const indicesToProcess = pendingIndices.slice(i, i + chunk);
            // Use allSettled to ensure failure of one doesn't crash the loop
            await Promise.allSettled(indicesToProcess.map(idx => runAnalysisForItem(idx)));
        }
    };

    const runAnalysisForItem = async (index: number) => {
        setCapturedItems(prev => prev.map((item, idx) => 
            idx === index ? { ...item, status: 'analyzing' } : item
        ));
        
        try {
            const itemToAnalyze = capturedItems[index];
            const result = await analyzeClothingImage(itemToAnalyze.dataUrl, scanMode);
            
            setCapturedItems(prev => prev.map((item, idx) => 
                idx === index ? { ...item, status: 'completed', aiResult: result } : item
            ));
        } catch (e) {
            console.error(e);
            setCapturedItems(prev => prev.map((item, idx) => 
                idx === index ? { ...item, status: 'failed' } : item
            ));
        }
    };

    const handleRetry = (id: number) => {
        const index = capturedItems.findIndex(item => item.id === id);
        if (index !== -1) {
            runAnalysisForItem(index);
        }
    };

    const handleEditItem = (id: number, field: string, value: any) => {
        setCapturedItems(prev => prev.map(item => {
            if (item.id === id) {
                const newAiResult = { ...item.aiResult, [field]: value };
                return { ...item, aiResult: newAiResult };
            }
            return item;
        }));
    };

    const handleToggleMultiItem = (id: number, field: string, value: string) => {
        setCapturedItems(prev => prev.map(item => {
            if (item.id === id) {
                const current = item.aiResult[field] || [];
                const updated = current.includes(value)
                    ? current.filter((v: string) => v !== value)
                    : [...current, value];
                return { ...item, aiResult: { ...item.aiResult, [field]: updated } };
            }
            return item;
        }));
    };

    const handleFinalSave = async () => {
        if (isSavingAll) return;
        setIsSavingAll(true);

        try {
            if (auth.currentUser) {
                const itemsToSave = capturedItems.filter(i => i.status === 'completed');
                
                if (itemsToSave.length === 0) {
                    alert("분석이 완료된 옷이 없습니다.");
                    setIsSavingAll(false);
                    return;
                }

                // eslint-disable-next-line @typescript-eslint/no-unused-vars

                
                // Track progress
                let savedCount = 0;
                for (const item of itemsToSave) {
                    const res = item.aiResult;
                    await addWardrobeItem({
                        userId: auth.currentUser!.uid,
                        imageUrl: item.dataUrl,
                        category: res.category || 'top',
                        subcategory: res.subcategory || 'Unknown',
                        brand: (res.brand && res.brand !== 'Unknown' && res.brand !== '어디 제품인가요?') ? res.brand : 'Unknown Brand',
                        color: res.color || '#ffffff',
                        materials: res.materials || [],
                        season: res.seasons || [],
                        fit: res.fit || 'Regular',
                        texture: res.texture || [],
                        laundryGuide: res.laundryGuide || '기본 세탁 권장',

                    });
                    savedCount++;
                }
                
                alert(`${savedCount}벌의 옷이 옷장에 등록되었습니다! ✨`);
                navigate('/wardrobe');
            }
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSavingAll(false);
        }
    };

    const removeItem = (id: number) => {
        const newItems = capturedItems.filter(item => item.id !== id);
        setCapturedItems(newItems);
        if (newItems.length === 0 && phase === 'review') {
            setPhase('capture');
            startCamera();
        }
    };

    // UI Helpers
    const getGuideText = () => {
        switch (scanMode) {
            case 'receipt': return "영수증 전체를 화면에 맞춰주세요.";
            case 'tag': return "케어라벨(텍)이 잘 보이게 비춰주세요.";
            case 'clothes': return "옷의 전체 실루엣이 보이게 해주세요.";
            default: return "";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)', position: 'relative', overflow: 'hidden', color: 'var(--text-main)' }}
        >
            {/* Standardized Header */}
            <header style={{ 
                height: 'auto', 
                paddingTop: 'calc(8px + env(safe-area-inset-top, 44px))', 
                paddingBottom: '16px',
                position: 'fixed', 
                top: 0,
                left: 0,
                right: 0,
                display: 'grid',
                gridTemplateColumns: '80px 1fr 80px', // Robust centering
                alignItems: 'center', 
                paddingLeft: '20px', 
                paddingRight: '20px', 
                zIndex: 100,
                background: phase === 'capture' ? 'rgba(0,0,0,0.3)' : 'var(--bg-header)',
                backdropFilter: 'blur(30px)',
                borderBottom: phase === 'review' ? '1px solid var(--border-glass)' : 'none',
                transition: 'all 0.3s ease'
            }}>
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        if (phase === 'review') {
                            setPhase('capture');
                            startCamera();
                        } else {
                            navigate(-1);
                        }
                    }} 
                    style={{ 
                        width: '36px', height: '36px', borderRadius: '12px', 
                        background: phase === 'capture' ? 'rgba(255,255,255,0.1)' : 'var(--bg-card)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-glass)' 
                    }}
                >
                    <ChevronLeft size={20} color={phase === 'capture' ? 'white' : 'var(--text-main)'} />
                </motion.button>

                <div className="outfit" style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '4px', color: phase === 'capture' ? 'white' : 'var(--text-main)', textAlign: 'center' }}>
                    LOOK-UP
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {phase === 'review' && (
                        <>
                            {capturedItems.some(i => i.status === 'failed') && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        capturedItems.forEach((item, idx) => {
                                            if (item.status === 'failed') runAnalysisForItem(idx);
                                        });
                                    }}
                                    style={{ 
                                        width: '36px', height: '36px', borderRadius: '12px', 
                                        background: 'var(--bg-card)', color: 'var(--primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-glass)' 
                                    }}
                                >
                                    <Zap size={18} fill="currentColor" />
                                </motion.button>
                            )}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    if (confirm("정말로 모든 항목을 삭제하시겠습니까?")) {
                                        setCapturedItems([]);
                                        setPhase('capture');
                                        startCamera();
                                    }
                                }}
                                style={{ 
                                    width: '36px', height: '36px', borderRadius: '12px', 
                                    background: 'var(--bg-card)', color: '#ff6464',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-glass)' 
                                }}
                            >
                                <X size={20} />
                            </motion.button>
                        </>
                    )}
                </div>
            </header>

            {phase === 'capture' ? (
                <>
                    {/* Viewport */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        
                        {/* Futuristic Scanner Overlay */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <motion.div
                                animate={{
                                    width: scanMode === 'receipt' ? '70%' : '85%',
                                    height: scanMode === 'receipt' ? '80%' : '60%',
                                    borderColor: isScanning ? 'var(--primary)' : 'rgba(255,255,255,0.3)'
                                }}
                                style={{ border: '1.5px solid', borderRadius: '40px', position: 'relative' }}
                            >
                                {/* Corner Accents */}
                                {[0, 90, 180, 270].map(rot => (
                                    <div key={rot} style={{ position: 'absolute', top: -2, left: -2, width: '32px', height: '32px', borderTop: '4px solid white', borderLeft: '4px solid white', borderRadius: '40px 0 0 0', transform: `rotate(${rot}deg)`, transformOrigin: 'center' }} />
                                ))}
                                
                                {isScanning && (
                                    <motion.div
                                        initial={{ top: '0%', opacity: 0 }}
                                        animate={{ top: ['0%', '100%', '0%'], opacity: [0, 1, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        style={{ 
                                            position: 'absolute', left: '2%', right: '2%', height: '3px', 
                                            background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', 
                                            boxShadow: '0 0 15px var(--primary), 0 0 30px var(--primary)',
                                            zIndex: 20
                                        }}
                                    />
                                )}
                                <motion.div
                                    animate={{ opacity: isScanning ? [0.2, 0.5, 0.2] : 0 }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    style={{ position: 'absolute', inset: 0, borderRadius: '40px', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', pointerEvents: 'none' }}
                                />
                            </motion.div>
                        </div>

                        {/* Shutter Flash */}
                        <AnimatePresence>
                            {showFlash && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 200 }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Guide Text */}
                        <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, textAlign: 'center' }}>
                            <p style={{ color: 'white', fontSize: '14px', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)', letterSpacing: '0.5px' }}>
                                {getGuideText()}
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ background: 'var(--bg-app)', padding: '24px 24px calc(24px + env(safe-area-inset-bottom, 20px))', borderTop: '1px solid var(--border-glass)' }}>
                        {/* Mode Picker */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginBottom: '32px' }}>
                            {['clothes', 'tag', 'receipt'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setScanMode(m as any)}
                                    style={{ 
                                        background: 'transparent', border: 'none', 
                                        color: scanMode === m ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: '11px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    {m.toUpperCase()}
                                    {scanMode === m && <motion.div layoutId="m-dot" style={{ height: '4px', width: '4px', borderRadius: '50%', background: 'var(--primary)', margin: '4px auto 0' }} />}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Gallery Preview */}
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                {capturedItems.length > 0 ? (
                                    <img src={capturedItems[capturedItems.length - 1].dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <ImageIcon size={24} color="var(--text-muted)" />
                                )}
                                {capturedItems.length > 0 && (
                                    <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--primary)', color: 'white', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '10px' }}>
                                        {capturedItems.length}
                                    </div>
                                )}
                            </div>

                            {/* Shutter Button */}
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={handleCapture}
                                style={{ width: '84px', height: '84px', borderRadius: '50%', border: '5px solid var(--border-glass)', padding: '6px', background: 'transparent' }}
                            >
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'white', boxShadow: '0 0 20px rgba(255,255,255,0.3)' }} />
                            </motion.button>

                            {/* Proceed to Review */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={startAnalysisPhase}
                                disabled={capturedItems.length === 0}
                                style={{ 
                                    width: '64px', height: '64px', borderRadius: '32px', 
                                    background: capturedItems.length > 0 ? 'var(--primary)' : 'var(--bg-card)', 
                                    color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: capturedItems.length > 0 ? 1 : 0.5,
                                    boxShadow: capturedItems.length > 0 ? '0 10px 20px rgba(157,78,221,0.2)' : 'none'
                                }}
                            >
                                <ArrowRight size={28} />
                            </motion.button>
                        </div>
                    </div>
                </>
            ) : (
                /* Review Phase */
                <main style={{ flex: 1, padding: '24px', paddingTop: 'calc(100px + env(safe-area-inset-top))', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '4px 10px', borderRadius: '10px', background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
                            <span className="outfit" style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>SMART BATCH ANALYSIS</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>아이템별 정보를 확인해주세요</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '120px' }}>
                        {capturedItems.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="glass-panel"
                                style={{ 
                                    padding: '20px', display: 'flex', gap: '20px', alignItems: 'center', 
                                    position: 'relative', background: 'var(--bg-card)', borderRadius: '28px', 
                                    border: item.status === 'failed' ? '1px solid rgba(255,100,100,0.3)' : '1px solid var(--border-glass)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                                }}
                            >
                                <div style={{ width: '90px', height: '90px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid var(--border-glass)', backgroundColor: 'var(--bg-app)' }}>
                                    <img src={item.dataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {item.status === 'analyzing' && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', gap: '8px' }}>
                                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                                                <RefreshCw size={24} color="var(--primary)" />
                                            </motion.div>
                                            <span className="outfit" style={{ fontSize: '8px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>AI VISION</span>
                                        </div>
                                    )}
                                    {item.status === 'completed' && (
                                        <div style={{ position: 'absolute', top: 6, right: 6, background: '#00ff00', borderRadius: '50%', padding: '3px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                            <Check size={12} color="black" />
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                    {item.status === 'completed' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {/* Top Line: Subcategory & Brand */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <input 
                                                    value={item.aiResult.subcategory || ''}
                                                    onChange={(e) => handleEditItem(item.id, 'subcategory', e.target.value)}
                                                    placeholder="아이템 이름"
                                                    style={{ 
                                                        background: 'transparent', border: 'none', color: 'var(--text-main)', 
                                                        fontSize: '15px', fontWeight: 900, padding: 0, width: '100%',
                                                        outline: 'none', borderBottom: '1px solid transparent' 
                                                    }}
                                                    onFocus={(e) => e.target.style.borderBottom = '1px solid var(--primary)'}
                                                    onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
                                                />
                                                <input 
                                                    value={item.aiResult.brand || ''}
                                                    onChange={(e) => handleEditItem(item.id, 'brand', e.target.value)}
                                                    placeholder="브랜드 명"
                                                    style={{ 
                                                        background: 'transparent', border: 'none', color: 'var(--primary)', 
                                                        fontSize: '12px', fontWeight: 900, padding: 0, width: '100%',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>

                                            {/* Middle Line: Color & Fit */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-app)', padding: '2px 8px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.aiResult.color || '#fff', border: '1px solid rgba(0,0,0,0.1)' }} />
                                                    <input 
                                                        value={item.aiResult.color || ''}
                                                        onChange={(e) => handleEditItem(item.id, 'color', e.target.value)}
                                                        style={{ background: 'transparent', border: 'none', fontSize: '9px', fontWeight: 900, color: 'var(--text-muted)', width: '45px', padding: 0 }}
                                                    />
                                                </div>
                                                <select 
                                                    value={item.aiResult.fit || 'Regular'}
                                                    onChange={(e) => handleEditItem(item.id, 'fit', e.target.value)}
                                                    style={{ background: 'var(--bg-app)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '10px', fontWeight: 900, color: 'var(--text-muted)', padding: '2px 4px' }}
                                                >
                                                    {['Slim', 'Regular', 'Relaxed', 'Oversized'].map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>

                                            {/* Bottom Line: Seasons & Materials (Togglable labels) */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {['Spring', 'Summer', 'Fall', 'Winter'].map(s => (
                                                    <button 
                                                        key={s}
                                                        onClick={() => handleToggleMultiItem(item.id, 'seasons', s)}
                                                        className="outfit"
                                                        style={{ 
                                                            fontSize: '8px', fontWeight: 950, padding: '2px 6px', borderRadius: '6px', 
                                                            border: '1px solid var(--border-glass)',
                                                            background: item.aiResult.seasons?.includes(s) ? 'var(--primary)' : 'rgba(0,0,0,0.03)',
                                                            color: item.aiResult.seasons?.includes(s) ? 'white' : 'var(--text-muted)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {s[0]}
                                                    </button>
                                                ))}
                                                <div style={{ height: '12px', width: '1px', background: 'var(--border-glass)', margin: '0 2px' }} />
                                                {item.aiResult.materials?.slice(0, 3).map((m: string, i: number) => (
                                                    <span key={i} className="outfit" style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', background: 'rgba(0,0,0,0.03)', padding: '2px 4px', borderRadius: '4px' }}>{m}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : item.status === 'failed' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <p className="outfit" style={{ fontSize: '12px', fontWeight: 900, color: '#ff6464', margin: 0, letterSpacing: '0.5px' }}>ANALYSIS FAILED</p>
                                            <button 
                                                onClick={() => handleRetry(item.id)}
                                                style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px var(--primary-glow)' }}
                                            >
                                                <Zap size={12} fill="white" /> RETRY
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Sparkles size={14} className="spin" color="var(--primary)" />
                                                <span className="outfit" style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                                                    {item.status === 'analyzing' ? 'DECODING STYLE...' : 'IN QUEUE...'}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                                                {item.status === 'analyzing' && (
                                                    <motion.div 
                                                        initial={{ x: '-100%' }}
                                                        animate={{ x: '100%' }}
                                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                                        style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)' }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button 
                                        onClick={() => removeItem(item.id)}
                                        style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'rgba(255,100,100,0.1)', border: 'none', color: '#ff6464', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Final Action Bar */}
                    <div style={{ 
                        position: 'fixed', bottom: 0, left: 0, right: 0, 
                        padding: '24px 24px calc(24px + env(safe-area-inset-bottom, 20px))', 
                        background: 'linear-gradient(to top, var(--bg-app), transparent)',
                        zIndex: 100
                    }}>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleFinalSave}
                            disabled={isSavingAll || capturedItems.filter(i => i.status === 'completed').length === 0}
                            style={{
                                width: '100%', padding: '20px', borderRadius: '24px',
                                background: 'var(--text-main)', color: 'var(--bg-app)',
                                border: 'none', fontWeight: 900, fontSize: '16px', letterSpacing: '1px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                cursor: (isSavingAll || capturedItems.filter(i => i.status === 'completed').length === 0) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSavingAll ? (
                                <>
                                    <Loader2 size={20} className="spin" />
                                    저장 중...
                                </>
                            ) : (
                                <>
                                    옷장에 모두 등록하기 ({capturedItems.filter(i => i.status === 'completed').length}벌)
                                    <Sparkles size={18} />
                                </>
                            )}
                        </motion.button>
                    </div>
                </main>
            )}

            {/* Final Saving Progress Overlay */}
            <AnimatePresence>
                {isSavingAll && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '40px' }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                                style={{ position: 'absolute', inset: 0, border: '2px dashed var(--primary)', borderRadius: '50%', opacity: 0.3 }}
                            />
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{ position: 'absolute', inset: '15%', background: 'var(--primary)', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px var(--primary-glow)' }}
                            >
                                <Check size={40} color="white" />
                            </motion.div>
                        </div>
                        <h2 className="outfit" style={{ fontSize: '20px', fontWeight: 900, color: 'white', letterSpacing: '2px', marginBottom: '8px' }}>CURATING CLOSET</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600 }}>대표님의 옷장에 보관하는 중입니다...</p>
                        
                        <div style={{ width: '200px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '30px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2, ease: 'easeInOut' }}
                                style={{ height: '100%', background: 'var(--primary)' }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
