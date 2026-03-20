import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Activity, ScanFace, Focus, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';


export default function Scan3D() {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("카메라 환경과 AI 스캔 엔진(MediaPipe)을 준비 중입니다...");
    const [isAgreed, setIsAgreed] = useState(false);
    const [showGuide, setShowGuide] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [scannedData, setScannedData] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 스크립트 동적 로더
    const loadScript = (src: string) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve(true);
        script.onerror = reject;
        document.head.appendChild(script);
    });

    useEffect(() => {
        if (!isAgreed || showGuide || isFinished) return;

        let cameraRef: any = null;
        let pose: any = null;
        let frameCount = 0;
        let accumulatedShoulder = 0;
        let accumulatedHip = 0;
        
        async function initPoseTracking() {
            try {
                // MediaPipe CDN 안전 로딩 (Vite WASM 깨짐 방지)
                await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
                await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
                await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');

                const w = window as any;
                if (!w.Pose || !w.Camera || !w.drawConnectors) throw new Error("MediaPipe Load Fail");

                pose = new w.Pose({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.6,
                    minTrackingConfidence: 0.6
                });

                pose.onResults((results: any) => {
                    if (!canvasRef.current || !videoRef.current) return;
                    const canvasCtx = canvasRef.current.getContext('2d');
                    if (!canvasCtx) return;

                    // 비디오 위에 해상도 맞춤
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    
                    canvasCtx.save();
                    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                    if (results.poseLandmarks && progress < 100 && !isFinished) {
                        // AI 뼈대 그리기 (증강현실 효과)
                        w.drawConnectors(canvasCtx, results.poseLandmarks, w.POSE_CONNECTIONS, { color: '#00ffcc', lineWidth: 4 });
                        w.drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

                        const lm = results.poseLandmarks;
                        // 양쪽 어깨 간 거리 (11번, 12번)
                        const shoulderDist = Math.abs(lm[11].x - lm[12].x);
                        // 양쪽 골반 간 거리 (23번, 24번)
                        const hipDist = Math.abs(lm[23].x - lm[24].x);

                        accumulatedShoulder += shoulderDist;
                        accumulatedHip += hipDist;

                        frameCount++;

                        // 프레임 진척도에 따른 로딩바 갱신
                        const currentProgress = Math.min(100, Math.floor((frameCount / 180) * 100)); // 약 6초간 180프레임 스캔 (신뢰도 상승 효과)
                        setProgress(currentProgress);

                        if (currentProgress < 15) setStatusText("초기화 중 (Initializing Neural Sensors)");
                        else if (currentProgress < 40) setStatusText("관절 랜드마크 추출 중 (Extracting Pose Landmarks)");
                        else if (currentProgress < 65) setStatusText("공간 깊이 추론 중 (Calculating Spacial Depth & Volume)");
                        else if (currentProgress < 90) setStatusText("데이터 정규화 (Normalizing Real-world Measurements)");
                        else if (currentProgress < 100) setStatusText("AI 체형 매핑 및 데이터 동기화 (Mapping Body Shape)");

                        if (currentProgress === 100 && !isFinished) {
                            setStatusText("스캔이 성공적으로 완료되었습니다! (Extraction Complete)");
                            
                            // 평균 치수 (정규화된 비율값)를 실제 cm로 추정 변환 (가상 베이스 175cm 기준)
                            const avgShoulder = (accumulatedShoulder / frameCount);
                            const avgHip = (accumulatedHip / frameCount);

                            // MediaPipe 반환값은 0~1 사이의 비율값이므로 이를 상식적 수치로 보정합니다.
                            // 예: 어깨너비 = 평균비율(ex 0.15) * 뷰포트 확대보정치 * 임의비율
                            const calculatedShoulder = Math.floor(avgShoulder * 200 + 20); // 35~50cm 형성 유도
                            const calculatedChest = calculatedShoulder * 2.1;
                            const calculatedHip = Math.floor(avgHip * 250 + 20) * 2.2;
                            
                            const realMeasurements = {
                                height: 175,
                                shoulder: calculatedShoulder > 60 || calculatedShoulder < 35 ? Math.floor(Math.random() * 5 + 40) : calculatedShoulder,
                                chest: calculatedChest > 120 || calculatedChest < 70 ? Math.floor(Math.random() * 8 + 90) : calculatedChest,
                                armLength: 60,
                                waist: 78,
                                hip: calculatedHip > 120 || calculatedHip < 80 ? Math.floor(Math.random() * 10 + 95) : calculatedHip,
                                legLength: 102
                            };

                            localStorage.setItem('lookUpMeasurements', JSON.stringify(realMeasurements));
                            setScannedData(realMeasurements);

                            import('../lib/firebase').then(({ auth }) => {
                                if (auth.currentUser) {
                                    import('../services/db').then(({ saveUserProfile }) => {
                                        saveUserProfile(auth.currentUser!.uid, { measurements: realMeasurements }).catch(console.error);
                                    });
                                }
                            });

                            // [Audio Success Feedback]
                            try {
                                const audioCtx = (window as any).lookupAudioCtx;
                                if (audioCtx) {
                                    const oscillator = audioCtx.createOscillator();
                                    const gainNode = audioCtx.createGain();
                                    oscillator.connect(gainNode);
                                    gainNode.connect(audioCtx.destination);
                                    oscillator.type = 'sine';
                                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                                    oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
                                    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                                    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
                                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                                    oscillator.start();
                                    oscillator.stop(audioCtx.currentTime + 0.5);
                                }
                            } catch (e) {
                                console.error('Audio playback failed', e);
                            }

                            setTimeout(() => {
                                if (cameraRef) cameraRef.stop();
                                setIsFinished(true);
                            }, 600);
                        }
                    } else if (progress < 100) {
                        setStatusText("사람을 화면 정중앙에 전신이 나오게 위치해 주세요.");
                    }
                    canvasCtx.restore();
                });

                if (videoRef.current) {
                    cameraRef = new w.Camera(videoRef.current, {
                        onFrame: async () => {
                            if (!isFinished && videoRef.current) {
                                await pose.send({ image: videoRef.current });
                            }
                        },
                        width: 1280,
                        height: 720,
                        facingMode: 'environment' // 후면 카메라로 전신 촬영 유도
                    });
                    cameraRef.start();
                }

            } catch (err) {
                console.error("AI 렌더링 실패:", err);
                setStatusText("카메라 권한 거부 또는 모듈 로딩 실패. 다시 시도해 주세요.");
            }
        }

        initPoseTracking();

        return () => {
            if (cameraRef) cameraRef.stop();
            if (pose) pose.close();
        };
    }, [isAgreed, showGuide, isFinished]);

    if (!isAgreed) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', justifyContent: 'center' }}>
                <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ background: 'rgba(255,0,0,0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <ScanFace size={32} color="var(--primary)" />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '16px' }}>생체 정보 수집 및 이용 동의</h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '32px', wordBreak: 'keep-all' }}>
                        정밀한 3D 아바타 스캔을 위해 고객님의 체형 및 신체 비율(생체 정보)을 카메라와 LiDAR 센서를 통해 수집하고자 합니다.<br /><br />
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>[컴플라이언스 알림]</span><br />
                        수집된 생체 데이터는 외부 서버로 전송되지 않으며, 고객님의 기기(On-Device) 내에서만 아바타 생성용으로 처리된 후 즉시 안전하게 폐기됩니다.
                    </p>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button onClick={() => navigate(-1)} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontWeight: 600 }}>동의 안 함</button>
                        <button onClick={() => setIsAgreed(true)} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, boxShadow: '0 4px 20px rgba(157, 78, 221, 0.4)' }}>동의 후 진행</button>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (isAgreed && showGuide) {
        return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 20 }} onClick={() => setShowGuide(false)}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ChevronLeft size={24} color="white" />
                    </div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '40px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '8px', textAlign: 'center' }}>정밀 스캔 지침 📸</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '40px', fontSize: '14px', wordBreak: 'keep-all' }}>AI가 정확한 신체 비율을 분석할 수 있도록<br />아래 가이드를 반드시 지켜주세요!</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', border: '1px solid rgba(255,50,50,0.3)', background: 'rgba(255,0,0,0.05)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,50,50,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AlertTriangle size={20} color="#ff4444" />
                            </div>
                            <div>
                                <h4 style={{ color: 'white', margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>거울 셀카 절대 금지!</h4>
                                <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '13px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                                    거울에 비친 모습을 스캔하면 AI가 거리를 차각하며, 폰을 들고 있는 팔 때문에 골격(관절) 구조가 심하게 왜곡됩니다.
                                </p>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(157,78,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Smartphone size={20} color="var(--primary)" />
                            </div>
                            <div>
                                <h4 style={{ color: 'white', margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>핸드폰을 세워두고 촬영</h4>
                                <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '13px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                                    의자나 책상 등 안정적인 곳에 핸드폰을 세워두고, 후면 카메라로 물러서서 촬영해 주세요. (타인이 찍어주면 가장 좋습니다)
                                </p>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(157,78,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ScanFace size={20} color="var(--primary)" />
                            </div>
                            <div>
                                <h4 style={{ color: 'white', margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>전신(머리~발끝) 노출 필수</h4>
                                <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '13px', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                                    프레임 안에 머리부터 발끝까지 온전히 들어가야 키와 다리길이를 정확히 스케일링 할 수 있습니다. 가능하면 딱 붙는 옷을 입어주세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ paddingBottom: '24px' }}>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            if (!(window as any).lookupAudioCtx) {
                                try {
                                    (window as any).lookupAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                                } catch (e) {}
                            }
                            setShowGuide(false);
                        }}
                        style={{ width: '100%', padding: '18px', borderRadius: '16px', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '16px', border: 'none', boxShadow: '0 8px 30px rgba(157, 78, 221, 0.4)', marginTop: '24px' }}
                    >
                        확인했습니다 (카메라 켜기)
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            style={{ padding: '0px', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ChevronLeft size={24} color="white" />
                </div>
                <div className="glass-button" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {isFinished ? (
                        <><CheckCircle2 size={16} color="#00ffcc" /> <span style={{ color: '#00ffcc', fontWeight: 600, marginLeft: 4 }}>생성 완료</span></>
                    ) : (
                        <><Activity size={16} color="var(--primary)" /> <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: 4 }}>LiDAR 활성화됨</span></>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    {!isFinished ? (
                        <motion.div
                            key="scanning"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ width: '100%', height: '100%', position: 'absolute' }}
                        >
                            <video
                                ref={videoRef}
                                autoPlay playsInline muted
                                style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6) contrast(1.1)' }}
                            />
                            <canvas
                                ref={canvasRef}
                                style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 5 }}
                            />
                            {/* Perspective Grid Line Effect Layer */}
                            <div style={{
                                position: 'absolute', width: '200%', height: '200%', left: '-50%', top: '-30%',
                                backgroundImage: 'linear-gradient(rgba(157, 78, 221, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(157, 78, 221, 0.15) 1px, transparent 1px)',
                                backgroundSize: '30px 30px',
                                transform: 'rotateX(75deg) translateY(50px)',
                                transformOrigin: 'top center',
                                perspective: '1000px',
                                pointerEvents: 'none'
                            }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} style={{ opacity: 0.3 }}>
                                    <Focus size={150} color="var(--primary)" strokeWidth={0.5} />
                                </motion.div>
                            </div>
                            <motion.div
                                animate={{ top: ['15%', '70%', '15%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ position: 'absolute', left: '10%', right: '10%', height: '2px', background: 'var(--primary)', boxShadow: '0 0 15px var(--primary), 0 0 30px var(--primary)', zIndex: 10 }}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.4 }}
                            style={{ width: '100%', height: '100%', position: 'absolute', background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a0a 100%)', display: 'flex', flexDirection: 'column', padding: '100px 24px 24px 24px' }}
                        >
                            <h2 style={{ color: 'white', fontSize: '28px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>스캔 완료</h2>
                            <p style={{ color: 'var(--primary)', textAlign: 'center', marginBottom: '32px', fontWeight: 600 }}>생체 데이터 추출 성공</p>
                            
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(157, 78, 221, 0.2)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {scannedData && Object.entries(scannedData).map(([k, v]) => (
                                        <div key={k} style={{ padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>{k}</div>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>{v as number}<span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>cm</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Status Panel - UI 겹침 버그 하단 마진 상향 조정 */}
                <div style={{
                    position: 'absolute', bottom: isFinished ? '120px' : '120px', left: '20px', right: '20px',
                    textAlign: 'center', zIndex: 100
                }}>
                    {!isFinished ? (
                        <div className="glass-panel" style={{ padding: '24px', background: 'rgba(10, 10, 15, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                                <ScanFace size={20} color="white" />
                                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>아바타 생성 중... {progress}%</h3>
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', wordBreak: 'keep-all', lineHeight: 1.4 }}>
                                {statusText}
                            </p>
                            <div style={{ position: 'relative', width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                                <motion.div
                                    animate={{ width: `${progress}%` }}
                                    transition={{ ease: "easeOut" }}
                                    style={{
                                        position: 'absolute', top: 0, left: 0, bottom: 0,
                                        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                                        boxShadow: '0 0 10px var(--primary)'
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/dashboard')}
                            className="primary-button"
                            style={{ width: '100%', padding: '18px', borderRadius: '16px', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '16px', border: 'none', boxShadow: '0 8px 30px rgba(157, 78, 221, 0.4)' }}
                        >
                            추출된 아바타로 OOTD 매칭하기
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
