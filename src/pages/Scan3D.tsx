import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Camera, Activity, CheckCircle2, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Scan3D() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Data Input, 2: Photo Upload, 3: Generation, 4: Result
    
    // Step 1 Data
    const [bodyData, setBodyData] = useState({
        height: '',
        weight: '',
        gender: '',
        age: ''
    });

    // Step 2 Photos
    const [photos, setPhotos] = useState<Record<string, string | null>>({
        front: null,
        back: null,
        left: null,
        right: null
    });

    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [scannedData, setScannedData] = useState<Record<string, number> | null>(null);

    const handlePhotoUpload = (view: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const tempUrl = URL.createObjectURL(e.target.files[0]);
            setPhotos(prev => ({ ...prev, [view]: tempUrl }));
        }
    };

    const startGeneration = () => {
        setStep(3);
        let currentProgress = 0;
        
        const texts = [
            "이미지 변환 중 (Extracting Features...)",
            "AI 체형 추론 중 (Generating 3D Mesh...)",
            "데이터 정규화 (Applying Body Data...)",
            "텍스처 및 매핑 타이포그래피 (Texture Mapping...)",
            "완료 준비 중 (Finalizing...)"
        ];

        const interval = setInterval(() => {
            currentProgress += 5;
            setProgress(currentProgress);
            
            if (currentProgress < 20) setStatusText(texts[0]);
            else if (currentProgress < 40) setStatusText(texts[1]);
            else if (currentProgress < 60) setStatusText(texts[2]);
            else if (currentProgress < 80) setStatusText(texts[3]);
            else setStatusText(texts[4]);

            if (currentProgress >= 100) {
                clearInterval(interval);
                finishGeneration();
            }
        }, 300); // 6 seconds total
    };

    const finishGeneration = () => {
        // AI 추론 결과 시뮬레이션
        const heightVal = parseInt(bodyData.height) || 175;
        const weightVal = parseInt(bodyData.weight) || 70;
        
        // 간단한 비례식으로 신체 치수 추정 시뮬레이션
        const estimatedMeasurements = {
            height: heightVal,
            shoulder: Math.floor(heightVal * 0.25),
            chest: Math.floor(weightVal * 1.2 + 20),
            armLength: Math.floor(heightVal * 0.35),
            waist: Math.floor(weightVal * 1.1 + 10),
            hip: Math.floor(weightVal * 1.3 + 15),
            legLength: Math.floor(heightVal * 0.45)
        };

        localStorage.setItem('lookUpMeasurements', JSON.stringify(estimatedMeasurements));
        setScannedData(estimatedMeasurements);
        
        // Save to specific services (simulation)
        import('../lib/firebase').then(({ auth }) => {
            if (auth.currentUser) {
                import('../services/db').then(({ saveUserProfile }) => {
                    saveUserProfile(auth.currentUser!.uid, { measurements: estimatedMeasurements }).catch(console.error);
                });
            }
        });

        setTimeout(() => setStep(4), 500);
    };

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-col" style={{ flex: 1, padding: '32px 0' }}>
            <h2 className="outfit" style={{ fontSize: '28px', fontWeight: 800, color: 'white', margin: '0 0 12px 0' }}>기본 체형 데이터 <span style={{ color: 'var(--primary)' }}>입력</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 40px 0' }}>AI가 정확한 3D 비례를 계산하기 위해<br/>꼭 필요한 기초 데이터입니다.</p>
            
            <div className="glass-panel flex-col gap-6" style={{ padding: '28px', background: 'rgba(255,255,255,0.03)', borderRadius: '32px' }}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>키 (Height)</label>
                    <div className="relative flex-row items-center">
                        <input type="number" placeholder="예: 175" value={bodyData.height} onChange={e => setBodyData({...bodyData, height: e.target.value})} 
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '16px 48px 16px 20px', color: 'white', fontSize: '18px', outline: 'none', minWidth: 0, boxSizing: 'border-box', width: '100%' }} />
                        <span className="absolute" style={{ right: '20px', color: '#666', fontWeight: 500 }}>cm</span>
                    </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>몸무게 (Weight)</label>
                    <div className="relative flex-row items-center">
                        <input type="number" placeholder="예: 70" value={bodyData.weight} onChange={e => setBodyData({...bodyData, weight: e.target.value})} 
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '16px 48px 16px 20px', color: 'white', fontSize: '18px', outline: 'none', minWidth: 0, boxSizing: 'border-box', width: '100%' }} />
                        <span className="absolute" style={{ right: '20px', color: '#666', fontWeight: 500 }}>kg</span>
                    </div>
                </div>
                <div className="flex-row gap-4" style={{ display: 'flex' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>성별</label>
                        <select value={bodyData.gender} onChange={e => setBodyData({...bodyData, gender: e.target.value})} 
                            style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '16px 20px', color: 'white', fontSize: '16px', outline: 'none', WebkitAppearance: 'none' }}>
                            <option value="">성별 선택</option>
                            <option value="male">남성 (Male)</option>
                            <option value="female">여성 (Female)</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>나이</label>
                        <input type="number" placeholder="예: 28" value={bodyData.age} onChange={e => setBodyData({...bodyData, age: e.target.value})} 
                            style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '16px 20px', color: 'white', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                </div>
            </div>

            <button 
                onClick={() => setStep(2)}
                disabled={!bodyData.height || !bodyData.weight || !bodyData.gender}
                className="primary-button"
                style={{ marginTop: '32px', width: '100%', padding: '20px 0', fontSize: '18px', opacity: (!bodyData.height || !bodyData.weight || !bodyData.gender) ? 0.5 : 1 }}
            >
                다음: 사진 업로드
            </button>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-col" style={{ flex: 1, padding: '32px 0' }}>
            <h2 className="outfit" style={{ fontSize: '28px', fontWeight: 800, color: 'white', margin: '0 0 12px 0' }}>전신 사진 <span style={{ color: 'var(--primary)' }}>업로드</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 32px 0', wordBreak: 'keep-all' }}>타이트한 옷을 입고 촬영해주시면<br/>AI가 훨씬 더 정교하게 아바타를 생성합니다.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', flex: 1 }}>
                {[
                    { id: 'front', label: '정면' },
                    { id: 'back', label: '후면' },
                    { id: 'left', label: '좌측면' },
                    { id: 'right', label: '우측면' }
                ].map(view => (
                    <div key={view.id} className="relative flex-col items-center justify-center glass-panel" style={{ height: '140px', borderRadius: '24px', overflow: 'hidden', border: '1px dashed rgba(255,255,255,0.2)' }}>
                        {photos[view.id] ? (
                            <>
                                <img src={photos[view.id]!} alt={view.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                <div className="absolute flex-col items-center justify-center w-full h-full" style={{ top: 0, left: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s', zIndex: 1 }}
                                     onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                                    <Camera size={24} color="white" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>다시 촬영</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex-col items-center justify-center" style={{ padding: '16px', height: '100%', pointerEvents: 'none', textAlign: 'center' }}>
                                <UserCircle2 size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: '12px' }} />
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{view.label}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', whiteSpace: 'nowrap' }}>촬영/업로드</div>
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="absolute"
                            style={{ inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                            title={`${view.label} 업로드`}
                            onChange={(e) => handlePhotoUpload(view.id, e)}
                        />
                    </div>
                ))}
            </div>

            <div className="flex-row gap-4" style={{ marginTop: '32px', display: 'flex' }}>
                <button 
                    onClick={() => setStep(1)}
                    className="glass-button"
                    style={{ flex: 1, padding: '20px 0', fontSize: '16px', borderRadius: '16px', margin: 0 }}
                >
                    이전
                </button>
                <button 
                    onClick={startGeneration}
                    disabled={!photos.front}
                    className="primary-button"
                    style={{ flex: 1.5, padding: '20px 0', fontSize: '16px', borderRadius: '16px', opacity: !photos.front ? 0.5 : 1, margin: 0 }}
                >
                    AI 생성 시작
                </button>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-col items-center justify-center" style={{ flex: 1, background: 'radial-gradient(circle at 50% 50%, #2a1040 0%, var(--bg-dark) 100%)' }}>
            <div className="relative flex-row items-center justify-center" style={{ width: '192px', height: '192px', marginBottom: '32px' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} className="absolute" style={{ inset: 0, borderRadius: '50%', border: '2px dashed rgba(157,78,221,0.3)' }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} className="absolute" style={{ inset: '16px', borderRadius: '50%', border: '2px solid rgba(255,0,110,0.2)' }} />
                <Activity size={48} color="var(--primary)" className="animate-pulse" />
            </div>
            
            <h2 className="outfit" style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>AI 아바타 생성 중... {progress}%</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', height: '24px' }}>{statusText}</p>

            <div style={{ width: '256px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', marginTop: '32px' }}>
                <motion.div 
                    style={{ height: '100%', background: 'linear-gradient(to right, var(--primary), var(--secondary))' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                />
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-col relative" style={{ flex: 1, paddingTop: '48px', paddingBottom: '96px', zIndex: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div className="flex-row items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.2)', marginBottom: '16px', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={32} color="#4ade80" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: '0 0 8px 0' }}>3D 아바타 생성 완료!</h2>
                <p style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>입력된 데이터로 생성된 신체 치수</p>
            </div>
            
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '24px', border: '1px solid rgba(157,78,221,0.2)', background: 'rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {scannedData && Object.entries(scannedData).map(([k, v]) => (
                        <div key={k} className="flex-col items-center justify-center glass-panel" style={{ padding: '12px', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px', letterSpacing: '0.05em' }}>{k}</div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{Math.round(v as number)}<span style={{ fontSize: '10px', fontWeight: 'normal', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>cm</span></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-col" style={{ marginTop: 'auto', paddingTop: '32px' }}>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="primary-button outfit"
                    style={{ width: '100%', padding: '16px 0', borderRadius: '16px', fontSize: '18px' }}
                >
                    내 아바타 확인하러 가기
                </button>
            </div>
        </motion.div>
    );

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
            {/* Header / Top Navigation */}
            <div className="absolute flex-row justify-between items-center" style={{ top: 0, left: 0, right: 0, padding: '24px', zIndex: 20, background: 'linear-gradient(to bottom, var(--bg-dark), transparent)' }}>
                <button 
                    onClick={() => step > 1 && step < 3 ? setStep(step - 1) : navigate(-1)} 
                    className="flex-row items-center justify-center glass-panel"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <ChevronLeft size={24} color="white" />
                </button>
                <div className="glass-panel" style={{ padding: '10px 20px', borderRadius: '999px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="outfit" style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.05em' }}>AI Avatar Engine</span>
                </div>
            </div>

            {/* Scrollable Content Wrapper */}
            <div className="flex-col" style={{ flex: 1, width: '100%', maxWidth: '480px', margin: '0 auto', padding: '96px 24px 40px', overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                    {step === 1 && <motion.div key="step1" className="flex-col" style={{ minHeight: '100%', display: 'flex' }}>{renderStep1()}</motion.div>}
                    {step === 2 && <motion.div key="step2" className="flex-col" style={{ minHeight: '100%', display: 'flex' }}>{renderStep2()}</motion.div>}
                    {step === 3 && <motion.div key="step3" className="flex-col" style={{ minHeight: '100%', display: 'flex' }}>{renderStep3()}</motion.div>}
                    {step === 4 && <motion.div key="step4" className="flex-col" style={{ minHeight: '100%', display: 'flex' }}>{renderStep4()}</motion.div>}
                </AnimatePresence>
            </div>
        </div>
    );
}
