import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Activity, ScanFace, Focus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';

// [솔로몬 & 다니엘 MVP 제안] 기본 아바타 뼈대에 유저 수치 대입 모델
function BasicAvatar({ measurements }: { measurements: any }) {
    // 추출된 치수를 기반으로 비율(Scale) 계산
    const heightScale = measurements?.height ? measurements.height / 175 : 1;
    const shoulderScale = measurements?.shoulder ? measurements.shoulder / 45 : 1;
    const chestScale = measurements?.chest ? measurements.chest / 95 : 1;
    const legScale = measurements?.legLength ? measurements.legLength / 100 : 1;

    return (
        <group scale={[1, heightScale, 1]} position={[0, -1, 0]}>
            <mesh position={[0, 1, 0]} castShadow> {/* 골반 */}
                <boxGeometry args={[0.4 * shoulderScale, 0.3, 0.25 * chestScale]} />
                <meshStandardMaterial color="#5a189a" />
            </mesh>
            <mesh position={[0, 1.5, 0]} castShadow> {/* 가슴/상체 */}
                <boxGeometry args={[0.5 * shoulderScale, 0.7, 0.3 * chestScale]} />
                <meshStandardMaterial color="#9d4edd" />
            </mesh>
            <mesh position={[0, 2.1, 0]} castShadow> {/* 머리 */}
                <sphereGeometry args={[0.2, 32, 32]} />
                <meshStandardMaterial color="#e0aaff" />
            </mesh>
            <mesh position={[-0.3 * shoulderScale - 0.05, 1.4, 0]} castShadow> {/* 왼팔 */}
                <cylinderGeometry args={[0.08, 0.06, 0.8, 16]} />
                <meshStandardMaterial color="#7b2cbf" />
            </mesh>
            <mesh position={[0.3 * shoulderScale + 0.05, 1.4, 0]} castShadow> {/* 오른팔 */}
                <cylinderGeometry args={[0.08, 0.06, 0.8, 16]} />
                <meshStandardMaterial color="#7b2cbf" />
            </mesh>
            <mesh position={[-0.12, 0.4 * legScale, 0]} castShadow> {/* 왼다리 */}
                <cylinderGeometry args={[0.09, 0.07, 0.9 * legScale, 16]} />
                <meshStandardMaterial color="#3c096c" />
            </mesh>
            <mesh position={[0.12, 0.4 * legScale, 0]} castShadow> {/* 오른다리 */}
                <cylinderGeometry args={[0.09, 0.07, 0.9 * legScale, 16]} />
                <meshStandardMaterial color="#3c096c" />
            </mesh>
        </group>
    );
}

export default function Scan3D() {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("카메라를 정면으로 향하고 화면의 지시선에 몸을 맞춰주세요.");
    const [isAgreed, setIsAgreed] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [scannedData, setScannedData] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!isAgreed || isFinished) return;

        let streamRef: MediaStream | null = null;
        let interval: ReturnType<typeof setInterval>;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    streamRef = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.log("카메라 접근 불가", err));
        }

        interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                const newProgress = prev + Math.floor(Math.random() * 5) + 3;

                if (newProgress >= 20 && prev < 20) setStatusText("ARKit 뎁스 맵 계측 중... (키, 흉곽)");
                if (newProgress >= 50 && prev < 50) setStatusText("포인트 클라우드 추론 완료! (비율 계산)");
                if (newProgress >= 80 && prev < 80) setStatusText("아바타 폴리곤 모델링 매핑 중...");
                if (newProgress >= 100 && prev < 100) {
                    setStatusText("스캔이 완료되었습니다.");

                    // ARKit에서 추출되었다고 가정하는 정교한 치수 데이터
                    const extractedMeasurements = {
                        height: 175 + Math.floor(Math.random() * 10 - 5), // 170~180 랜덤 예시
                        shoulder: 45 + Math.floor(Math.random() * 4 - 2),
                        chest: 95 + Math.floor(Math.random() * 6 - 3),
                        armLength: 60,
                        waist: 78,
                        hip: 98,
                        legLength: 102 + Math.floor(Math.random() * 6 - 3)
                    };
                    
                    localStorage.setItem('lookUpMeasurements', JSON.stringify(extractedMeasurements));
                    setScannedData(extractedMeasurements);

                    setTimeout(() => {
                        if (streamRef) {
                            streamRef.getTracks().forEach(track => track.stop());
                        }
                        setIsFinished(true); // 스캔 완료 애니메이션 전환
                    }, 1000);
                    return 100;
                }
                return newProgress;
            });
        }, 300);

        return () => {
            clearInterval(interval);
            if (streamRef) {
                streamRef.getTracks().forEach(track => track.stop());
            }
        };
    }, [isAgreed, isFinished]);

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
                        <button onClick={() => setIsAgreed(true)} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, boxShadow: '0 4px 20px rgba(157, 78, 221, 0.4)' }}>동의 후 스캔 시작</button>
                    </div>
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
                                style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6) contrast(1.1) grayscale(0.2)' }}
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
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.4 }}
                            style={{ width: '100%', height: '100%', position: 'absolute', background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a0a 100%)' }}
                        >
                            <Canvas camera={{ position: [0, 1, 4], fov: 50 }}>
                                <ambientLight intensity={0.5} />
                                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                                <Environment preset="city" />
                                
                                <BasicAvatar measurements={scannedData} />
                                
                                <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={10} blur={2} far={4} />
                                <OrbitControls enablePan={false} enableZoom={true} minDistance={2} maxDistance={6} maxPolarAngle={Math.PI / 2 + 0.1} autoRotate={true} autoRotateSpeed={2} />
                            </Canvas>

                            {/* 우측 수치 데이터 패널 */}
                            <motion.div 
                                initial={{ x: 50, opacity: 0 }} 
                                animate={{ x: 0, opacity: 1 }} 
                                transition={{ delay: 0.5 }}
                                style={{ position: 'absolute', right: '24px', top: '80px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                            >
                                {scannedData && Object.entries(scannedData).slice(0, 4).map(([k, v]) => (
                                    <div key={k} className="glass-panel" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(157, 78, 221, 0.3)', backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.5)', textAlign: 'right' }}>
                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{k}</span>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>{v as number}<span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}> cm</span></div>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Status Panel */}
                <div style={{
                    position: 'absolute', bottom: isFinished ? '40px' : '80px', left: '20px', right: '20px',
                    textAlign: 'center', zIndex: 20
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
