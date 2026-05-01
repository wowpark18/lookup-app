import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Camera, Image as ImageIcon, Sparkles, X, Loader2, ThermometerSun, Wind, CloudRain, Snowflake, Info, Tag, Ruler, Droplets } from 'lucide-react';
import { auth } from '../lib/firebase';
import { addWardrobeItem } from '../services/db';
import { analyzeClothingImage } from '../services/ai';

const CATEGORIES = [
    { id: 'top', label: '상의', icon: '👕', suggestions: ['티셔츠', '셔츠', '후드티', '맨투맨', '니트', '가디건'] },
    { id: 'bottom', label: '하의', icon: '👖', suggestions: ['청바지', '슬랙스', '반바지', '치마', '트레이닝 팬츠'] },
    { id: 'outer', label: '아우터', icon: '🧥', suggestions: ['코트', '패딩', '자켓', '점퍼', '무스탕'] },
    { id: 'shoes', label: '신발', icon: '👟', suggestions: ['스니커즈', '구두', '부츠', '샌들', '슬리퍼'] },
    { id: 'acc', label: '액세서리', icon: '💍', suggestions: ['모자', '가방', '스카프', '벨트', '안경'] },
];

const SEASONS = [
    { id: 'Spring', label: '봄', icon: <Wind size={14} /> },
    { id: 'Summer', label: '여름', icon: <ThermometerSun size={14} /> },
    { id: 'Fall', label: '가을', icon: <CloudRain size={14} /> },
    { id: 'Winter', label: '겨울', icon: <Snowflake size={14} /> },
];

