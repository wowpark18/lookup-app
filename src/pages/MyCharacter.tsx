import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Camera, CheckCircle2, User, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';

type CaptureType = 'front' | 'side' | 'back' | 'face';

export default function MyCharacter() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Info, 2: Capture, 3: Processing, 4: Result
    const [captures, setCaptures] = useState<Record<CaptureType, string | null>>({
        front: null,
        side: null,
        back: null,
        face: null
    });
    const [activeCapture, setActiveCapture] = useState<CaptureType>('front');
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const captureGuides: Record<CaptureType, { title: string; desc: string; icon: string }> = {
        front: { title: 'FRONT VIEW', desc: '정면 전체가 나오도록 서주세요', icon: 'accessibility_new' },
        side: { title: 'SIDE VIEW', desc: '옆모습의 실루엣을 캡처합니다', icon: 'transfer_within_a_station' },
        back: { title: 'BACK VIEW', desc: '뒷모습과 어깨 선을 확인합니다', icon: 'person' },
        face: { title: 'FACE CLOSE-UP', desc: '얼굴 위주의 정면 사진을 찍어주세요', icon: 'face_retouching_natural' }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCaptures(prev => ({ ...prev, [activeCapture]: reader.result as string }));
                // 모든 캡처가 완료되지 않았다면 다음 단계로 유도
                const types: CaptureType[] = ['front', 'side', 'back', 'face'];
                const currentIndex = types.indexOf(activeCapture);
                if (currentIndex < types.length - 1) {
                    setActiveCapture(types[currentIndex + 1]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const startSynthesis = () => {
        if (!captures.front || !captures.face) {
            alert("정면과 얼굴 사진은 필수입니다!");
            return;
        }
        setStep(3);
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 5;
            setProgress(currentProgress);
            if (currentProgress >= 100) {
                clearInterval(interval);
                setStep(4);
                // [코다리 부장] 대표님의 실사 사진 데이터를 저장합니다!
                localStorage.setItem('lookUp_digitalTwin', JSON.stringify(captures));
            }
        }, 150);
    };

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ flex: 1 }}>
            <div style={{ marginBottom: '40px', marginTop: '20px' }}>
                <h2 className="outfit" style={{ fontSize: '32px', fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                    CREATE YOUR <br/><span style={{ color: 'var(--primary)' }}>DIGITAL TWIN</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '16px', lineHeight: 1.6 }}>
                    고해상도 AI 피팅을 위해 대표님의<br/>다각도 신체 데이터를 캡처합니다.
                </p>
            </div>

            <div className="glass-panel" style={{ padding: '32px', borderRadius: '32px', marginBottom: '32px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[
                        { title: 'AI Realism', desc: '실사 지향 가상 피팅 엔진 기반', icon: <Sparkles size={20} color="var(--primary)" /> },
                        { title: 'Multi-Angle', desc: '앞, 옆, 뒤 입체적 데이터 분석', icon: <RefreshCw size={20} color="var(--secondary)" /> },
                        { title: 'Secure Data', desc: '신체 데이터는 암호화되어 보호됩니다', icon: <CheckCircle2 size={20} color="var(--accent)" /> }
                    ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: 900 }}>{item.title}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button 
                onClick={() => setStep(2)}
                className="primary-button"
                style={{ width: '100%', padding: '24px', fontSize: '18px', borderRadius: '24px', position: 'absolute', bottom: '40px', left: 0, right: 0 }}
            >
                캡처 가이드 시작
            </button>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {(['front', 'side', 'back', 'face'] as CaptureType[]).map(type => (
                        <div key={type} style={{ flex: 1, height: '4px', borderRadius: '2px', background: captures[type] ? 'var(--primary)' : 'rgba(0,0,0,0.05)', transition: 'all 0.3s' }} />
                    ))}
                </div>
                <h2 className="outfit" style={{ fontSize: '24px', fontWeight: 900 }}>{captureGuides[activeCapture].title}</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>{captureGuides[activeCapture].desc}</p>
            </div>

            {/* Capture Area */}
            <div 
                className="glass-panel" 
                onClick={() => fileInputRef.current?.click()}
                style={{ flex: 1, borderRadius: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-glass)', minHeight: '360px' }}
            >
                {captures[activeCapture] ? (
                    <>
                        <img src={captures[activeCapture]!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'var(--primary)', padding: '12px', borderRadius: '50%', color: 'white' }}>
                            <RefreshCw size={20} />
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(157, 78, 221, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Camera size={40} color="var(--primary)" />
                        </div>
                        <div style={{ fontWeight: 900, color: 'var(--primary)' }}>TAP TO CAPTURE</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>또는 갤러리에서 선택</div>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>

            {/* Thumbnail Strip */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                {(['front', 'side', 'back', 'face'] as CaptureType[]).map(type => (
                    <div 
                        key={type} 
                        onClick={() => setActiveCapture(type)}
                        style={{ 
                            width: '64px', height: '84px', borderRadius: '12px', border: activeCapture === type ? '2px solid var(--primary)' : '1px solid var(--border-glass)', 
                            overflow: 'hidden', cursor: 'pointer', opacity: activeCapture === type ? 1 : 0.6, background: 'var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        {captures[type] ? (
                            <img src={captures[type]!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--text-muted)' }}>{captureGuides[type].icon}</span>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginTop: '32px', paddingBottom: '20px' }}>
                <button onClick={() => setStep(1)} className="glass-panel" style={{ height: '64px', borderRadius: '20px', fontWeight: 900 }}>CANCEL</button>
                <button 
                    disabled={!captures.front || !captures.face}
                    onClick={startSynthesis} 
                    className="primary-button" 
                    style={{ height: '64px', borderRadius: '20px', fontSize: '16px', opacity: captures.front && captures.face ? 1 : 0.5 }}
                >
                    SYNTHESIZE TWIN
                </button>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-col items-center justify-center" style={{ flex: 1 }}>
            <div style={{ position: 'relative', width: '280px', height: '280px', marginBottom: '40px' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px dashed var(--primary)', opacity: 0.3 }} />
                <div style={{ position: 'absolute', inset: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100px', height: '100px', background: 'rgba(157, 78, 221, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={40} color="var(--primary)" className="animate-spin" />
                    </div>
                </div>
                {/* Random Matrix Dots */}
                {[...Array(8)].map((_, i) => (
                    <motion.div 
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.8, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        style={{ position: 'absolute', top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '2px' }}
                    />
                ))}
            </div>
            <h2 className="outfit" style={{ fontSize: '24px', fontWeight: 950, letterSpacing: '2px' }}>ANALYZING BIOMETRICS</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px', textAlign: 'center' }}>고해상도 실사 맵핑 및<br/>입체 피팅 엔진 초기화 중...</p>
            
            <div style={{ width: '200px', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', marginTop: '40px', overflow: 'hidden' }}>
                <motion.div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} animate={{ width: `${progress}%` }} />
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: 900, color: 'var(--primary)' }}>{progress}%</div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '10px' }}>
                <div style={{ display: 'inline-flex', padding: '8px 20px', borderRadius: '20px', background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontWeight: 900, fontSize: '11px', letterSpacing: '1px', marginBottom: '16px' }}>
                    BIOMETRIC SHEET READY
                </div>
                <h2 className="outfit" style={{ fontSize: '32px', fontWeight: 950 }}>MY DIGITAL TWIN</h2>
            </div>

            {/* Realistic Character Sheet Layout */}
            <div className="glass-panel" style={{ flex: 1, borderRadius: '40px', overflow: 'hidden', display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: 'repeat(3, 1fr)', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-glass)' }}>
                {/* Main Body (Front) */}
                <div style={{ gridColumn: '1', gridRow: '1 / span 3', background: 'black', borderRadius: '30px', overflow: 'hidden', position: 'relative' }}>
                    <img src={captures.front || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '12px', fontSize: '10px', color: 'white', fontWeight: 900 }}>FRONT</div>
                </div>

                {/* Side Body */}
                <div style={{ background: '#f0f0f0', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
                    {captures.side ? <img src={captures.side} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><User size={24} color="#ccc" /></div>}
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '8px', fontSize: '8px', fontWeight: 900 }}>SIDE</div>
                </div>

                {/* Face Close-up */}
                <div style={{ background: '#f0f0f0', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
                    <img src={captures.face || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '8px', fontSize: '8px', fontWeight: 900 }}>FACE</div>
                </div>

                {/* Back Body */}
                <div style={{ background: '#f0f0f0', borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
                    {captures.back ? <img src={captures.back} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><User size={24} color="#ccc" /></div>}
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '8px', fontSize: '8px', fontWeight: 900 }}>BACK</div>
                </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', paddingBottom: '32px' }}>
                <button onClick={() => setStep(2)} className="glass-panel" style={{ width: '72px', height: '72px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={24} />
                </button>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="primary-button" 
                    style={{ flex: 1, borderRadius: '24px', fontSize: '18px', fontWeight: 950 }}
                >
                    고성능 가상 피팅 시작
                </button>
            </div>
        </motion.div>
    );

    return (
        <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column', color: 'var(--text-main)' }}>
            {/* Header */}
            <div style={{ padding: 'calc(env(safe-area-inset-top, 20px) + 12px) 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft size={20} />
                </motion.button>
                <div className="outfit" style={{ fontWeight: 950, fontSize: '11px', letterSpacing: '3px', color: 'var(--text-main)', opacity: 0.6 }}>TWIN MODULE</div>
                <div style={{ width: '44px' }} />
            </div>

            <main style={{ flex: 1, padding: '0 24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                </AnimatePresence>
            </main>
        </div>
    );
}

