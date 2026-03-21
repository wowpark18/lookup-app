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
    const [scannedData, setScannedData] = useState<any>(null);

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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-extrabold text-white mb-2 text-center">기본 체형 데이터 입력</h2>
            <p className="text-gray-400 text-center mb-8 text-sm">AI가 정확한 3D 비례를 계산하기 위해<br/>꼭 필요한 기초 데이터입니다.</p>
            
            <div className="glass-panel p-6 rounded-3xl space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">키 (Height)</label>
                    <div className="relative">
                        <input type="number" placeholder="예: 175" value={bodyData.height} onChange={e => setBodyData({...bodyData, height: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">cm</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">몸무게 (Weight)</label>
                    <div className="relative">
                        <input type="number" placeholder="예: 70" value={bodyData.weight} onChange={e => setBodyData({...bodyData, weight: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">kg</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">성별</label>
                        <select value={bodyData.gender} onChange={e => setBodyData({...bodyData, gender: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none max-h-40 overflow-y-auto">
                            <option value="">선택</option>
                            <option value="male">남성</option>
                            <option value="female">여성</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">나이</label>
                        <input type="number" placeholder="예: 28" value={bodyData.age} onChange={e => setBodyData({...bodyData, age: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary" />
                    </div>
                </div>
            </div>

            <button 
                onClick={() => setStep(2)}
                disabled={!bodyData.height || !bodyData.weight || !bodyData.gender}
                className="primary-button mt-8 w-full py-4 rounded-xl font-bold bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
                다음: 사진 업로드
            </button>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col pt-8">
            <h2 className="text-2xl font-extrabold text-white mb-2 text-center">전신 사진 업로드</h2>
            <p className="text-gray-400 text-center mb-8 text-sm break-keep">타이트한 옷을 입고 촬영해주시면<br/>AI가 훨씬 더 정교하게 아바타를 생성합니다.</p>
            
            <div className="grid grid-cols-2 gap-4 flex-1">
                {[
                    { id: 'front', label: '정면 (Front)' },
                    { id: 'back', label: '후면 (Back)' },
                    { id: 'left', label: '좌측면 (Left)' },
                    { id: 'right', label: '우측면 (Right)' }
                ].map(view => (
                    <div key={view.id} className="relative aspect-[3/4] bg-black/40 rounded-2xl border-2 border-dashed border-white/10 overflow-hidden flex flex-col items-center justify-center group hover:border-primary/50 transition-colors">
                        {photos[view.id] ? (
                            <>
                                <img src={photos[view.id]!} alt={view.label} className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="text-white flex flex-col items-center">
                                        <Camera size={24} className="mb-2" />
                                        <span className="text-xs font-bold">다시 촬영</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-4">
                                <UserCircle2 size={32} className="mx-auto mb-2 text-white/20" />
                                <div className="text-sm font-bold text-white/60">{view.label}</div>
                                <div className="text-[10px] text-white/40 mt-1">터치하여 촬영/업로드</div>
                            </div>
                        )}
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handlePhotoUpload(view.id, e)}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-8 flex gap-4">
                <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 rounded-xl font-bold bg-white/10 text-white"
                >
                    이전으로
                </button>
                <button 
                    onClick={startGeneration}
                    disabled={!photos.front}
                    className="flex-1 py-4 rounded-xl font-bold bg-primary text-white disabled:opacity-50"
                >
                    AI 생성 시작
                </button>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_50%,#2a1040_0%,#0a0a0a_100%)]">
            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} className="absolute inset-4 rounded-full border-2 border-solid border-secondary/20" />
                <Activity size={48} className="text-primary animate-pulse" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">AI 아바타 생성 중... {progress}%</h2>
            <p className="text-sm text-gray-400 h-6">{statusText}</p>

            <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden mt-8">
                <motion.div 
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                />
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col pt-12 pb-24 h-full relative z-10">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                    <CheckCircle2 size={32} className="text-green-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">3D 아바타 생성 완료!</h2>
                <p className="text-primary text-sm font-bold">입력된 데이터로 생성된 신체 치수</p>
            </div>
            
            <div className="glass-panel p-5 rounded-3xl border border-primary/20 bg-black/40">
                <div className="grid grid-cols-2 gap-3">
                    {scannedData && Object.entries(scannedData).map(([k, v]) => (
                        <div key={k} className="p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center">
                            <div className="text-[10px] text-white/50 uppercase font-bold mb-1 tracking-wider">{k}</div>
                            <div className="text-xl font-extrabold text-white">{Math.round(v as number)}<span className="text-[10px] font-normal text-white/40 ml-1">cm</span></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto pt-8">
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="primary-button w-full py-4 rounded-xl font-bold text-lg bg-primary text-white shadow-[0_0_30px_rgba(157,78,221,0.3)]"
                >
                    내 아바타 확인하러 가기
                </button>
            </div>
        </motion.div>
    );

    return (
        <div style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div onClick={() => step > 1 && step < 3 ? setStep(step - 1) : navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ChevronLeft size={24} color="white" />
                </div>
                <div className="glass-button" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '12px' }}>AI Avatar Engine</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative mt-12 w-full max-w-md mx-auto">
                <AnimatePresence mode="wait">
                    {step === 1 && <motion.div key="step1" className="flex-1 flex flex-col h-full">{renderStep1()}</motion.div>}
                    {step === 2 && <motion.div key="step2" className="flex-1 flex flex-col h-full">{renderStep2()}</motion.div>}
                    {step === 3 && <motion.div key="step3" className="flex-1 flex flex-col h-full">{renderStep3()}</motion.div>}
                    {step === 4 && <motion.div key="step4" className="flex-1 flex flex-col h-full">{renderStep4()}</motion.div>}
                </AnimatePresence>
            </div>
        </div>
    );
}
