import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Filter, Heart, MoreHorizontal, Sun, Shirt, Sparkles } from 'lucide-react';
import { getWardrobeItems } from '../services/db';
import { auth } from '../lib/firebase';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

// 3D Avatar Component for OOTD
function OOTDAvatar({ topColor, bottomColor }: { topColor: string, bottomColor: string }) {
    const { scene } = useGLTF('/assets/Xbot.glb');
    
    useEffect(() => {
        if (!scene) return;
        
        // Very basic simulation of coloring Top and Bottom parts
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.name === 'Alpha_Surface' && mesh.material) {
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    // Note: Xbot has a single mesh for Alpha_Surface so we can't easily split top/bottom nicely without specific UV mapping.
                    // As a simulation, we just mix or use topColor to tint the entire surface.
                    if (mat.color) { 
                        mat.color.set(topColor || '#e0e0e0'); 
                        mat.needsUpdate = true; 
                    }
                }
                
                // If there are joints, maybe tint them with bottomColor?
                if (mesh.name === 'Alpha_Joints' && mesh.material) {
                     const mat = mesh.material as THREE.MeshStandardMaterial;
                     if (mat.color) {
                         mat.color.set(bottomColor || '#222222');
                         mat.needsUpdate = true;
                     }
                }
            }
        });
        
        // Simple T-pose to A-pose
        const leftArm = scene.getObjectByName('mixamorigLeftArm');
        const rightArm = scene.getObjectByName('mixamorigRightArm');
        if (leftArm) leftArm.rotation.z = -1.2;
        if (rightArm) rightArm.rotation.z = 1.2;
    }, [scene, topColor, bottomColor]);

    return <primitive object={scene} scale={1.5} position={[0, -1.5, 0]} />;
}

interface OOTDWardrobeItem {
    id: string;
    type: string;
    name: string;
    brand: string;
    color: string;
    imageUrl?: string;
}

