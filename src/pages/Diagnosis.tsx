import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Image as ImageIcon, Sparkles, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { saveUserProfile } from '../services/db';
import { analyzePersonalColor } from '../services/ai';

interface DiagnosisResult {
    season: string;
    tone: string;
    purity: string;
    description: string;
    bestColors: string[];
    worstColors: string[];
    metrics?: {
        warmth: number;
        brightness: number;
        saturation: number;
        contrast: number;
    }
}

const SEASON_META: Record<string, { label: string, gradient: string, emoji: string, keyColor: string }> = {
    'Spring': { label: '봄 웜', gradient: 'linear-gradient(135deg, #FF9A9E, #FAD0C4)', emoji: '🌷', keyColor: '#FF6B6B' },
    'Summer': { label: '여름 쿨', gradient: 'linear-gradient(135deg, #A1C4FD, #C2E9FB)', emoji: '🌊', keyColor: '#4D96FF' },
    'Fall': { label: '가을 웜', gradient: 'linear-gradient(135deg, #F6D365, #FDA085)', emoji: '🍂', keyColor: '#FF9F29' },
    'Winter': { label: '겨울 쿨', gradient: 'linear-gradient(135deg, #667EEA, #764BA2)', emoji: '❄️', keyColor: '#1C3879' }
};

