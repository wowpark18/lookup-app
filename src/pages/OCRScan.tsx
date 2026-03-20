import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Tag, Shirt, ChevronLeft, Image as ImageIcon, Zap, X, Sparkles, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function OCRScan() {
    const navigate = useNavigate();
    const [scanMode, setScanMode] = useState<'receipt' | 'tag' | 'clothes'>('clothes');
    const [isScanning, setIsScanning] = useState(false);
    const [capturedItems, setCapturedItems] = useState<{ mode: string, id: number }[]>([]);
    const [showSubscription, setShowSubscription] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false); // [다니엘 제안] AI 비전 인식 상태

    useEffect(() => {
        let streamRef: MediaStream | null = null;
        // Start camera stream
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    streamRef = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.log("카메라 접근 권한이 없습니다.", err));
        }

        return () => {
            if (streamRef) {
                streamRef.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        // 프리미엄 결제 유도 (옷장 30벌 제한 시뮬레이션 - 시연용으로 10벌 등록시 제한)
        if (capturedItems.length >= 10) {
            setShowSubscription(true);
            return;
        }

        if (isScanning) return;
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            setCapturedItems(prev => [...prev, { mode: scanMode, id: Date.now() }]);
        }, 600);
    };

    const handleUpload = async () => {
        if (capturedItems.length === 0) {
            alert('스캔된 항목이 없습니다.');
            return;
        }
        
        setIsAnalyzing(true);

        try {
            // [느헤미야 팀] 리얼 데이터베이스 연동 및 저장
            const { auth } = await import('../lib/firebase');
            const { addWardrobeItem } = await import('../services/db');

            if (auth.currentUser) {
                for (let i = 0; i < capturedItems.length; i++) {
                    await addWardrobeItem({
                        userId: auth.currentUser.uid,
                        imageUrl: "mock_image_url", // 추후 실제 카메라 이미지 Blob 저장 처리 공간
                        category: capturedItems[i].mode, // tag, clothes 등
                        brand: "AI Parsed Brand", 
                    });
                }
            }
            
            setTimeout(() => {
                setIsAnalyzing(false);
                alert(`[AI Vision 및 백엔드 저장 완료]\n\n총 ${capturedItems.length}개의 데이터 분석 성공 및 DB 동기화 완료!\n의류 속성: Navy, Cotton 100%\n추천 세탁법: 드라이클리닝 권장\n\n내 옷장에 데이터가 성공적으로 병합되었습니다.`);
                setCapturedItems([]);
                navigate('/');
            }, 1500);

        } catch (e) {
            console.error(e);
            alert("데이터베이스 저장에 실패했습니다.");
            setIsAnalyzing(false);
        }
    };

    const getGuideText = () => {
        switch (scanMode) {
            case 'receipt': return "영수증 전체가 나오도록 화면에 맞춰주세요.\n(웹사이트 및 구매 정보 자동 추출)";
            case 'tag': return "의류 안쪽의 케어라벨(텍)이 잘 보이게 비춰주세요.\n(소재 및 세탁 기호 자동 추출)";
            case 'clothes': return "옷의 전체적인 형태가 잘 보이도록 펼쳐서 촬영해주세요.\n(색상, 종류 및 스타일 분석)";
            default: return "";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}
        >
            {/* Header */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <ChevronLeft size={24} color="white" />
                </div>
                <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>스마트 클로젯 등록</span>
                </div>
            </div>

            {/* Camera Viewport */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter: isScanning ? 'brightness(1.5) contrast(1.2)' : 'brightness(0.9)' }}
                />

                {/* Dark Overlay Outside Target Box */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }} />

                {/* Tracking Guide Box */}
                <motion.div
                    animate={{
                        width: scanMode === 'receipt' ? '70%' : scanMode === 'tag' ? '50%' : '85%',
                        height: scanMode === 'receipt' ? '60%' : scanMode === 'tag' ? '30%' : '70%'
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '45%',
                        transform: 'translate(-50%, -50%)',
                        border: '1.5px solid rgba(255,255,255,0.2)',
                        borderRadius: '16px',
                        boxShadow: isScanning ? '0 0 40px var(--primary), inset 0 0 20px var(--primary)' : '0 0 0 9999px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}
                >
                    {/* Corners */}
                    <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '24px', height: '24px', borderTop: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)', borderRadius: '16px 0 0 0' }} />
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '24px', height: '24px', borderTop: '3px solid var(--primary)', borderRight: '3px solid var(--primary)', borderRadius: '0 16px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '24px', height: '24px', borderBottom: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)', borderRadius: '0 0 0 16px' }} />
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderBottom: '3px solid var(--primary)', borderRight: '3px solid var(--primary)', borderRadius: '0 0 16px 0' }} />

                    {/* Scanning Laser */}
                    {isScanning && (
                        <motion.div
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            style={{ position: 'absolute', width: '100%', height: '3px', background: 'var(--primary)', boxShadow: '0 0 20px var(--primary)' }}
                        />
                    )}
                </motion.div>

                {/* Guide Text */}
                <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, textAlign: 'center', padding: '0 24px', zIndex: 10 }}>
                    <motion.div
                        key={scanMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel"
                        style={{ display: 'inline-block', padding: '12px 20px', borderRadius: '16px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                            {getGuideText()}
                        </span>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div style={{ background: 'var(--bg-dark)', padding: '24px 0 100px 0', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', borderTop: '1px solid rgba(255,255,255,0.05)', zIndex: 30, boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Shutter Button Area */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px' }}>
                    {/* Shopping Cart / Captured Stack */}
                    <div
                        onClick={capturedItems.length > 0 ? handleUpload : undefined}
                        style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: capturedItems.length > 0 ? 'pointer' : 'default' }}
                        className={capturedItems.length > 0 ? "hover-scale" : ""}
                    >
                        {capturedItems.length > 0 ? (
                            <>
                                {/* Stacked Thumbnails Effect */}
                                {capturedItems.slice(-3).map((item, idx, arr) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ scale: 0, opacity: 0, x: -20 }}
                                        animate={{ scale: 1, opacity: 1, x: 0 }}
                                        style={{
                                            position: 'absolute',
                                            width: '48px', height: '48px',
                                            borderRadius: '12px',
                                            background: 'var(--bg-card)',
                                            border: '2px solid rgba(255,255,255,0.8)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transform: `rotate(${(idx - arr.length + 1) * 8}deg) translate(${(idx - arr.length + 1) * 4}px, ${(idx - arr.length + 1) * -4}px)`,
                                            zIndex: idx,
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {item.mode === 'receipt' ? <FileText size={20} color="var(--primary)" /> :
                                            item.mode === 'tag' ? <Tag size={20} color="var(--primary)" /> :
                                                <Shirt size={20} color="var(--primary)" />}
                                    </motion.div>
                                ))}
                                {/* Badge */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    key={`badge-${capturedItems.length}`}
                                    style={{
                                        position: 'absolute', top: '-6px', right: '-6px',
                                        background: 'var(--primary)', color: 'white',
                                        fontSize: '12px', fontWeight: 'bold',
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 10, border: '2px solid var(--bg-dark)'
                                    }}
                                >
                                    {capturedItems.length}
                                </motion.div>
                            </>
                        ) : (
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <ImageIcon size={20} color="rgba(255,255,255,0.3)" />
                            </div>
                        )}
                    </div>

                    {/* Main Capture Button */}
                    <motion.div
                        whileTap={{ scale: 0.9 }}
                        onClick={handleCapture}
                        style={{ width: '76px', height: '76px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'transparent' }}
                    >
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isScanning ? 'var(--primary)' : 'white', transition: '0.3s' }} />
                    </motion.div>

                    {/* Final Submission Button (Only visible when items are in cart) */}
                    <div style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {capturedItems.length > 0 ? (
                            <motion.button
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                onClick={handleUpload}
                                className="hover-scale"
                                style={{
                                    background: 'var(--primary)', border: 'none', borderRadius: '50%',
                                    width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', boxShadow: '0 4px 15px rgba(157, 78, 221, 0.4)'
                                }}
                            >
                                <span style={{ color: 'white', fontWeight: 700, fontSize: '12px' }}>완료</span>
                            </motion.button>
                        ) : (
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Zap size={20} color="var(--text-muted)" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Mode Switcher Tabs (Bottom Nav Style) */}
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '80px' }}>
                    <div onClick={() => setScanMode('receipt')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: scanMode === 'receipt' ? 1 : 0.4, transition: '0.3s' }}>
                        <FileText size={22} color={scanMode === 'receipt' ? 'var(--primary)' : 'white'} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: scanMode === 'receipt' ? 'var(--primary)' : 'white' }}>영수증</span>
                    </div>
                    <div onClick={() => setScanMode('tag')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: scanMode === 'tag' ? 1 : 0.4, transition: '0.3s' }}>
                        <Tag size={22} color={scanMode === 'tag' ? 'var(--primary)' : 'white'} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: scanMode === 'tag' ? 'var(--primary)' : 'white' }}>태그</span>
                    </div>
                    <div onClick={() => setScanMode('clothes')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: scanMode === 'clothes' ? 1 : 0.4, transition: '0.3s' }}>
                        <Shirt size={22} color={scanMode === 'clothes' ? 'var(--primary)' : 'white'} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: scanMode === 'clothes' ? 'var(--primary)' : 'white' }}>옷 사진</span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {/* --- Subscription Modal --- */}
                {
                    showSubscription && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120,
                                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="glass-panel"
                                style={{
                                    width: '100%', maxWidth: '90%', padding: '24px', borderRadius: '32px',
                                    display: 'flex', flexDirection: 'column', position: 'relative',
                                    border: '1px solid rgba(255, 0, 110, 0.4)',
                                    boxShadow: '0 20px 60px rgba(255, 0, 110, 0.25)',
                                    maxHeight: '85vh', overflowY: 'auto'
                                }}
                            >
                                <div style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer', zIndex: 10 }} onClick={() => setShowSubscription(false)}>
                                    <X size={24} color="rgba(255,255,255,0.7)" />
                                </div>

                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 10px 30px rgba(255, 0, 110, 0.3)' }}>
                                        <Sparkles size={28} color="white" />
                                    </div>
                                    <h2 className="outfit text-gradient" style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                                        옷장 용령 초과!
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                                        계속 등록하려면 라이프스타일에<br />맞는 요금제로 업그레이드 하세요.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Pro Plan */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '20px', padding: '20px', position: 'relative', overflow: 'hidden'
                                    }}>
                                        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderBottomLeftRadius: '12px' }}>
                                            ⭐ 가장 인기
                                        </div>
                                        <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Look-UP Pro</h3>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>나만의 완벽한 스마트 클로젯</p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                            <div className="flex-row items-center gap-2"><Shirt size={14} color="var(--primary)" /><span style={{ fontSize: '13px' }}>옷장 등록 무제한 (무료 30벌)</span></div>
                                            <div className="flex-row items-center gap-2"><Bot size={14} color="var(--secondary)" /><span style={{ fontSize: '13px' }}>AI 코디 추천 무제한 + 체형/컬러 매칭</span></div>
                                            <div className="flex-row items-center gap-2" style={{ opacity: 0.6 }}><Sparkles size={14} /><span style={{ fontSize: '13px' }}>본인 프로필 1개 전용 (추가 불가)</span></div>
                                        </div>

                                        <button
                                            onClick={() => navigate('/')}
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: '12px',
                                                background: 'rgba(255, 0, 110, 0.2)', color: 'white', border: '1px solid rgba(255, 0, 110, 0.5)',
                                                fontSize: '15px', fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            월 ₩4,900
                                        </button>
                                    </div>

                                    {/* Family Plan */}
                                    <div style={{
                                        background: 'linear-gradient(145deg, rgba(58, 134, 255, 0.1), rgba(157, 78, 221, 0.15))',
                                        border: '1px solid rgba(157, 78, 221, 0.4)',
                                        borderRadius: '20px', padding: '20px', position: 'relative'
                                    }}>
                                        <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Look-UP Family</h3>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>우리 가족 옷장 통합 관리</p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                            <div className="flex-row items-center gap-2"><Sparkles size={14} color="#3a86ff" /><span style={{ fontSize: '13px', fontWeight: 600 }}>가족 프로필 최대 4인 (배우자/자녀)</span></div>
                                            <div className="flex-row items-center gap-2"><Shirt size={14} color="#3a86ff" /><span style={{ fontSize: '13px', fontWeight: 600 }}>가족 간 옷장 공유 및 공용 옷장 지원</span></div>
                                            <div className="flex-row items-center gap-2"><Bot size={14} color="#3a86ff" /><span style={{ fontSize: '13px' }}>Pro의 모든 기능 포함</span></div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>(*5인 이상은 구성원 추가 결제 필요)</span>
                                            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>1인당 월 약 2,200원</span>
                                        </div>
                                        <button
                                            onClick={() => navigate('/')}
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: '12px',
                                                background: 'linear-gradient(90deg, #3a86ff, var(--secondary))',
                                                color: 'white', border: 'none',
                                                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                                                boxShadow: '0 8px 15px rgba(58, 134, 255, 0.3)'
                                            }}
                                        >
                                            월 ₩8,900
                                        </button>
                                    </div>
                                </div>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '16px' }}>언제든지 약정 없이 취소할 수 있습니다.</span>
                            </motion.div>
                        </motion.div>
                    )
                }
                
                {/* [다니엘 제안] AI 분석 진행 중 UI 추가 (모세법 통과 후 안전한 위치) */}
                {
                    isAnalyzing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120,
                                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                                <Bot size={64} color="var(--primary)" />
                            </motion.div>
                            <h2 style={{ color: 'white', marginTop: '24px', fontSize: '20px', fontWeight: 700 }}>AI Vision 분석 중...</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>색상, 소재, 세탁 기호를 파싱하고 있습니다.</p>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </motion.div >
    );
}