export default function OOTD() {
    const [selectedDate, setSelectedDate] = useState(2);
    const [wardrobeItems, setWardrobeItems] = useState<OOTDWardrobeItem[]>([]);
    
    // 현재 아바타가 입고 있는 아이템 리스트 (Category별 1개씩)
    const [ootdItems, setOotdItems] = useState<OOTDWardrobeItem[]>([]);
    
    // 옷장 탭 카테고리
    const [wardrobeCategory, setWardrobeCategory] = useState<'all' | 'top' | 'bottom' | 'outer' | 'shoes'>('all');

    useEffect(() => {
        // 백엔드 연동: Firebase DB에서 실제 사용자 옷장 데이터 로딩 (OCR 스캔 기반)
        if (auth.currentUser) {
            getWardrobeItems(auth.currentUser.uid).then(items => {
                if (items && items.length > 0) {
                    const mappedItems = items.map(dbItem => ({
                        id: dbItem.id || Math.random().toString(),
                        type: dbItem.category, // 'top', 'bottom', 'outer', 'shoes'
                        name: `${dbItem.category.toUpperCase()} 아이템`,
                        brand: dbItem.brand || '내 옷장',
                        color: dbItem.color || '#ffffff',
                        imageUrl: dbItem.imageUrl
                    }));
                    setWardrobeItems(mappedItems);
                    
                    // 초기 OOTD 설정 시뮬레이션
                    const top = mappedItems.find(i => i.type === 'top');
                    const bottom = mappedItems.find(i => i.type === 'bottom');
                    const initialOOTD = [];
                    if (top) initialOOTD.push(top);
                    if (bottom) initialOOTD.push(bottom);
                    setOotdItems(initialOOTD);
                }
            });
        }
    }, [selectedDate]);

    // 임시 달력 데이터 생성
    const dates = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(2026, 2, i + 1); // 2026년 3월
        return {
            day: date.getDate(),
            dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
            hasOOTD: [2, 5, 8, 12].includes(i + 1), // 특정 날짜에 OOTD 기록이 있다고 가정
            isToday: i + 1 === 2
        };
    });
    
    // 옷 입히기 로직 (토글 처리)
    const handleEquipItem = (item: OOTDWardrobeItem) => {
        setOotdItems(prev => {
            // 같은 타입(상의, 하의 등)의 아이템이 이미 있으면 교체
            const filtered = prev.filter(i => i.type !== item.type);
            // 클릭한 항목이 이미 입혀진 항목과 동일하다면 뺀 채로 둠 (토글 off)
            const isAlreadyEquipped = prev.some(i => i.id === item.id);
            if (isAlreadyEquipped) {
                return filtered;
            } else {
                return [...filtered, item];
            }
        });
    };
    
    // 착장 색상 추출
    const currentTop = ootdItems.find(i => i.type === 'top');
    const currentBottom = ootdItems.find(i => i.type === 'bottom');
    const displayTopColor = currentTop?.color || '#3a5a9b';
    const displayBottomColor = currentBottom?.color || '#222222';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', paddingBottom: '120px' }}
        >
            {/* Header Area */}
            <div style={{ padding: '24px 24px 16px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '10px', background: 'rgba(157, 78, 221, 0.15)', borderRadius: '14px', border: '1px solid rgba(157, 78, 221, 0.3)' }}>
                        <CalendarIcon size={22} color="var(--primary)" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.5px' }}>OOTD 캘린더</h2>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>나만의 스타일 기록</span>
                    </div>
                </div>
                <div className="glass-panel hover-scale" style={{ padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                    <Filter size={20} color="white" />
                </div>
            </div>

            {/* Premium Horizontal Calendar */}
            <div style={{ padding: '0 24px', marginBottom: '24px' }}>
                <div className="glass-panel" style={{
                    padding: '16px 16px', borderRadius: '24px', display: 'flex', gap: '16px',
                    overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none'
                }}>
                    {dates.map((d, idx) => (
                        <div key={idx}
                            onClick={() => setSelectedDate(d.day)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                minWidth: '56px', height: '72px', borderRadius: '18px', cursor: 'pointer', transition: '0.3s',
                                background: selectedDate === d.day ? 'var(--primary)' : 'transparent',
                                border: selectedDate === d.day ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                                boxShadow: selectedDate === d.day ? '0 10px 20px rgba(157, 78, 221, 0.3)' : 'none',
                                position: 'relative', flexShrink: 0
                            }}
                        >
                            <span style={{ fontSize: '12px', fontWeight: 600, color: selectedDate === d.day ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)', marginBottom: '4px' }}>
                                {d.dayOfWeek}
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: selectedDate === d.day ? 800 : 500, color: selectedDate === d.day ? 'white' : 'rgba(255,255,255,0.8)' }}>
                                {d.day}
                            </span>
                            {/* OOTD Indicator Dot */}
                            {d.hasOOTD && selectedDate !== d.day && (
                                <div style={{ position: 'absolute', bottom: '8px', width: '4px', height: '4px', background: 'var(--secondary)', borderRadius: '50%', boxShadow: '0 0 5px var(--secondary)' }} />
                            )}
                            {d.hasOOTD && selectedDate === d.day && (
                                <div style={{ position: 'absolute', bottom: '8px', width: '4px', height: '4px', background: 'white', borderRadius: '50%' }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedDate}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    style={{ padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                    {/* Look of the Day Card */}
                    <div className="glass-panel" style={{ borderRadius: '32px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', marginBottom: '24px' }}>
                        {/* Fashion Image / Mirror Placeholder */}
                        <div style={{ width: '100%', height: '360px', background: 'linear-gradient(180deg, rgba(20,20,25,1) 0%, rgba(40,30,50,1) 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, rgba(157,78,221,0.2) 0%, transparent 60%)' }} />
                            <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1 }}>
                                <Canvas camera={{ position: [0, 1, 3.5], fov: 50 }}>
                                    <ambientLight intensity={0.8} />
                                    <directionalLight position={[5, 5, 5]} intensity={1.5} />
                                    <Environment preset="city" />
                                    <OOTDAvatar topColor={displayTopColor} bottomColor={displayBottomColor} />
                                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={2} maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 2.2} />
                                </Canvas>
                            </div>

                            {/* Overlay Info Layer */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 24px 24px', background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)', zIndex: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '10px', background: 'rgba(255,0,110,0.2)', color: 'var(--secondary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(255,0,110,0.3)' }}>BUSINESS CASUAL</span>
                                            <span style={{ fontSize: '10px', background: 'rgba(157, 78, 221, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(157, 78, 221, 0.4)' }}>✨ AI 매칭 98%</span>
                                        </div>
                                        <h4 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: 'white' }}>오늘의 착장</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={14} color="#FFD166" /> 맑음 18°C</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div className="hover-scale" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                                            <Heart size={18} fill="var(--secondary)" color="var(--secondary)" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Current Outfit Items */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h5 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>현재 입은 옷 ({ootdItems.length}개)</h5>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {ootdItems.length === 0 && (
                                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: '20px 0' }}>아래 옷장에서 옷을 선택해 입혀보세요!</p>
                                )}
                                {ootdItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', position: 'relative' }}>
                                            <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', background: item.color, border: '2px solid rgba(0,0,0,0.8)' }} />
                                            <Shirt size={16} color="var(--primary)" opacity={0.6} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--primary)', padding: '2px 6px', borderRadius: '6px' }}>{item.type.toUpperCase()}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.brand}</span>
                                            </div>
                                            <dt style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{item.name}</dt>
                                        </div>
                                        <div onClick={() => handleEquipItem(item)} style={{ cursor: 'pointer', padding: '6px' }}>
                                            <MoreHorizontal size={20} color="rgba(255,255,255,0.3)" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* 디지털 옷장 고도화: 내 옷장 섹션 (화면 하단) */}
            <div style={{ padding: '0 24px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shirt size={20} color="var(--secondary)" /> 디지털 옷장
                    </h3>
                </div>

                {/* Categories */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
                    {['all', 'top', 'bottom', 'outer', 'shoes'].map(category => (
                        <div
                            key={category}
                            onClick={() => setWardrobeCategory(category as 'all' | 'top' | 'bottom' | 'outer' | 'shoes')}
                            style={{
                                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                background: wardrobeCategory === category ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: wardrobeCategory === category ? 'white' : 'var(--text-muted)',
                                border: wardrobeCategory === category ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                flexShrink: 0
                            }}
                        >
                            {category.toUpperCase()}
                        </div>
                    ))}
                </div>

                {/* Wardrobe Items Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '8px' }}>
                    {wardrobeItems.length === 0 && (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
                            <p style={{ fontSize: '14px', marginBottom: '8px' }}>아직 등록된 옷이 없습니다.</p>
                            <p style={{ fontSize: '12px' }}>홈 화면에서 스캔을 통해 옷을 등록해주세요.</p>
                        </div>
                    )}
                    
                    {wardrobeItems
                        .filter(item => wardrobeCategory === 'all' || item.type === wardrobeCategory)
                        .map((item) => {
                            const isEquipped = ootdItems.some(i => i.id === item.id);
                            return (
                                <motion.div
                                    key={item.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleEquipItem(item)}
                                    className="glass-panel"
                                    style={{
                                        padding: '16px', borderRadius: '16px', border: isEquipped ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                        background: isEquipped ? 'rgba(157, 78, 221, 0.1)' : 'rgba(255,255,255,0.02)',
                                        position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center'
                                    }}
                                >
                                    {isEquipped && (
                                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Sparkles size={10} />
                                        </div>
                                    )}
                                    
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', border: `3px solid ${item.color}` }}>
                                        <Shirt size={28} color="rgba(255,255,255,0.8)" />
                                    </div>
                                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px', textAlign: 'center' }}>{item.brand}</h4>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>{item.type.toUpperCase()}</p>
                                    
                                    <div style={{ marginTop: '12px', padding: '6px 16px', background: isEquipped ? 'rgba(255,255,255,0.1)' : 'var(--primary)', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: 'white' }}>
                                        {isEquipped ? '벗기' : '입히기'}
                                    </div>
                                </motion.div>
                            )
                        })}
                </div>
            </div>
            
        </motion.div>
    );
}