export default function Diagnosis() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const [image, setImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStage, setAnalysisStage] = useState<'idle' | 'scanning' | 'detecting' | 'analyzing' | 'finalizing'>('idle');
    const [result, setResult] = useState<DiagnosisResult | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiMessage, setAiMessage] = useState("");

    const PERSONA_QUIPS = {
        scanning: [
            "피부 아래 숨어있는 아주 깊은 베이스 톤까지 파악 중이에요...",
            "멜라닌과 헤모글로빈의 정교한 밸런스를 스캔하고 있습니다.",
            "고객님의 타고난 광채를 레이저로 정밀 분석 중이니 잠시만요."
        ],
        detecting: [
            "측면의 그림자 하나까지 놓치지 않는 사감 요정의 매의 눈입니다.",
            "얼굴의 윤곽과 빛의 산란도를 정밀하게 매핑하고 있어요.",
            "이목구비와 퍼스널 컬러의 조화도를 분석 중입니다."
        ],
        analyzing: [
            "어머, 이 채도... 아주 미묘한 스펙트럼까지 걸러내고 있어요.",
            "워스트 컬러는 가차 없이 쳐내고 베스트만 남기는 중입니다.",
            "대표님의 품격을 높여줄 최상의 라이프 컬러를 조합 중이에요."
        ],
        finalizing: [
            "진단서 작성이 거의 끝났습니다. 기대하셔도 좋아요.",
            "사감 요정의 최종 승인이 떨어지는 중입니다.",
            "완벽한 결과가 도출되었습니다. 곧 공개할게요!"
        ]
    };

    const startCamera = async () => {
        setShowCamera(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            setError("카메라 권한이 필요합니다.");
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                setImage(canvas.toDataURL('image/jpeg'));
                stopCamera();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const runDiagnosis = async () => {
        if (!image) return;
        setIsAnalyzing(true);
        setAnalysisStage('scanning');
        setError(null);
        
        // Simulated progression for UX
        const stages: ('scanning' | 'detecting' | 'analyzing' | 'finalizing')[] = ['scanning', 'detecting', 'analyzing', 'finalizing'];
        let stageIdx = 0;
        
        const updateAiMessage = (stage: keyof typeof PERSONA_QUIPS) => {
            const quips = PERSONA_QUIPS[stage];
            setAiMessage(quips[Math.floor(Math.random() * quips.length)]);
        };

        updateAiMessage('scanning');
        
        const stageInterval = setInterval(() => {
            if (stageIdx < stages.length - 1) {
                stageIdx++;
                const newStage = stages[stageIdx];
                setAnalysisStage(newStage);
                updateAiMessage(newStage);
            } else {
                clearInterval(stageInterval);
            }
        }, 1800);

        try {
            const analysis = await analyzePersonalColor(image);
            if (analysis) {
                // Ensure the animation has time to breathe
                await new Promise(r => setTimeout(r, 2000));
                setResult(analysis);
                if (auth.currentUser) {
                    await saveUserProfile(auth.currentUser.uid, {
                        personalColor: `${analysis.season} ${analysis.purity}`,
                        personalColorResult: analysis
                    });
                }
            } else {
                setError("AI 분석에 실패했습니다. 다시 시도해 주세요.");
            }
        } catch (e) {
            setError("오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
            setAnalysisStage('idle');
            clearInterval(stageInterval);
        }
    };

    const renderMetricBar = (label: string, value: number, leftLabel: string, rightLabel: string) => (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--primary)' }}>{value}%</span>
            </div>
            <div style={{ height: '6px', width: '100%', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    style={{ height: '100%', background: 'var(--primary)', borderRadius: '3px' }}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.5 }}>{leftLabel}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, opacity: 0.5 }}>{rightLabel}</span>
            </div>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}
        >
            {/* Header */}
            <header style={{ 
                paddingTop: 'calc(8px + env(safe-area-inset-top, 44px))', 
                paddingBottom: '16px',
                paddingLeft: '24px',
                paddingRight: '24px',
                display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-header)', backdropFilter: 'blur(30px)', borderBottom: '1px solid var(--border-glass)', position: 'sticky', top: 0, zIndex: 100 
            }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronLeft size={20} />
                </motion.button>
                <h2 className="outfit" style={{ fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>PRECISION DIAGNOSIS</h2>
            </header>

            <main style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '120px' }}>
                
                {/* Intro Section */}
                {!image && !showCamera && (
                    <section style={{ textAlign: 'center', marginTop: '40px' }}>
                        <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 32px' }}>
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px dashed var(--primary)', opacity: 0.2 }}
                            />
                            <div style={{ width: '100%', height: '100%', borderRadius: '54px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 25px 50px rgba(157,78,221,0.2)' }}>
                                <Sparkles size={70} color="white" />
                            </div>
                        </div>
                        <h1 className="outfit" style={{ fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>스마트 퍼스널 진단</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, padding: '0 20px' }}>
                            AI 정밀 분석을 통해 대표님의 피부 톤과<br/>가장 잘 어우러지는 최상의 팔레트를 구성합니다.
                        </p>
                    </section>
                )}

                {/* Main Action Area */}
                <section>
                    {showCamera ? (
                        <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '40px', background: 'black', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-glass)' }}>
                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                            
                            {/* Face Guides */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <div style={{ width: '240px', height: '320px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '120px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '35%', left: '-10%', right: '-10%', borderTop: '1px solid rgba(255,255,255,0.2)' }} />
                                    <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', borderTop: '1px dashed rgba(255,255,255,0.2)' }} />
                                </div>
                            </div>
                            
                            <div style={{ position: 'absolute', bottom: '30px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '24px', padding: '0 24px' }}>
                                <motion.button whileTap={{ scale: 0.9 }} onClick={stopCamera} style={{ flex: 1, padding: '18px', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 800 }}>취소</motion.button>
                                <motion.button whileTap={{ scale: 0.85 }} onClick={capturePhoto} style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'white', border: '6px solid rgba(255,255,255,0.2)', padding: '4px' }}>
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--primary)' }} />
                                </motion.button>
                                <div style={{ flex: 1 }} />
                            </div>
                        </div>
                    ) : image ? (
                        <div style={{ position: 'relative' }}>
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '40px', overflow: 'hidden', border: '1px solid var(--border-glass)', position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
                                <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                
                                {/* Analysis Overlays */}
                                <AnimatePresence>
                                    {isAnalyzing && (
                                        <motion.div 
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                                        >
                                            {/* Advanced Scanning Pulse */}
                                            <motion.div 
                                                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)', zIndex: 1 }}
                                            />

                                            {/* Tech Grid */}
                                            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(157,78,221,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(157,78,221,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px', zIndex: 2 }} />
                                            
                                            {/* Floating Data Points */}
                                            {[...Array(6)].map((_, i) => (
                                                <motion.div 
                                                    key={i}
                                                    animate={{ 
                                                        x: [Math.random() * 200 - 100, Math.random() * 200 - 100],
                                                        y: [Math.random() * 200 - 100, Math.random() * 200 - 100],
                                                        opacity: [0, 0.5, 0]
                                                    }}
                                                    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.5 }}
                                                    style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary)', zIndex: 5 }}
                                                />
                                            ))}

                                            {/* Scanning Line with Glow */}
                                            <motion.div 
                                                animate={{ top: ['-10%', '110%'] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                                style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', boxShadow: '0 0 30px var(--primary)', zIndex: 10 }}
                                            />

                                            <div className="flex-col items-center" style={{ position: 'relative', zIndex: 20, padding: '0 24px', textAlign: 'center' }}>
                                                <Loader2 size={48} className="spin" color="var(--primary)" />
                                                
                                                <motion.div 
                                                    key={analysisStage}
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    className="outfit" 
                                                    style={{ color: 'white', marginTop: '24px', fontWeight: 950, letterSpacing: '4px', fontSize: '12px' }}
                                                >
                                                    {analysisStage.toUpperCase()} IN PROGRESS
                                                </motion.div>

                                                <motion.p 
                                                    key={aiMessage}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '16px', lineHeight: 1.6, maxWidth: '240px', fontWeight: 600, height: '44px' }}
                                                >
                                                    {aiMessage}
                                                </motion.p>

                                                <div style={{ width: '120px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '20px', overflow: 'hidden' }}>
                                                    <motion.div animate={{ width: '100%' }} transition={{ duration: 7, ease: "linear" }} style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
                                                </div>
                                            </div>

                                            {/* Transition Flash */}
                                            <AnimatePresence>
                                                {analysisStage === 'finalizing' && (
                                                    <motion.div 
                                                        initial={{ opacity: 0 }} 
                                                        animate={{ opacity: [0, 1, 0] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                        style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 100 }}
                                                    />
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {!isAnalyzing && !result && (
                                <motion.button whileTap={{ scale: 0.95 }} onClick={runDiagnosis} style={{ width: '100%', marginTop: '28px', padding: '22px', borderRadius: '28px', background: 'var(--text-main)', color: 'var(--bg-app)', border: 'none', fontWeight: 900, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                                    <Sparkles size={20} />
                                    정밀 진단 시작하기
                                </motion.button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={startCamera} style={{ padding: '40px 20px', borderRadius: '32px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(157,78,221,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera color="var(--primary)" size={32} /></div>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>AI 카메라 촬영</span>
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current?.click()} style={{ padding: '40px 20px', borderRadius: '32px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon color="var(--text-muted)" size={32} /></div>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>갤러리 사진 불러오기</span>
                            </motion.button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
                        </div>
                    )}
                </section>

                {/* Results Section */}
                <AnimatePresence>
                    {result && (
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
                            
                            {/* Confetti Particles */}
                            {[...Array(12)].map((_, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ x: 0, y: 0, opacity: 1 }}
                                    animate={{ 
                                        x: (Math.random() - 0.5) * 400,
                                        y: (Math.random() - 0.5) * 400,
                                        opacity: 0,
                                        scale: 0
                                    }}
                                    transition={{ duration: 2, ease: "easeOut", delay: 0.1 }}
                                    style={{ 
                                        position: 'absolute', 
                                        top: '20%', 
                                        left: '50%', 
                                        width: '10px', 
                                        height: '10px', 
                                        borderRadius: '2px',
                                        backgroundColor: ['#ff006e', '#8338ec', '#3a86ff', '#ffbe0b'][i % 4],
                                        zIndex: 10
                                    }}
                                />
                            ))}

                            {/* Sagam Fairy's Verdict Bubble */}
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                style={{ 
                                    padding: '24px', 
                                    borderRadius: '30px 30px 30px 4px', 
                                    background: 'var(--text-main)', 
                                    color: 'var(--bg-app)',
                                    position: 'relative',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <Sparkles size={16} color="var(--primary)" />
                                    <span className="outfit" style={{ fontSize: '11px', fontWeight: 950, letterSpacing: '2px' }}>SAGAM FAIRY'S VERDICT</span>
                                </div>
                                <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
                                    {result.season === 'Spring' && "어머, 대표님의 피부 톤은 마치 갓 피어난 튤립처럼 생동감이 넘치는군요. 탁한 기는 단 한 방울도 허용하지 않는 청초한 봄의 정석이십니다."}
                                    {result.season === 'Summer' && "이 서늘하고 우아한 무드... 마치 안개 속의 수국처럼 고결한 인상을 주시네요. 원색보다는 부드럽고 차분한 파스텔이 대표님의 클래스를 완성할 거예요."}
                                    {result.season === 'Fall' && "고급스럽고 깊이 있는 대지의 에너지가 느껴지네요. 정제된 골드와 브라운 톤이 대표님의 성숙한 카리스마를 극대화해줄 최상의 조합입니다."}
                                    {result.season === 'Winter' && "선명하고 강렬한 대비가 드라마틱하게 어울리시는군요. 도회적이고도 냉철한 이미지가 대표님의 가장 큰 무기입니다. 블랙과 화이트의 정석을 보여주세요."}
                                </p>
                            </motion.div>

                            {/* Personal Header Card */}
                            <div className="glass-panel" style={{ padding: '48px 32px', borderRadius: '54px', background: SEASON_META[result.season]?.gradient || 'var(--bg-card)', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.15)' }}>
                                <motion.div 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 0.15 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                    style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '180px' }}
                                >
                                    {SEASON_META[result.season]?.emoji}
                                </motion.div>
                                
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <motion.div 
                                        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}
                                    >
                                        <span style={{ fontSize: '12px', fontWeight: 950, background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', padding: '6px 14px', borderRadius: '14px', letterSpacing: '1.5px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{result.tone.toUpperCase()} TONE</span>
                                        <span style={{ fontSize: '12px', fontWeight: 950, background: 'rgba(0,0,0,0.15)', padding: '6px 14px', borderRadius: '14px', letterSpacing: '1.5px' }}>{result.purity.toUpperCase()}</span>
                                    </motion.div>
                                    
                                    <motion.h1 
                                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                                        className="outfit" style={{ fontSize: '56px', fontWeight: 950, margin: '0 0 24px', letterSpacing: '-3px', lineHeight: 0.9 }}
                                    >
                                        {SEASON_META[result.season]?.label}
                                    </motion.h1>
                                    
                                    <motion.div 
                                        initial={{ width: 0 }} animate={{ width: '60px' }} transition={{ delay: 0.5, duration: 0.8 }}
                                        style={{ height: '6px', background: 'white', borderRadius: '3px', marginBottom: '24px', boxShadow: '0 2px 10px rgba(255,255,255,0.3)' }} 
                                    />
                                    
                                    <motion.p 
                                        initial={{ opacity: 0 }} animate={{ opacity: 0.95 }} transition={{ delay: 0.6 }}
                                        style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.7, letterSpacing: '-0.2px' }}
                                    >
                                        {result.description}
                                    </motion.p>
                                </div>

                                {/* Decorative Sparkles */}
                                <motion.div 
                                    animate={{ 
                                        scale: [1, 1.2, 1],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    style={{ position: 'absolute', top: '40px', left: '30px', pointerEvents: 'none' }}
                                >
                                    <Sparkles size={24} color="rgba(255,255,255,0.4)" />
                                </motion.div>
                            </div>

                            {/* Detailed Metrics */}
                            {result.metrics && (
                                <motion.div 
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                                    className="glass-panel" style={{ padding: '36px', borderRadius: '40px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}
                                >
                                    <h3 className="outfit" style={{ fontSize: '13px', fontWeight: 950, letterSpacing: '2px', marginBottom: '28px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '4px', height: '14px', background: 'var(--primary)', borderRadius: '2px' }} />
                                        CHROMATIC PROFILE
                                    </h3>
                                    {renderMetricBar('WARMTH (HUE)', result.metrics.warmth, 'Cool', 'Warm')}
                                    {renderMetricBar('BRIGHTNESS (VALUE)', result.metrics.brightness, 'Dark', 'Light')}
                                    {renderMetricBar('SATURATION (CHROMA)', result.metrics.saturation, 'Muted', 'Clear')}
                                    {renderMetricBar('CONTRAST RATIO', result.metrics.contrast, 'Low', 'High')}
                                </motion.div>
                            )}

                            {/* Color Palettes - More Artistic Swatches */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <motion.div 
                                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}
                                    className="glass-panel" style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '36px', overflow: 'hidden' }}
                                >
                                    <h4 className="outfit" style={{ fontSize: '11px', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80' }} /> BEST PALETTE
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {result.bestColors.map((c, idx) => (
                                            <motion.div 
                                                key={c} 
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 0.7 + (idx * 0.1) }}
                                                style={{ height: '44px', borderRadius: '16px', background: c, border: '1px solid rgba(255,255,255,0.2)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px' }}
                                            >
                                                <span className="outfit" style={{ fontSize: '8px', fontWeight: 950, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>{c.toUpperCase()}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                                
                                <motion.div 
                                    initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}
                                    className="glass-panel" style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '36px' }}
                                >
                                    <h4 className="outfit" style={{ fontSize: '11px', fontWeight: 950, color: 'var(--text-muted)', letterSpacing: '1.5px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f87171' }} /> AVOID TONES
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {result.worstColors.map((c, idx) => (
                                            <motion.div 
                                                key={c} 
                                                initial={{ x: 10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 0.7 + (idx * 0.1) }}
                                                style={{ height: '44px', borderRadius: '16px', background: c, border: '1px solid rgba(255,255,255,0.2)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px' }}
                                            >
                                                <span className="outfit" style={{ fontSize: '8px', fontWeight: 950, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>{c.toUpperCase()}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Final Actions */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <motion.button 
                                    whileTap={{ scale: 0.95 }} 
                                    onClick={() => navigate('/wardrobe')} 
                                    style={{ flex: 1, padding: '22px', borderRadius: '28px', background: 'var(--text-main)', color: 'var(--bg-app)', border: 'none', fontWeight: 900, fontSize: '16px' }}
                                >
                                    내 컬러로 코디 제안받기
                                </motion.button>
                                <motion.button 
                                    whileTap={{ scale: 0.95 }} 
                                    onClick={() => { setImage(null); setResult(null); }} 
                                    style={{ width: '68px', height: '68px', borderRadius: '28px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <RefreshCw size={24} />
                                </motion.button>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '20px', borderRadius: '24px', background: 'rgba(255,100,100,0.1)', color: '#ff6464', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 700 }}>
                        <AlertTriangle size={20} />
                        {error}
                    </motion.div>
                )}

            </main>
        </motion.div>
    );
}
