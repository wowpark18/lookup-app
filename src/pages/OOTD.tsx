import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWardrobeItems, getWearingHistory, saveWearingHistory, type WearingHistory } from '../services/db';
import { auth } from '../lib/firebase';

interface OOTDItem {
    id: string;
    type: string;
    brand: string;
    color: string;
    imageUrl?: string;
}

const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

const MOCK_WARDROBE: OOTDItem[] = [
    { id: '1', type: 'top', brand: 'COS Linen Shirt', color: '#f5efe6', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop' },
    { id: '2', type: 'bottom', brand: 'UNIQLO Slim Trousers', color: '#2c3e50', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=400&auto=format&fit=crop' },
    { id: '3', type: 'outer', brand: 'ZARA Blazer', color: '#8e9eab', imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop' },
    { id: '4', type: 'shoes', brand: 'Nike Air Max', color: '#ffffff', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop' },
];

export default function OOTD() {
    const today = new Date();
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [activeTab, setActiveTab] = useState<'record' | 'closet'>('record');
    const [wearing, setWearing] = useState<OOTDItem[]>([]);
    const [wardrobeItems, setWardrobeItems] = useState<OOTDItem[]>([]);
    const [history, setHistory] = useState<WearingHistory[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const historyMap: Record<string, WearingHistory> = {};
    history.forEach(h => {
        const d = h.wornAt instanceof Date ? h.wornAt : new Date(h.wornAt);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        // [코다리 제안] ID 배열을 실제 아이템 객체 배열로 변환하는 헬퍼 포함
        historyMap[key] = {
            ...h,
            wornAt: d
        };
    });

    const getFullItemsFromIds = (ids: string[]) => {
        return ids.map(id => wardrobeItems.find(item => item.id === id) || MOCK_WARDROBE.find(m => m.id === id)).filter(Boolean) as OOTDItem[];
    };

    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - 7 + i);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        return { 
            day: d.getDate(), 
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            dow: DAYS_KR[d.getDay()], 
            hasOOTD: !!historyMap[key], 
            isToday: d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
        };
    });

    const selectedDateObj = dates.find(d => d.day === selectedDay) || dates[dates.findIndex(d => d.isToday)];
    const selectedDateKey = `${selectedDateObj.year}-${selectedDateObj.month}-${selectedDateObj.day}`;
    const isToday = selectedDateObj.isToday;
    const currentRecord = historyMap[selectedDateKey];

    // 초기 데이터 로드
    useEffect(() => {
        const loadAll = async () => {
            if (!auth.currentUser) return;
            try {
                const [h, w] = await Promise.all([
                    getWearingHistory(auth.currentUser.uid),
                    getWardrobeItems(auth.currentUser.uid)
                ]);
                setHistory(h);
                // WardrobeItem을 OOTDItem 형식으로 변환 (id: string, type: category 등)
                const transformed: OOTDItem[] = w.map(item => ({
                    id: item.id!,
                    type: item.category,
                    brand: item.brand || 'No Brand',
                    color: item.color || '#fff',
                    imageUrl: item.imageUrl
                }));
                setWardrobeItems(transformed);
            } catch (e) {
                console.error("OOTD 데이터 로드 실패:", e);
                // 실패 시 빡센 기본값 (목업)
                setWardrobeItems(MOCK_WARDROBE);
            }
        };
        loadAll();
    }, []);

    // 선택된 날짜가 바뀔 때 기록이 있으면 불러오기
    useEffect(() => {
        if (currentRecord && currentRecord.items) {
            // currentRecord.items가 string[] (IDs)인 경우를 대비해 변환
            const items = Array.isArray(currentRecord.items) 
                ? getFullItemsFromIds(currentRecord.items as string[])
                : currentRecord.items as unknown as OOTDItem[];
            setWearing(items);
        } else {
            setWearing([]);
        }
    }, [selectedDay, currentRecord, wardrobeItems]);

    const handleSave = async () => {
        if (!auth.currentUser || wearing.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const title = wearing.map(i => i.brand).join(', ');
            const itemIds = wearing.map(i => i.id); // [코다리 제안] ID만 추출하여 저장
            const res = await saveWearingHistory({
                userId: auth.currentUser.uid,
                title: title.length > 20 ? title.substring(0, 20) + '...' : title,
                subtitle: '직접 선택한 코디',
                items: itemIds
            });
            if (res) {
                alert('오늘의 착장이 기록되었습니다!');
                // 새로고침 대신 history state 업데이트
                const newRecord: WearingHistory = {
                    id: res,
                    userId: auth.currentUser.uid,
                    title: title.length > 20 ? title.substring(0, 20) + '...' : title,
                    subtitle: '직접 선택한 코디',
                    wornAt: new Date(),
                    items: itemIds
                };
                setHistory(prev => [newRecord, ...prev]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleItem = (item: OOTDItem) => {
        if (!isToday) return; // 과거 기록은 수정 불가
        setWearing(prev => {
            const isItemWearing = prev.some(i => i.id === item.id);
            if (isItemWearing) return prev.filter(i => i.id !== item.id);
            const withoutSameType = prev.filter(i => i.type !== item.type);
            return [...withoutSameType, item];
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ backgroundColor: 'var(--bg-app)', minHeight: '100vh', paddingBottom: '110px', color: 'var(--text-main)' }}
        >
            {/* Header section with Glassmorphism Header */}
            <div style={{ 
                background: 'var(--bg-header)', 
                backdropFilter: 'blur(30px)',
                paddingTop: 'calc(8px + env(safe-area-inset-top, 44px))', 
                paddingBottom: '20px',
                borderBottom: '1px solid var(--border-glass)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <span className="outfit" style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '3px' }}>STYLE DIARY</span>
                        <h1 className="outfit" style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1.5px', marginTop: '4px' }}>OOTD</h1>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{today.getFullYear()}년 {today.getMonth() + 1}월</p>
                        <p style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)', marginTop: '2px' }}>{history.length} RECORDS</p>
                    </div>
                </div>

                {/* Calendar Strip */}
                <div style={{ padding: '24px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {dates.map((d) => (
                            <motion.button 
                                key={`${d.year}-${d.month}-${d.day}`} 
                                whileTap={{ scale: 0.92 }}
                                onClick={() => { setSelectedDay(d.day); setActiveTab('record'); }}
                                className={selectedDay === d.day ? "" : "glass-panel"}
                                style={{
                                    minWidth: '54px', height: '80px', flexShrink: 0, border: selectedDay === d.day ? 'none' : '1px solid var(--border-glass)', cursor: 'pointer',
                                    borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                    backgroundColor: selectedDay === d.day ? 'var(--primary)' : 'var(--bg-card)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    boxShadow: selectedDay === d.day ? `0 8px 16px var(--primary-glow)` : 'none',
                                }}
                            >
                                <span style={{ fontSize: '10px', fontWeight: '800', color: selectedDay === d.day ? 'rgba(255,255,255,0.8)' : d.isToday ? 'var(--primary)' : 'var(--text-muted)' }}>
                                    {d.dow}
                                </span>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: selectedDay === d.day ? '#fff' : 'var(--text-main)' }}>
                                    {d.day}
                                </span>
                                {d.hasOOTD && selectedDay !== d.day && (
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary)', position: 'absolute', bottom: '10px' }} />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div 
                    key={selectedDay} 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -15 }} 
                    transition={{ duration: 0.4, ease: "easeOut" }} 
                    style={{ padding: '0 16px' }}
                >
                    {/* Main Preview Area */}
                    <div className="glass-panel" style={{ borderRadius: '32px', overflow: 'hidden', position: 'relative', marginBottom: '24px', height: '380px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ height: '100%', position: 'relative', backgroundColor: 'var(--bg-card)' }}>
                            {currentRecord ? (
                                <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px' }}>
                                    {getFullItemsFromIds(currentRecord.items).slice(0, 4).map((it, idx) => (
                                        <div key={idx} style={{ position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
                                            {it.imageUrl && <img src={it.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'var(--glass-panel)', backdropFilter: 'var(--glass-blur)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                                                <span className="outfit" style={{ fontSize: '9px', color: 'var(--text-main)', fontWeight: '900', letterSpacing: '1px' }}>{it.type.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!currentRecord.items || currentRecord.items.length === 0) && (
                                        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                            <span style={{ fontSize: '48px', opacity: 0.2 }}>✨</span>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '12px', fontWeight: '600' }}>기록된 항목이 없습니다</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <motion.div 
                                            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }} 
                                            transition={{ duration: 3, repeat: Infinity }}
                                            style={{ position: 'absolute', inset: -15, background: 'var(--primary-glow)', filter: 'blur(25px)', borderRadius: '50%' }} 
                                        />
                                        <div style={{ width: '88px', height: '88px', borderRadius: '30px', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)', position: 'relative', zIndex: 1 }}>
                                            <span style={{ fontSize: '36px' }}>👕</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: '900', letterSpacing: '-0.5px' }}>
                                            No Style Logged Yet
                                        </p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', marginTop: '6px' }}>
                                            Look-UP AI가 당신의 오늘을<br />특별하게 만들어 드릴 거에요
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Overlay Gradient */}
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-app) 0%, transparent 60%)', pointerEvents: 'none' }} />
                            
                            {/* Badges */}
                            <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', gap: '8px' }}>
                                {currentRecord && <span style={{ fontSize: '10px', backgroundColor: 'var(--primary)', color: '#fff', padding: '6px 14px', borderRadius: '10px', fontWeight: '900', letterSpacing: '1px', boxShadow: '0 4px 12px var(--primary-glow)' }}>RECORDED</span>}
                                {isToday && <span style={{ fontSize: '10px', backgroundColor: 'var(--bg-overlay)', color: 'var(--text-main)', padding: '6px 14px', borderRadius: '10px', fontWeight: '800', backdropFilter: 'blur(10px)', border: '1px solid var(--border-glass)' }}>TODAY</span>}
                            </div>

                            {/* Info */}
                            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', padding: '24px' }}>
                                {currentRecord && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                                        <span style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--primary)', padding: '6px 14px', borderRadius: '8px', fontWeight: '800', border: '1px solid var(--primary-glow)', backdropFilter: 'blur(10px)' }}>{currentRecord.title}</span>
                                    </div>
                                )}
                                <h2 className="outfit" style={{ fontSize: '30px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1px', lineHeight: 1 }}>
                                    {new Date(today.getFullYear(), today.getMonth(), selectedDay).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                </h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600' }}>
                                    {currentRecord ? '오늘의 완벽한 룩' : isToday ? '어떤 스타일로 하루를 시작할까요?' : '기록이 준비되지 않았습니다'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {isToday && (
                        <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '20px', padding: '4px', borderRadius: '20px' }}>
                            {(['record', 'closet'] as const).map(tab => (
                                <button 
                                    key={tab} 
                                    onClick={() => setActiveTab(tab)} 
                                    style={{ 
                                        padding: '14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '14px', 
                                        backgroundColor: activeTab === tab ? 'var(--bg-card)' : 'transparent', 
                                        color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {tab === 'record' ? '오늘의 기록' : '내 옷장'}
                                </button>
                            ))}
                        </div>
                    )}

                    {isToday && activeTab === 'record' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="glass-panel" style={{ overflow: 'hidden', padding: '12px', marginBottom: '20px' }}>
                                {wearing.length === 0 ? (
                                    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '32px', opacity: 0.3 }}>✨</span>
                                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '12px', fontWeight: '600' }}>'내 옷장' 탭에서 아이템을 조립해 보세요</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {wearing.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', borderRadius: '18px', background: 'var(--bg-app)', border: '1px solid var(--border-glass)' }}>
                                                <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-card)' }}>
                                                    {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{item.brand}</p>
                                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>{item.type === 'top' ? '상의' : item.type === 'bottom' ? '하의' : item.type === 'outer' ? '아우터' : '신발'}</p>
                                                </div>
                                                {isToday && (
                                                    <motion.button 
                                                        whileTap={{ scale: 0.85 }} 
                                                        onClick={() => toggleItem(item)} 
                                                        style={{ background: 'rgba(255,0,0,0.1)', border: 'none', color: '#ff4d4d', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <span style={{ fontWeight: 'bold' }}>-</span>
                                                    </motion.button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {isToday && wearing.length > 0 && !currentRecord && (
                                <motion.button 
                                    whileTap={{ scale: 0.96 }} 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    style={{ 
                                        width: '100%', padding: '20px', borderRadius: '24px', border: 'none', 
                                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                                        color: '#fff', fontWeight: '900', fontSize: '16px', 
                                        boxShadow: `0 12px 24px rgba(157,78,221,0.3)`, 
                                        opacity: isSaving ? 0.7 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                                    }}
                                >
                                    {isSaving ? '저장 중...' : '오늘의 착장 확정'}
                                    <span style={{ fontSize: '18px' }}>🚀</span>
                                </motion.button>
                            )}
                        </motion.div>
                    )}

                    {isToday && activeTab === 'closet' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {wardrobeItems.map((item) => {
                                    const isWearing = wearing.some(w => w.id === item.id);
                                    return (
                                        <motion.div 
                                            key={item.id} 
                                            whileTap={{ scale: 0.95 }} 
                                            onClick={() => toggleItem(item)} 
                                            style={{ 
                                                borderRadius: '24px', overflow: 'hidden', cursor: 'pointer', position: 'relative', 
                                                background: isWearing ? 'var(--primary-glow)' : 'var(--bg-card)',
                                                border: isWearing ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                                                boxShadow: isWearing ? '0 8px 24px var(--primary-glow)' : 'none',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <div style={{ height: '150px', backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                                                {item.imageUrl ? 
                                                    <img src={item.imageUrl} alt={item.brand} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isWearing ? 1 : 0.8 }} /> : 
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: '36px', opacity: 0.2 }}>👔</span>
                                                    </div>
                                                }
                                            </div>
                                            <div style={{ padding: '14px' }}>
                                                <p style={{ fontSize: '13px', fontWeight: '800', color: isWearing ? 'var(--primary)' : 'var(--text-main)' }}>{item.brand}</p>
                                                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>{item.type === 'top' ? '상의' : item.type === 'bottom' ? '하의' : item.type === 'outer' ? '아우터' : '신발'}</p>
                                            </div>
                                            {isWearing && (
                                                <div style={{ position: 'absolute', top: '12px', right: '12px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,0,0,0.3)' }}>
                                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
