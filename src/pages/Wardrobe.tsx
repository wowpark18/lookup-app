import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Camera, Image as ImageIcon, ChevronRight, Sparkles, X, SlidersHorizontal, Check, Palette } from 'lucide-react';
import { getWardrobeItems, getUserProfile, deleteWardrobeItem, type WardrobeItem } from '../services/db';
import { auth } from '../lib/firebase';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

const CATEGORIES = [
    { id: 'all', label: '전체', icon: 'category' },
    { id: 'top', label: '상의', icon: 'dry_cleaning' },
    { id: 'bottom', label: '하의', icon: 'straighten' },
    { id: 'outer', label: '아우터', icon: 'style' },
    { id: 'shoes', label: '신발', icon: 'footprint' },
    { id: 'acc', label: '액세서리', icon: 'watch' },
];

const SEASONS = [
    { id: 'spring', label: '봄', icon: '🌸' },
    { id: 'summer', label: '여름', icon: '☀️' },
    { id: 'fall', label: '가을', icon: '🍂' },
    { id: 'winter', label: '겨울', icon: '❄️' },
];

const COMMON_MATERIALS = ['면(Cotton)', '리넨(Linen)', '울(Wool)', '실크(Silk)', '데님(Denim)', '레더(Leather)', '폴리에스터', '캐시미어'];

const SORT_OPTIONS = ['최근 등록순', '카테고리순', '브랜드순'];

