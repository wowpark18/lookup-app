import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Filter, Heart, ChevronLeft, ChevronRight, Share2, MoreHorizontal, Sun, MapPin, Shirt, Tag, Sparkles } from 'lucide-react';

export default function OOTD() {
    const [selectedDate, setSelectedDate] = useState(2);

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

    const ootdItems = [
        { type: '아우터', name: '캐시미어 롱 코트', brand: 'STUDIO TOMBOY', color: '#1a1a1a' },
        { type: '상의', name: '오버핏 옥스포드 셔츠', brand: 'POLO RALPH LAUREN', color: '#ffffff' },
        { type: '하의', name: '와이드 데님 팬츠', brand: 'LEVI\'S', color: '#4b6cb7' },
        { type: '신발', name: '클래식 로퍼', brand: 'GUCCI', color: '#3e2723' }
    ];

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

            {/* Month & Nav Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px 16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className="outfit text-gradient" style={{ fontSize: '24px', fontWeight: 800 }}>March 2026</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer' }}>
                        <ChevronLeft size={18} />
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer' }}>
                        <ChevronRight size={18} />
                    </div>
                </div>
            </div>

            {/* Premium Horizontal Calendar */}
            <div style={{ padding: '0 24px', marginBottom: '32px' }}>
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
                    <div className="glass-panel" style={{ borderRadius: '32px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                        {/* Fashion Image / Mirror Placeholder */}
                        <div style={{ width: '100%', height: '380px', background: 'linear-gradient(180deg, rgba(20,20,25,1) 0%, rgba(40,30,50,1) 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Abstract silhouette or graphic replacing the old image */}
                            <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, rgba(157,78,221,0.2) 0%, transparent 60%)' }} />
                            <div style={{ textAlign: 'center', zIndex: 2 }}>
                                <Shirt size={64} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>3D 스캔 혹은 사진이 표시되는 영역</p>
                            </div>

                            {/* Overlay Info Layer */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 24px 24px', background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)', zIndex: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '10px', background: 'rgba(255,0,110,0.2)', color: 'var(--secondary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(255,0,110,0.3)' }}>BUSINESS CASUAL</span>
                                            <span style={{ fontSize: '10px', background: 'rgba(157, 78, 221, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(157, 78, 221, 0.4)' }}>✨ AI TPO 매칭 98%</span>
                                        </div>
                                        <h4 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: 'white' }}>오피스 & 미팅 룩</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={14} color="#FFD166" /> 맑음 18°C</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> 강남 오피스 타운 <span style={{fontSize:'9px', opacity:0.5}}>(위치정보 동의됨)</span></div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div className="hover-scale" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                                            <Share2 size={18} color="white" />
                                        </div>
                                        <div className="hover-scale" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                                            <Heart size={18} fill="var(--secondary)" color="var(--secondary)" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Outfit Components Breakdown */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h5 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>착장 상세 정보</h5>
                                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', borderBottom: '1px solid var(--primary)' }}>다른 코디 추천받기(AI)</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {ootdItems.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', position: 'relative' }}>
                                            {/* Simulate item color hint */}
                                            <div style={{ position: 'absolute', bottom: '6px', right: '6px', width: '10px', height: '10px', borderRadius: '50%', background: item.color, border: '1px solid rgba(255,255,255,0.2)' }} />
                                            <Tag size={20} color="var(--primary)" opacity={0.6} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--primary)', padding: '2px 6px', borderRadius: '6px' }}>{item.type}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.brand}</span>
                                            </div>
                                            <dt style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{item.name}</dt>
                                        </div>
                                        <MoreHorizontal size={20} color="rgba(255,255,255,0.3)" />
                                    </div>
                                ))}
                            </div>

                            {/* [솔로몬 제안] 추가 구매 유도 (C-Commerce 영역) */}
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div>
                                        <h5 style={{ fontSize: '14px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={16} color="var(--secondary)" /> 이 코디에 부족한 아이템 제안</h5>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>내 옷장에 없는 매칭 아이템을 AI가 찾았습니다.</p>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                                    {[1, 2].map((i) => (
                                        <div key={i} style={{ minWidth: '140px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(157, 78, 221, 0.2)' }}>
                                            <div style={{ width: '100%', height: '80px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                                <Shirt size={24} color="rgba(255,255,255,0.2)" />
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>무신사 스토어</div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>블랙 캐시미어 머플러</div>
                                            <div style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 700, marginTop: '4px' }}>₩49,000</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