export default function AddItem() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [image, setImage] = useState<string | null>(null);
    const [category, setCategory] = useState('top');
    const [subcategory, setSubcategory] = useState('');
    const [brand, setBrand] = useState('');
    const [size, setSize] = useState('');
    const [color, setColor] = useState('#ffffff');
    const [materials, setMaterials] = useState<string[]>([]);
    const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
    const [laundryGuide, setLaundryGuide] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'details' | 'care'>('info');
    const [modifiedFields, setModifiedFields] = useState<string[]>([]);

    
    // New fields
    const [fit, setFit] = useState('Regular');
    const [texture, setTexture] = useState<string[]>([]);

    const [analysisStatus, setAnalysisStatus] = useState('');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setModifiedFields([]); // New image, reset modified indicators
                setAnalysisStatus('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAutoFill = async () => {
        if (!image) return;
        setIsAnalyzing(true);
        setModifiedFields([]);
        setAnalysisStatus('디자인 분석 중...');
        
        try {
            // Sequence of statuses for better UX
            const statusInterval = setInterval(() => {
                const statuses = ['색상 파악 중...', '브랜드 검색 중...', '소재 확인 중...', '스타일 정의 중...'];
                setAnalysisStatus(prev => {
                    const idx = statuses.indexOf(prev);
                    return statuses[(idx + 1) % statuses.length];
                });
            }, 1000);

            const result = await analyzeClothingImage(image, 'clothes');
            clearInterval(statusInterval);
            setAnalysisStatus('분석 완료! ✨');
            if (result) {
                const updated: string[] = [];
                
                if (result.category) {
                    setCategory(result.category);
                    updated.push('category');
                }
                if (result.subcategory) {
                    setSubcategory(result.subcategory);
                    updated.push('subcategory');
                }
                if (result.brand && result.brand !== 'Unknown') {
                    setBrand(result.brand);
                    updated.push('brand');
                }
                if (result.color) {
                    setColor(result.color);
                    updated.push('color');
                }
                if (result.materials && result.materials.length > 0) {
                    setMaterials(result.materials);
                    updated.push('materials');
                }
                if (result.seasons && result.seasons.length > 0) {
                    setSelectedSeasons(result.seasons);
                    updated.push('seasons');
                }
                if (result.laundryGuide) {
                    setLaundryGuide(result.laundryGuide);
                    updated.push('laundryGuide');
                }
                if (result.fit) {
                    setFit(result.fit);
                    updated.push('fit');
                }
                if (result.texture && result.texture.length > 0) {
                    setTexture(result.texture);
                    updated.push('texture');
                }
                
                setModifiedFields(updated);
                
                // Show feedback
                if (result.laundryGuide) {
                    setTimeout(() => setActiveTab('care'), 1500);
                }
            }
        } catch (error) {
            console.error('AI 분석 실패:', error);
            alert('AI 분석 중 오류가 발생했습니다. 직접 입력해 주세요!');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleSeason = (seasonId: string) => {
        setSelectedSeasons(prev => 
            prev.includes(seasonId) 
                ? prev.filter(s => s !== seasonId) 
                : [...prev, seasonId]
        );
    };

    const handleSave = async () => {
        if (!auth.currentUser) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (!image) {
            alert('이미지를 등록해 주세요.');
            return;
        }

        if (!brand || brand === '어디 제품인가요?') {
            alert('브랜드를 입력해 주세요 (모를 경우 "Unknown" 입력)');
            setActiveTab('info');
            return;
        }

        if (!subcategory) {
            alert('상세 종류(예: 후드티)를 입력해 주세요.');
            setActiveTab('info');
            return;
        }

        if (selectedSeasons.length === 0) {
            alert('최소 하나 이상의 계절을 선택해 주세요.');
            setActiveTab('details');
            return;
        }

        setIsSaving(true);
        try {
            await addWardrobeItem({
                userId: auth.currentUser.uid,
                imageUrl: image,
                category,
                subcategory,
                brand: brand || 'Unknown Brand',
                size,
                color,
                materials,
                season: selectedSeasons,
                fit,
                texture,
                laundryGuide,

            });
            navigate('/wardrobe');
        } catch (error) {
            console.error('저장 실패:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            style={{ 
                minHeight: '100vh', 
                backgroundColor: 'var(--bg-app)', 
                color: 'var(--text-main)', 
                display: 'flex', 
                flexDirection: 'column' 
            }}
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
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)} 
                    style={{ 
                        width: '36px', height: '36px', borderRadius: '12px', 
                        background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                >
                    <ChevronLeft size={20} color="var(--text-main)" />
                </motion.button>

                <div className="outfit" style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '4px', color: 'var(--text-main)', textAlign: 'center' }}>
                    LOOK-UP
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSave}
                        disabled={isSaving || !image}
                        style={{
                            padding: '10px 16px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: 'white', border: 'none', fontWeight: 900, fontSize: '13px',
                            opacity: (isSaving || !image) ? 0.6 : 1, cursor: 'pointer',
                        }}
                    >
                        {isSaving ? <Check size={18} /> : 'DONE'}
                    </motion.button>
                </div>
            </header>

            <main style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '120px' }}>
                
                {/* Image Section */}
                <section>
                    <motion.div 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ 
                            width: '100%', aspectRatio: '1/1', borderRadius: '32px', 
                            background: 'var(--bg-card)', border: '2px dashed var(--border-glass)',
                            overflow: 'hidden', position: 'relative', display: 'flex',
                            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                        }}
                    >
                        {image ? (
                            <>
                                <img src={image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4))' }} />
                                <div style={{ position: 'absolute', bottom: '20px', left: '20px', display: 'flex', gap: '8px' }}>
                                    <div style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(20px)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.3)' }}>
                                        <Camera size={16} />
                                        <span style={{ fontSize: '12px', fontWeight: 800 }}>사진 변경</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                <motion.div 
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid var(--border-glass)' }}
                                >
                                    <ImageIcon size={32} color="var(--primary)" />
                                </motion.div>
                                <p style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)' }}>옷 사진을 찍거나 올려주세요</p>
                                <p style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>AI가 정보를 자동으로 입력해 드립니다</p>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                    </motion.div>

                    <AnimatePresence>
                        {image && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleAutoFill}
                                disabled={isAnalyzing}
                                style={{
                                    width: '100%', marginTop: '20px', padding: '18px', borderRadius: '24px',
                                    background: 'var(--bg-card)', border: '1px solid var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    color: 'var(--primary)', fontWeight: 900, fontSize: '15px', cursor: 'pointer', position: 'relative',
                                    overflow: 'hidden', boxShadow: '0 10px 20px rgba(157,78,221,0.1)'
                                }}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 size={18} className="spin" />
                                        <span style={{ letterSpacing: '0.5px' }}>{analysisStatus}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        <span style={{ letterSpacing: '0.5px' }}>AI 스마트 자동 입력</span>
                                    </>
                                )}
                                {isAnalyzing && (
                                    <motion.div 
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.1), transparent)' }}
                                    />
                                )}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </section>

                {/* Sub-Navigation Tabs */}
                <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '16px', padding: '4px', border: '1px solid var(--border-glass)' }}>
                    {(['info', 'details', 'care'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                background: activeTab === tab ? 'var(--text-main)' : 'transparent',
                                color: activeTab === tab ? 'var(--bg-app)' : 'var(--text-muted)',
                                fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px',
                                cursor: 'pointer', transition: 'all 0.3s'
                            }}
                        >
                            {tab === 'info' ? '기본 정보' : tab === 'details' ? '상세 정보' : '관리 방법'}
                        </button>
                    ))}
                </div>

                {/* Form Content */}
                <div style={{ position: 'relative' }}>
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' && (
                            <motion.div
                                key="info"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
                            >
                                {/* Category */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                             <Tag size={14} color="var(--primary)" />
                                             <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>카테고리</label>
                                         </div>
                                         {modifiedFields.includes('category') && <Sparkles size={12} color="var(--primary)" className="pulse" />}
                                     </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                        {CATEGORIES.map(cat => (
                                            <motion.button
                                                key={cat.id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setCategory(cat.id)}
                                                style={{
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                                    padding: '12px 4px', borderRadius: '16px', cursor: 'pointer',
                                                    background: category === cat.id ? 'var(--primary)' : 'var(--bg-card)',
                                                    border: '1px solid var(--border-glass)',
                                                    color: category === cat.id ? 'white' : 'var(--text-main)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                                                <span style={{ fontSize: '10px', fontWeight: 800 }}>{cat.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Subcategory & Brand */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>상세 종류</label>
                                            {modifiedFields.includes('subcategory') && <Sparkles size={12} color="var(--primary)" />}
                                        </div>
                                        <input 
                                            type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)}
                                            placeholder="예: 후드티"
                                            style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', background: 'var(--bg-card)', border: modifiedFields.includes('subcategory') ? '2px solid var(--primary)' : '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>브랜드</label>
                                            {modifiedFields.includes('brand') && <Sparkles size={12} color="var(--primary)" />}
                                        </div>
                                        <input 
                                            type="text" value={brand} onChange={e => setBrand(e.target.value)}
                                            placeholder="어디 제품인가요?"
                                            style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', background: 'var(--bg-card)', border: modifiedFields.includes('brand') ? '2px solid var(--primary)' : '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* Subcategory Suggestions */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '-12px' }}>
                                    {CATEGORIES.find(c => c.id === category)?.suggestions.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSubcategory(s)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800,
                                                background: subcategory === s ? 'var(--primary)' : 'var(--bg-app)',
                                                color: subcategory === s ? 'white' : 'var(--text-muted)',
                                                border: '1px solid var(--border-glass)', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>대표 색상</label>
                                        {modifiedFields.includes('color') && <Sparkles size={12} color="var(--primary)" />}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '20px', border: modifiedFields.includes('color') ? '2px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flexShrink: 0, position: 'relative' }}>
                                            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                        </div>
                                        <span className="outfit" style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)' }}>{color.toUpperCase()}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'details' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
                            >
                                {/* Size */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <Ruler size={14} color="var(--primary)" />
                                        <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>사이즈</label>
                                    </div>
                                    <input 
                                        type="text" value={size} onChange={e => setSize(e.target.value)}
                                        placeholder="L / 100 / 32 등"
                                        style={{ width: '100%', padding: '16px 24px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '15px', fontWeight: 700, outline: 'none' }}
                                    />
                                </div>

                                {/* Materials */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>혼용률 / 소재</label>
                                        {modifiedFields.includes('materials') && <Sparkles size={12} color="var(--primary)" />}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {materials.map((m, idx) => (
                                            <div key={idx} style={{ padding: '8px 16px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 800 }}>{m}</span>
                                                <X size={14} onClick={() => setMaterials(prev => prev.filter((_, i) => i !== idx))} style={{ cursor: 'pointer' }} />
                                            </div>
                                        ))}
                                        <input 
                                            type="text" 
                                            placeholder="+ 소재 직접 추가"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    const val = (e.target as HTMLInputElement).value.trim();
                                                    if (val) {
                                                        setMaterials(prev => [...prev, val]);
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }
                                            }}
                                            style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 800, fontSize: '13px', padding: '8px' }}
                                        />
                                    </div>
                                </div>

                                {/* Fit & Texture */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>핏 (Fit)</label>
                                            {modifiedFields.includes('fit') && <Sparkles size={12} color="var(--primary)" />}
                                        </div>
                                        <select 
                                            value={fit} onChange={e => setFit(e.target.value)}
                                            style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', background: 'var(--bg-card)', border: modifiedFields.includes('fit') ? '2px solid var(--primary)' : '1px solid var(--border-glass)', color: 'var(--text-main)', fontSize: '14px', fontWeight: 700, outline: 'none', appearance: 'none' }}
                                        >
                                            {['Slim', 'Regular', 'Relaxed', 'Oversized'].map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>질감/패턴</label>
                                            {modifiedFields.includes('texture') && <Sparkles size={12} color="var(--primary)" />}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {['Solid', 'Patterned', 'Knit', 'Denim', 'Leather'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTexture(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                                                    style={{ 
                                                        padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                                        background: texture.includes(t) ? 'var(--primary)' : 'var(--bg-app)',
                                                        color: texture.includes(t) ? 'white' : 'var(--text-main)',
                                                        border: '1px solid var(--border-glass)'
                                                    }}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Recommended Seasons */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>추천 계절</label>
                                        {modifiedFields.includes('seasons') && <Sparkles size={12} color="var(--primary)" />}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                        {SEASONS.map(s => (
                                            <motion.button
                                                key={s.id}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => toggleSeason(s.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                    padding: '14px 4px', borderRadius: '16px', cursor: 'pointer',
                                                    background: selectedSeasons.includes(s.id) ? 'var(--text-main)' : 'var(--bg-card)',
                                                    border: '1px solid var(--border-glass)',
                                                    color: selectedSeasons.includes(s.id) ? 'var(--bg-app)' : 'var(--text-main)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {s.icon}
                                                <span style={{ fontSize: '11px', fontWeight: 900 }}>{s.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'care' && (
                            <motion.div
                                key="care"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
                            >
                                {/* Laundry Advice */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Droplets size={16} color="var(--primary)" />
                                            <label style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '1px' }}>세탁 및 관리 가이드</label>
                                        </div>
                                        {modifiedFields.includes('laundryGuide') && <Sparkles size={14} color="var(--primary)" className="pulse" />}
                                    </div>
                                    <div style={{ padding: '24px', borderRadius: '24px', background: 'var(--bg-card)', border: modifiedFields.includes('laundryGuide') ? '2px solid var(--primary)' : '1px solid var(--border-glass)', position: 'relative' }}>
                                        <textarea 
                                            value={laundryGuide}
                                            onChange={e => setLaundryGuide(e.target.value)}
                                            placeholder="AI가 분석한 세탁 정보가 여기에 표시됩니다."
                                            style={{ width: '100%', minHeight: '120px', border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '15px', lineHeight: '1.6', fontWeight: 600, outline: 'none', resize: 'none' }}
                                        />
                                        <div style={{ position: 'absolute', top: '-10px', right: '20px', padding: '4px 12px', background: 'var(--primary)', borderRadius: '10px', color: 'white', fontSize: '10px', fontWeight: 900 }}>AI RECOMMENDATION</div>
                                    </div>
                                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', borderRadius: '12px', background: 'rgba(157,78,221,0.05)', color: 'var(--primary)' }}>
                                        <Info size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <p style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.5, margin: 0, opacity: 0.8 }}>AI 분석 결과는 실제 케어라벨과 다를 수 있습니다. 중요한 의류는 반드시 라벨을 확인해 주세요!</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </main>
        </motion.div>
    );
}