const MOCK_ITEMS: WardrobeItem[] = [
    { userId: '', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop', category: 'top', brand: 'COS', color: '#f5f0eb', createdAt: new Date() },
    { userId: '', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=400&auto=format&fit=crop', category: 'bottom', brand: 'UNIQLO', color: '#2c3e50', createdAt: new Date() },
    { userId: '', imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop', category: 'outer', brand: 'ZARA', color: '#8e9eab', createdAt: new Date() },
    { userId: '', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop', category: 'shoes', brand: 'Nike', color: '#ffffff', createdAt: new Date() },
    { userId: '', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop', category: 'acc', brand: 'Casio', color: '#b8b8b8', createdAt: new Date() },
    { userId: '', imageUrl: 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?q=80&w=400&auto=format&fit=crop', category: 'top', brand: 'Mango', color: '#d4a574', createdAt: new Date() },
];

export default function Wardrobe() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('all');
    const [sortBy, setSortBy] = useState(0);
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [onlyRecommend, setOnlyRecommend] = useState(false);

    // [전략 사령관 솔로몬] 지능형 검색 및 필터링 상태 추가
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showFilterSheet, setShowFilterSheet] = useState(false);
    const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

    useEffect(() => {
        async function loadItems() {
            setIsLoading(true);
            try {
                if (auth.currentUser) {
                    const [dbItems, profile] = await Promise.all([
                        getWardrobeItems(auth.currentUser.uid),
                        getUserProfile(auth.currentUser.uid)
                    ]);
                    setItems(dbItems.length > 0 ? dbItems : MOCK_ITEMS);
                    setUserProfile(profile);
                } else {
                    setItems(MOCK_ITEMS);
                }
            } catch {
                setItems(MOCK_ITEMS);
            } finally {
                setIsLoading(false);
            }
        }
        loadItems();
    }, []);

    const handleAlbumSelect = async () => {
        try {
            const image = await CapCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Photos
            });
            setShowAddMenu(false);
            // 사진 데이터를 OCR페이지로 넘김
            navigate('/ocr', { state: { photoData: image.dataUrl } });
        } catch (e) {
            console.error("앨범 열기 취소/에러", e);
        }
    };

    const sortedItems = [...items]
        .filter(i => {
            // 카테고리 필터
            const matchCategory = activeCategory === 'all' || i.category === activeCategory;
            // 검색어 필터 (브랜드, 서브카테고리, 소재)
            const searchLower = searchQuery.toLowerCase();
            const matchSearch = !searchQuery || 
                (i.brand?.toLowerCase().includes(searchLower)) ||
                (i.subcategory?.toLowerCase().includes(searchLower)) ||
                (i.materials?.some(m => m.toLowerCase().includes(searchLower)));
            
            // 계절 필터
            const matchSeason = selectedSeasons.length === 0 || 
                (i.season?.some(s => selectedSeasons.includes(s.toLowerCase())));

            // 소재 필터
            const matchMaterial = selectedMaterials.length === 0 ||
                (i.materials?.some(m => selectedMaterials.some(sm => m.includes(sm.split('(')[0]))));

            // 퍼스널 컬러 추천 필터 (계절 + 색상 조화도 체크)
            const isMatchSeason = userProfile?.personalColorResult?.season && 
                i.season?.includes(userProfile.personalColorResult.season);
            
            // 색상 조화도 가점 (실제로는 더 복잡한 HSL 연산이 필요하지만 간단하게 헥사코드 포함 여부로 데모)
            const isMatchBestColor = userProfile?.personalColorResult?.bestColors?.some((c: any) => 
                c.hex.toLowerCase() === i.color?.toLowerCase()
            );

            const isMatchPersonalColor = isMatchSeason || isMatchBestColor;
            
            const matchRecommend = !onlyRecommend || isMatchPersonalColor;

            return matchCategory && matchSearch && matchSeason && matchMaterial && matchRecommend;
        })
        .sort((a, b) => {
            if (sortBy === 0) {
                const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return dateB - dateA;
            }
            if (sortBy === 1) return a.category.localeCompare(b.category);
            if (sortBy === 2) return (a.brand || '').localeCompare(b.brand || '');
            return 0;
        });

    const handleDeleteItem = async (item: WardrobeItem) => {
        if (!item.id) return;
        if (window.confirm('이 아이템을 옷장에서 삭제하시겠습니까?')) {
            try {
                await deleteWardrobeItem(item.id, item.imageUrl);
                setItems(prev => prev.filter(i => i.id !== item.id));
                setSelectedItem(null);
                alert('삭제되었습니다.');
            } catch (e) {
                console.error(e);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ backgroundColor: 'var(--bg-app)', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '110px', color: 'var(--text-main)' }}
            >
                {/* Standardized Header */}
                <header style={{ 
                    height: 'auto', 
                    paddingTop: 'calc(8px + env(safe-area-inset-top, 44px))', 
                    paddingBottom: '16px',
                    position: 'sticky', 
                    top: 0,
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 80px',
                    alignItems: 'center', 
                    paddingLeft: '20px', 
                    paddingRight: '20px', 
                    zIndex: 100,
                    background: 'var(--bg-header)',
                    backdropFilter: 'blur(30px)',
                    borderBottom: '1px solid var(--border-glass)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ 
                            width: '32px', height: '32px', borderRadius: '10px', 
                            background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>checkroom</span>
                        </div>
                    </div>

                    <div className="outfit" style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '4px', color: 'var(--text-main)', textAlign: 'center' }}>
                        LOOK-UP
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsSearchOpen(!isSearchOpen)} style={{ color: 'var(--text-main)', background: 'none', border: 'none' }}>
                            <Search size={22} />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAddMenu(true)} style={{ color: 'var(--primary)', background: 'none', border: 'none', position: 'relative' }}>
                            <Plus size={24} />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', inset: -2, border: '2px solid var(--primary)', borderRadius: '50%', opacity: 0.2 }} />
                        </motion.button>
                    </div>
                </header>

                {/* Sub Header for Page Context */}
                <div style={{ padding: '32px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 className="outfit" style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', color: 'var(--text-main)', margin: 0 }}>CLOSET</h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 800, letterSpacing: '0.5px' }}>Total <span style={{ color: 'var(--primary)' }}>{items.length}</span> Objects</p>
                    </div>
                    <motion.button 
                        whileTap={{ scale: 0.9 }} 
                        onClick={() => setShowFilterSheet(true)}
                        className="glass-panel" 
                        style={{ 
                            width: '44px', height: '44px', borderRadius: '14px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            border: '1px solid var(--border-glass)', 
                            backgroundColor: (selectedSeasons.length > 0 || selectedMaterials.length > 0) ? 'var(--primary-glow)' : 'var(--bg-card)',
                            color: (selectedSeasons.length > 0 || selectedMaterials.length > 0) ? 'var(--primary)' : 'var(--text-main)',
                            position: 'relative'
                        }}
                    >
                        <SlidersHorizontal size={18} />
                    </motion.button>
                </div>

                    {/* Expandable Search Input */}
                    <AnimatePresence>
                        {isSearchOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text"
                                        placeholder="브랜드, 카테고리, 소재로 검색..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ 
                                            width: '100%', padding: '16px 20px', borderRadius: '20px', 
                                            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                                            color: 'var(--text-main)', fontSize: '15px', fontWeight: 600,
                                            boxSizing: 'border-box',
                                            paddingRight: '48px'
                                        }}
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)' }}
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stats Row */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', marginBottom: '8px' }}>
                        {[
                            { label: 'CAPACITY', value: `${items.length}/30`, icon: 'checkroom' },
                            { label: 'ARCHIVES', value: Math.floor(items.length * 0.4) || 0, icon: 'favorite' },
                            { label: 'THIS WEEK', value: 3, icon: 'calendar_today' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-panel" style={{ flex: 1, borderRadius: '24px', padding: '18px 12px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-glass)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: i === 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{stat.icon}</span>
                                <p className="outfit" style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginTop: '6px', letterSpacing: '-0.5px' }}>{stat.value}</p>
                                <p style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '1px' }}>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                
                {/* ── Category Scroll ─────────────────────────────── */}
                <div style={{ padding: '24px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    <div style={{ display: 'flex', gap: '12px', paddingBottom: '4px' }}>
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0, padding: '16px 20px', borderRadius: '24px', cursor: 'pointer', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', minWidth: '84px',
                                    backgroundColor: activeCategory === cat.id ? 'var(--primary)' : 'var(--bg-card)',
                                    boxShadow: activeCategory === cat.id ? '0 12px 24px rgba(157, 78, 221, 0.3)' : 'none',
                                    border: activeCategory === cat.id ? 'none' : '1px solid var(--border-glass)',
                                    color: activeCategory === cat.id ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'inherit' }}>{cat.icon}</span>
                                <span className="outfit" style={{ fontSize: '11px', fontWeight: '900', color: 'inherit', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{cat.label.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Personal Color Recommendation Toggle */}
                {userProfile?.personalColor && (
                    <div style={{ padding: '24px 20px 0' }}>
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setOnlyRecommend(!onlyRecommend)}
                            style={{ 
                                width: '100%', padding: '16px 20px', borderRadius: '20px', 
                                background: onlyRecommend ? 'linear-gradient(135deg, #FF99AC, #FF6B6B)' : 'var(--bg-card)',
                                border: '1px solid var(--border-glass)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', transition: '0.3s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Palette size={18} color={onlyRecommend ? 'white' : 'var(--primary)'} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <p className="outfit" style={{ fontSize: '14px', fontWeight: 900, color: onlyRecommend ? 'white' : 'var(--text-main)', margin: 0 }}>
                                        {userProfile.personalColor} 맞춤 추천
                                    </p>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: onlyRecommend ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', margin: 0 }}>
                                        대표님의 톤에 가장 잘 어울리는 아이템만 보기
                                    </p>
                                </div>
                            </div>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: onlyRecommend ? 'white' : 'var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {onlyRecommend && <Check size={14} color="#FF6B6B" strokeWidth={3} />}
                            </div>
                        </motion.button>
                    </div>
                )}

                {/* ── Sort & Count Bar ─────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="outfit" style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                            <span style={{ color: 'var(--text-main)' }}>{sortedItems.length}</span> ITEMS FILTERED
                        </span>
                        {(searchQuery || selectedSeasons.length > 0 || selectedMaterials.length > 0) && (
                            <button 
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedSeasons([]);
                                    setSelectedMaterials([]);
                                }}
                                style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 900, background: 'none', border: 'none', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--primary-glow)', cursor: 'pointer' }}
                            >
                                CLEAR ALL
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {SORT_OPTIONS.map((opt, i) => (
                            <button key={i} onClick={() => setSortBy(i)}
                                style={{ padding: '8px 16px', borderRadius: '14px', cursor: 'pointer', fontSize: '11px', fontWeight: '900', transition: 'all 0.3s',
                                    backgroundColor: sortBy === i ? 'var(--primary-glow)' : 'transparent',
                                    color: sortBy === i ? 'var(--primary)' : 'var(--text-muted)',
                                    border: sortBy === i ? '1px solid var(--border-glass)' : '1px solid transparent'
                                }}
                            >{opt}</button>
                        ))}
                    </div>
                </div>

                {/* ── Grid ─────────────────────────────────────────── */}
                <div style={{ padding: '0 16px' }}>
                    {isLoading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="glass-panel" style={{ height: '240px', borderRadius: '32px', opacity: 0.4 }} />
                            ))}
                        </div>
                    ) : sortedItems.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '100px 24px' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid var(--border-glass)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--text-muted)' }}>checkroom</span>
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>옷장이 비어있습니다</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.6 }}>우측 상단 추가 버튼이나 스캔을 통해<br/>대표님의 소중한 옷을 등록해보세요.</p>
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/scan')}
                                className="primary-button"
                                style={{ marginTop: '32px', padding: '16px 32px' }}>
                                첫 아이템 등록하기
                            </motion.button>
                        </motion.div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            <AnimatePresence>
                                {sortedItems.map((item, idx) => (
                                    <motion.div key={idx}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: idx * 0.05, ease: [0.4, 0, 0.2, 1] }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => setSelectedItem(item)}
                                        className="glass-panel"
                                        style={{ borderRadius: '32px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border-glass)' }}
                                    >
                                        {/* Image */}
                                        <div style={{ height: '220px', backgroundColor: 'var(--bg-app)', overflow: 'hidden', position: 'relative' }}>
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.brand} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--text-muted)', opacity: 0.3 }}>checkroom</span>
                                                </div>
                                            )}
                                            {/* Category Badge */}
                                            <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'var(--glass-panel)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '6px 12px' }}>
                                                <span className="outfit" style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px' }}>
                                                    {(CATEGORIES.find(c => c.id === item.category)?.label || item.category).toUpperCase()}
                                                </span>
                                            </div>
                                            {/* Recommendation Badge */}
                                            {userProfile?.personalColor && (
                                                <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                                    <Palette size={12} color="var(--primary)" />
                                                    <span className="outfit" style={{ fontSize: '9px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.5px' }}>MATCH</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div style={{ padding: '20px' }}>
                                            <p className="outfit" style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0 }}>{item.brand || 'Premium Object'}</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {item.color && (
                                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: item.color, border: '1px solid var(--border-glass)' }} />
                                                    )}
                                                    <span className="outfit" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900' }}>{item.size || 'F'}</span>
                                                </div>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                                    {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── AI Scan Entry Menu (Bottom Sheet) ───────────────── */}
            <AnimatePresence>
                {showAddMenu && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMenu(false)} style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)', zIndex: 10000 }} />
                        <motion.div 
                            initial={{ y: '100%' }} 
                            animate={{ y: 0 }} 
                            exit={{ y: '100%' }} 
                            transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }} 
                            style={{ 
                                position: 'fixed', bottom: 0, left: 0, right: 0, 
                                background: 'var(--bg-app)', 
                                borderTop: '1px solid var(--border-glass)', 
                                borderTopLeftRadius: '40px', borderTopRightRadius: '40px', 
                                padding: '40px 24px 60px', zIndex: 10001,
                                boxShadow: '0 -20px 60px rgba(0,0,0,0.05)'
                            }}
                        >
                            <div style={{ width: '48px', height: '5px', background: 'var(--border-glass)', borderRadius: '10px', margin: '-16px auto 32px' }} />
                            
                            <h3 className="outfit" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.5px' }}>ITEM REGISTRATION</h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px', fontWeight: 600 }}>AI가 의류의 정보를 즉시 분석하여 최적의 케어 방식을 제안합니다.</p>

                             <div style={{ display: 'grid', gap: '16px' }}>
                                <motion.div 
                                    whileTap={{ scale: 0.98 }} 
                                    onClick={() => { 
                                        if (items.length >= 30) {
                                            alert('무료 버전은 최대 30벌까지 등록 가능합니다.\nLook-UP Pro로 업그레이드하고 무제한 옷장을 사용해보세요! 💜');
                                            return;
                                        }
                                        setShowAddMenu(false); 
                                        navigate('/ocr'); 
                                    }} 
                                    style={{ 
                                        padding: '24px', background: 'rgba(157, 78, 221, 0.05)', 
                                        borderRadius: '28px', border: '1px solid rgba(157, 78, 221, 0.2)', 
                                        display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', 
                                        opacity: items.length >= 30 ? 0.6 : 1,
                                        boxShadow: '0 10px 30px rgba(157,78,221,0.05)'
                                    }}
                                >
                                    <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px var(--primary-glow)' }}>
                                        <Camera size={28} color="#fff" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 className="outfit" style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>SMART VISION SCAN</h4>
                                        <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '4px', fontWeight: 800 }}>{items.length >= 30 ? '한도 도달 (PRO 전용)' : '건조기/세탁 가능여부 자동 분석'}</p>
                                    </div>
                                    <ChevronRight size={24} color="var(--primary)" />
                                </motion.div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <motion.div whileTap={{ scale: 0.96 }} onClick={handleAlbumSelect} className="glass-panel" style={{ padding: '24px', borderRadius: '28px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', border: '1px solid var(--border-glass)', backgroundColor: 'var(--bg-card)' }}>
                                        <ImageIcon size={24} color="var(--primary)" />
                                        <span className="outfit" style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.5px' }}>ALBUM</span>
                                    </motion.div>
                                    <motion.div whileTap={{ scale: 0.96 }} onClick={() => { setShowAddMenu(false); navigate('/add-item'); }} className="glass-panel" style={{ padding: '24px', borderRadius: '28px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', border: '1px solid var(--border-glass)', backgroundColor: 'var(--bg-card)' }}>
                                        <Plus size={24} color="var(--primary)" />
                                        <span className="outfit" style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.5px' }}>MANUAL</span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Item Detail Bottom Sheet ─────────────────────── */}
            <AnimatePresence>
                {selectedItem && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-overlay)', backdropFilter: 'blur(16px)', zIndex: 10000 }} />
                        <motion.div
                            initial={{ y: '100%', x: '-50%' }} 
                            animate={{ y: 0, x: '-50%' }} 
                            exit={{ y: '100%', x: '-50%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 280, mass: 1 }}
                            style={{ 
                                position: 'fixed', bottom: 0, 
                                left: '50%',
                                width: '100%', maxWidth: '480px', 
                                backgroundColor: 'var(--bg-app)', borderTop: '1px solid var(--border-glass)', 
                                borderTopLeftRadius: '48px', borderTopRightRadius: '48px', 
                                zIndex: 10001, overflow: 'hidden', color: 'var(--text-main)',
                                boxShadow: '0 -30px 100px rgba(0,0,0,0.05)',
                            }}
                        >
                            {/* Handle */}
                            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px', paddingBottom: '8px' }}>
                                <div style={{ width: '48px', height: '5px', backgroundColor: 'var(--border-glass)', borderRadius: '10px' }} />
                            </div>
                            {/* Image Showcase */}
                            <div style={{ height: '400px', overflow: 'hidden', backgroundColor: 'var(--bg-app)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {selectedItem.imageUrl ? (
                                    <motion.img 
                                        initial={{ scale: 1.1, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        src={selectedItem.imageUrl} 
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '40px' }} 
                                        alt="item" 
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '80px', color: 'var(--text-muted)', opacity: 0.1 }}>checkroom</span>
                                    </div>
                                )}
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-app), transparent 50%)' }} />
                                
                                <div style={{ position: 'absolute', top: '40px', right: '40px' }}>
                                    {selectedItem.color && (
                                        <div style={{ width: '56px', height: '56px', borderRadius: '20px', backgroundColor: selectedItem.color, border: '4px solid var(--border-glass)', boxShadow: `0 12px 30px ${selectedItem.color}22` }} />
                                    )}
                                </div>
                            </div>

                            {/* Details Content */}
                            <div style={{ padding: '0 32px 60px', marginTop: '-40px', position: 'relative' }}>
                                <div style={{ marginBottom: '32px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)' }} />
                                        <span className="outfit" style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '2px' }}>
                                            {(CATEGORIES.find(c => c.id === selectedItem.category)?.label || selectedItem.category).toUpperCase()}
                                        </span>
                                    </div>
                                    <h2 className="outfit" style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1.5px', margin: 0 }}>
                                        {selectedItem.brand || 'Premium Object'}
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>Size: <span style={{ color: 'var(--text-main)' }}>{selectedItem.size || 'FREE'}</span> • Registered on {new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                                </div>

                                {/* Care Instructions Section */}
                                <div className="glass-panel" style={{ padding: '28px', borderRadius: '32px', border: '1px solid var(--border-glass)', background: 'var(--bg-app)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Sparkles size={20} color="var(--primary)" />
                                        </div>
                                        <span className="outfit" style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '0.5px' }}>AI FABRIC ANALYSIS</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                                        {(selectedItem.materials || ['Silk Mix', 'Premium Cotton']).map((m, i) => (
                                            <span key={i} className="outfit" style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-main)', backgroundColor: 'var(--bg-card)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', letterSpacing: '0.5px' }}>{m.toUpperCase()}</span>
                                        ))}
                                    </div>

                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7', fontWeight: '600', marginBottom: '24px' }}>
                                        {selectedItem.laundryGuide || "고급 소재가 포함되어 있어 저온 세탁 및 자연 건조를 권장합니다. 형태 보존을 위해 전문 드라이클리닝이 가장 이상적입니다."}
                                    </p>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {(selectedItem.careSymbols || ['wash', 'dry_cleaning', 'no_bleach']).map((s, i) => (
                                            <div key={i} style={{ width: '52px', height: '52px', borderRadius: '18px', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--text-main)' }}>
                                                    {s === 'handwash' || s === 'wash' ? 'waves' : s === 'no-bleach' || s === 'no_bleach' ? 'block' : 'dry_cleaning'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '40px' }}>
                                    <button 
                                        onClick={() => setSelectedItem(null)}
                                        className="glass-panel"
                                        style={{ height: '60px', borderRadius: '20px', fontSize: '13px', fontWeight: 900, color: 'var(--text-muted)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}
                                    >
                                        CLOSE
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteItem(selectedItem)}
                                        className="glass-panel"
                                        style={{ height: '60px', borderRadius: '20px', fontSize: '13px', fontWeight: 900, color: '#ff6464', border: '1px solid rgba(255,100,100,0.2)', cursor: 'pointer', backgroundColor: 'rgba(255,100,100,0.05)' }}
                                    >
                                        DELETE
                                    </button>
                                    <button 
                                        onClick={() => {
                                            // [코다리 부장] 선택한 아이템을 피팅룸으로 전달하며 이동합니다!
                                            navigate('/fitting', { state: { initialItem: selectedItem } });
                                        }}
                                        style={{ height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', color: 'white', fontWeight: 900, fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(157,78,221,0.3)' }}
                                        className="outfit"
                                    >
                                        TRY ON
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Filter Bottom Sheet ────────────────────────── */}
            <AnimatePresence>
                {showFilterSheet && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFilterSheet(false)} style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(12px)', zIndex: 10000 }} />
                        <motion.div 
                            initial={{ y: '100%', x: '-50%' }} 
                            animate={{ y: 0, x: '-50%' }} 
                            exit={{ y: '100%', x: '-50%' }} 
                            transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }} 
                            style={{ 
                                position: 'fixed', bottom: 0, left: '50%',
                                width: '100%', maxWidth: '480px',
                                background: 'var(--bg-app)', borderTop: '1px solid var(--border-glass)', 
                                borderTopLeftRadius: '40px', borderTopRightRadius: '40px', 
                                padding: '40px 24px 60px', zIndex: 10001,
                                boxShadow: '0 -20px 60px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div style={{ width: '48px', height: '5px', background: 'var(--border-glass)', borderRadius: '10px', margin: '-16px auto 32px' }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <h3 className="outfit" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>SMART FILTERS</h3>
                                <button 
                                    onClick={() => {
                                        setSelectedSeasons([]);
                                        setSelectedMaterials([]);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700 }}
                                >
                                    Reset
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '32px' }}>
                                {/* Seasons */}
                                <div>
                                    <p className="outfit" style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '16px' }}>SEASONS</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                        {SEASONS.map(s => {
                                            const isSelected = selectedSeasons.includes(s.label);
                                            return (
                                                <motion.button
                                                    key={s.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        setSelectedSeasons(prev => 
                                                            isSelected ? prev.filter(item => item !== s.label) : [...prev, s.label]
                                                        );
                                                    }}
                                                    style={{ 
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                                        padding: '16px 8px', borderRadius: '20px', border: '1px solid var(--border-glass)',
                                                        backgroundColor: isSelected ? 'var(--primary-glow)' : 'var(--bg-card)',
                                                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '20px' }}>{s.icon}</span>
                                                    <span className="outfit" style={{ fontSize: '12px', fontWeight: 900 }}>{s.label}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Materials */}
                                <div>
                                    <p className="outfit" style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '16px' }}>MATERIALS</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {COMMON_MATERIALS.map(m => {
                                            const label = m.split('(')[0];
                                            const isSelected = selectedMaterials.includes(label);
                                            return (
                                                <motion.button
                                                    key={m}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        setSelectedMaterials(prev => 
                                                            isSelected ? prev.filter(item => item !== label) : [...prev, label]
                                                        );
                                                    }}
                                                    style={{ 
                                                        padding: '10px 18px', borderRadius: '14px', border: '1px solid var(--border-glass)',
                                                        backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                                                        color: isSelected ? 'white' : 'var(--text-main)',
                                                        fontSize: '13px', fontWeight: 700, transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {m}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <motion.button 
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowFilterSheet(false)}
                                    style={{ 
                                        width: '100%', height: '64px', borderRadius: '24px', 
                                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                                        color: 'white', border: 'none', fontWeight: 900, fontSize: '16px',
                                        boxShadow: '0 12px 30px rgba(157,78,221,0.2)', marginTop: '8px'
                                    }}
                                    className="outfit"
                                >
                                    APPLY FILTERS
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
