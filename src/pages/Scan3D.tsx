import { motion } from 'framer-motion';
import { ChevronLeft, Activity, ScanFace, Focus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export default function Scan3D() {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("카메라를 정면으로 향하고 화면의 지시선에 몸을 맞춰주세요.");
    const [isAgreed, setIsAgreed] = useState(false); // [모세 제안] 생체정보 동의 상태
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!isAgreed) return;

        let streamRef: MediaStream | null = null;
        let interval: ReturnType<typeof setInterval>;

        // Start camera stream safely (느헤미야 제안)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    streamRef = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.log("카메라 접근 권한이 없습니다.", err));
        }

        // Progress mock logic
        interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                const newProgress = prev + Math.floor(Math.random() * 5) + 3; // 3~7씩 증가

                if (newProgress >= 20 && prev < 20) setStatusText("3D LiDAR 정밀 계측 중... (키, 흉곽)");
                if (newProgress >= 50 && prev < 50) setStatusText("골격 길이 측정 완료! (팔 다리 길이, 얼굴 크기)");
                if (newProgress >= 80 && prev < 80) setStatusText("근육량 및 부피 측정 완료 (가슴, 허벅지, 힙)");
                if (newProgress >= 100 && prev < 100) {
                    setStatusText("스캔이 완료되었습니다. 나의 3D 아바타를 확인합니다.");

                    const fakeMeasurements = {
                        height: 175,
                        shoulder: 45,
                        chest: 95,
                        armLength: 60,
                        waist: 78,
                        hip: 98,
                        legLength: 102
                    };
                    localStorage.setItem('lookUpMeasurements', JSON.stringify(fakeMeasurements));

                    setTimeout(() => {
                        if (streamRef) {
                            streamRef.getTracks().forEach(track => track.stop());
                        }
                        navigate('/dashboard');
                    }, 1500);
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
    }, [navigate, isAgreed]);

    // [모세 특별 가이드] 생체 정보 수집 동의 UI (앱스토어 리젝 방어)
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
            {/* Header / Top Nav */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ChevronLeft size={24} color="white" />
                </div>
                <div className="glass-button" style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Activity size={16} color="var(--primary)" /> <span style={{ color: 'var(--primary)', fontWeight: 600 }}>LiDAR 활성화됨</span>
                </div>
            </div>

            {/* Camera Viewport & AR Overlay */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* Real Device Camera Feed (If allowed) */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
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

                {/* AR Scanning Corner Brackets */}
                <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
                    <div style={{ position: 'absolute', top: '15%', left: '10%', width: '40px', height: '40px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderRadius: '8px 0 0 0' }} />
                    <div style={{ position: 'absolute', top: '15%', right: '10%', width: '40px', height: '40px', borderTop: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderRadius: '0 8px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: '30%', left: '10%', width: '40px', height: '40px', borderBottom: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderRadius: '0 0 0 8px' }} />
                    <div style={{ position: 'absolute', bottom: '30%', right: '10%', width: '40px', height: '40px', borderBottom: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderRadius: '0 0 8px 0' }} />
                </motion.div>

                {/* Center Human Silhouette/Focus UI */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                        style={{ opacity: 0.3 }}
                    >
                        <Focus size={150} color="var(--primary)" strokeWidth={0.5} />
                    </motion.div>
                </div>

                {/* Scanning Laser Line */}
                <motion.div
                    animate={{ top: ['15%', '70%', '15%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ position: 'absolute', left: '10%', right: '10%', height: '2px', background: 'var(--primary)', boxShadow: '0 0 15px var(--primary), 0 0 30px var(--primary)', zIndex: 10 }}
                />

                {/* Bottom Status Panel */}
                <div style={{
                    position: 'absolute', bottom: '150px', left: '20px', right: '20px',
                    textAlign: 'center', zIndex: 20
                }}>
                    <div className="glass-panel" style={{ padding: '24px', display: 'inline-block', width: '100%', background: 'rgba(10, 10, 15, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                            <ScanFace size={20} color="white" />
                            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>아바타 생성 중... {progress}%</h3>
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', wordBreak: 'keep-all', lineHeight: 1.4 }}>
                            {statusText}
                        </p>

                        {/* Custom Progress Bar */}
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
                </div>
            </div>
        </motion.div>
    );
}
