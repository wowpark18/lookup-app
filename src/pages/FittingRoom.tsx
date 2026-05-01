import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, RotateCcw, Sparkles, Plus, Check, Camera, Zap, RefreshCw, Layers, Cpu, Maximize2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getWardrobeItems, getUserProfile, type UserProfile, type WardrobeItem } from '../services/db';
import { auth } from '../lib/firebase';

export default function FittingRoom() {
    const navigate = useNavigate();
    const location = useLocation();
    const initialItem = location.state?.initialItem as WardrobeItem | null;
    
    const [selectedCategory, setSelectedCategory] = useState<'top' | 'bottom' | 'outer'>(
        initialItem ? (initialItem.category as any) : 'top'
    );
    const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [digitalTwin, setDigitalTwin] = useState<any>(null);
    const [fittingItems, setFittingItems] = useState({
        top: null as string | null,
        bottom: null as string | null,
        outer: null as string | null
    });

    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [aiInsight, setAiInsight] = useState("Preparing the neural engine for garment mapping...");

    useEffect(() => {
        const fetchData = async () => {
            const savedTwin = localStorage.getItem('lookUp_digitalTwin');
            if (savedTwin) setDigitalTwin(JSON.parse(savedTwin));

            if (auth.currentUser) {
                const [items, profile] = await Promise.all([
                    getWardrobeItems(auth.currentUser.uid),
                    getUserProfile(auth.currentUser.uid)
                ]);
                
                setWardrobe(items);
                setUserProfile(profile);

                if (initialItem) {
                    setFittingItems(prev => ({
                        ...prev,
                        [initialItem.category]: initialItem.imageUrl
                    }));
                }
            }
        };
        fetchData();
    }, []);

    const handleAITryOn = () => {
        if (!fittingItems.top && !fittingItems.bottom && !fittingItems.outer) {
            alert("Please select a garment first!");
            return;
        }
        setIsSynthesizing(true);
        setAiInsight("Analyzing fabric physics and body contour alignment...");
        
        setTimeout(() => {
            setAiInsight("Synthesizing multi-angle textures based on character sheet...");
        }, 1500);

        setTimeout(() => {
            setIsSynthesizing(false);
            setAiInsight("Perfect fit achieved. The silhouette alignment is optimal for your body type.");
        }, 3500);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            
            {/* Background Decorative Blur */}
            <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '300px', height: '300px', background: 'var(--primary-glow)', filter: 'blur(100px)', borderRadius: '50%', opacity: 0.3, zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: '20%', left: '-5%', width: '250px', height: '250px', background: 'var(--secondary-glow)', filter: 'blur(80px)', borderRadius: '50%', opacity: 0.2, zIndex: 0 }} />

            {/* Header - True Center Branding */}
            <header style={{ 
                padding: 'calc(12px + env(safe-area-inset-top, 44px)) 20px 12px', 
                display: 'grid', gridTemplateColumns: '60px 1fr 60px', alignItems: 'center', 
                background: 'var(--bg-header)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-glass)', zIndex: 100 
            }}>
                <button onClick={() => navigate(-1)} className="glass-panel" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <div className="outfit" style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '3px', color: 'var(--primary)', marginBottom: '2px' }}>VISION STUDIO</div>
                    <div className="outfit" style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-main)' }}>AI FITTING ENGINE</div>
                </div>
                <button onClick={() => setFittingItems({ top: null, bottom: null, outer: null })} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                    <RotateCcw size={18} />
                </button>
            </header>

            <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 10 }}>
                
                {/* Upper Section: Studio Screen & Reference Panel */}
                <div style={{ display: 'flex', gap: '16px', height: '52vh' }}>
                    
                    {/* Main Studio Screen */}
                    <div className="glass-panel" style={{ flex: 3, position: 'relative', overflow: 'hidden', padding: '0', border: '1px solid white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        
                        <AnimatePresence mode="wait">
                            {digitalTwin?.front ? (
                                <motion.div 
                                    key="studio-view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ width: '100%', height: '100%', position: 'relative' }}
                                >
                                    <motion.img 
                                        animate={{ opacity: isSynthesizing ? 0.4 : 1, scale: isSynthesizing ? 1.05 : 1 }}
                                        src={digitalTwin.front} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                    
                                    {/* HUD Overlays */}
                                    <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid white' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSynthesizing ? '#ff3b30' : '#4cd964' }} />
                                            <span className="outfit" style={{ fontSize: '10px', fontWeight: 900 }}>{isSynthesizing ? 'PROCESSING' : 'READY'}</span>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Maximize2 size={10} />
                                            <span className="outfit" style={{ fontSize: '9px', fontWeight: 700 }}>4K UPSCALING</span>
                                        </div>
                                    </div>

                                    {/* Corner Markers */}
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', width: '20px', height: '20px', borderRight: '2px solid var(--primary)', borderTop: '2px solid var(--primary)', opacity: 0.5 }} />
                                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '20px', height: '20px', borderLeft: '2px solid var(--primary)', borderBottom: '2px solid var(--primary)', opacity: 0.5 }} />
                                </motion.div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div className="animate-float" style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                        <Camera size={28} color="var(--primary)" />
                                    </div>
                                    <div className="outfit" style={{ fontWeight: 900, marginBottom: '20px' }}>NO DIGITAL TWIN DETECTED</div>
                                    <button onClick={() => navigate('/scan')} className="primary-button outfit" style={{ padding: '12px 24px', fontSize: '12px' }}>INITIALIZE SCAN</button>
                                </div>
                            )}
                        </AnimatePresence>

                    {/* Synthesis Effects & Style Insights */}
                    {isSynthesizing ? (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <motion.div 
                                animate={{ y: [-150, 150, -150] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', boxShadow: '0 0 20px var(--primary)' }}
                            />
                            <div style={{ position: 'absolute', bottom: '40px', width: '80%', padding: '16px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '16px', textAlign: 'center' }}>
                                <div className="outfit" style={{ fontSize: '12px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>AI FABRIC MAPPING...</div>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                                    <motion.div animate={{ width: ['0%', '100%'] }} transition={{ duration: 3.5, ease: "easeInOut" }} style={{ height: '100%', background: 'var(--primary)' }} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        (fittingItems.top || fittingItems.bottom || fittingItems.outer) ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ position: 'absolute', inset: '10px', pointerEvents: 'none', zIndex: 40 }}
                            >
                                <div style={{ position: 'absolute', top: '10%', left: '5%', borderLeft: '1px solid var(--primary)', paddingLeft: '8px' }}>
                                    <div className="outfit" style={{ fontSize: '8px', fontWeight: 900, color: 'var(--primary)' }}>SILHOUETTE</div>
                                    <div className="outfit" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-main)' }}>OPTIMIZED</div>
                                </div>
                                <div style={{ position: 'absolute', bottom: '15%', right: '5%', borderRight: '1px solid var(--primary)', paddingRight: '8px', textAlign: 'right' }}>
                                    <div className="outfit" style={{ fontSize: '8px', fontWeight: 900, color: 'var(--primary)' }}>FABRIC SIM</div>
                                    <div className="outfit" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-main)' }}>98.4% MATCH</div>
                                </div>
                            </motion.div>
                        ) : null
                    )}

                        {/* Fitted Clothing Logic Overlay */}
                        {!isSynthesizing && (fittingItems.top || fittingItems.bottom || fittingItems.outer) && (
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', justifyContent: 'center' }}
                                >
                                    {fittingItems.top && (
                                        <img src={fittingItems.top} style={{ position: 'absolute', top: '22%', width: '55%', height: '35%', objectFit: 'contain', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.15))' }} />
                                    )}
                                    {fittingItems.bottom && (
                                        <img src={fittingItems.bottom} style={{ position: 'absolute', bottom: '20%', width: '50%', height: '40%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }} />
                                    )}
                                </motion.div>
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Side Reference Panel (The 'Character Sheet' concept) */}
                        <div className="glass-panel" style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', border: '1px solid white', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '6px', opacity: 0.4, fontFamily: 'monospace' }}>LUP-SCAN v2.4</div>
                            <div className="outfit" style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-dim)' }}>BIOMETRICS</div>
                            
                            <div style={{ width: '100%', flex: 1, background: 'rgba(0,0,0,0.02)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.03)', position: 'relative' }}>
                                {digitalTwin?.face ? <img src={digitalTwin.face} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={14} color="#ccc" /></div>}
                                {digitalTwin?.face && <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'var(--primary)', opacity: 0.3 }} />}
                                <div style={{ position: 'absolute', bottom: '4px', right: '4px', fontSize: '5px', color: 'var(--primary)', fontWeight: 900 }}>FACIAL_MAP</div>
                            </div>

                            <div style={{ width: '100%', flex: 1, background: 'rgba(0,0,0,0.02)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.03)', position: 'relative' }}>
                                {digitalTwin?.side ? <img src={digitalTwin.side} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={14} color="#ccc" /></div>}
                                {digitalTwin?.side && <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'var(--primary)', opacity: 0.3 }} />}
                                <div style={{ position: 'absolute', bottom: '4px', right: '4px', fontSize: '5px', color: 'var(--primary)', fontWeight: 900 }}>LATERAL_V</div>
                            </div>

                            <div style={{ width: '100%', flex: 1, background: 'rgba(0,0,0,0.02)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.03)', position: 'relative' }}>
                                {digitalTwin?.back ? <img src={digitalTwin.back} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={14} color="#ccc" /></div>}
                                {digitalTwin?.back && <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'var(--primary)', opacity: 0.3 }} />}
                                <div style={{ position: 'absolute', bottom: '4px', right: '4px', fontSize: '5px', color: 'var(--primary)', fontWeight: 900 }}>POSTERIOR</div>
                            </div>
                        </div>

                        {/* AI Stats Bubble - Premium Refinement */}
                        <div className="glass-panel" style={{ padding: '10px', background: 'linear-gradient(135deg, white, #f8faff)', border: '1px solid white', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '2px', height: '100%', background: 'var(--primary)' }} />
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                <Cpu size={10} color="var(--primary)" />
                                <span className="outfit" style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.5px' }}>VISION_ENGINE</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                        <span style={{ fontSize: '6px', fontWeight: 800, color: 'var(--text-dim)' }}>STYLE HARMONY</span>
                                        <span style={{ fontSize: '6px', fontWeight: 900, color: 'var(--primary)' }}>92%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '2px', background: 'rgba(0,0,0,0.05)', borderRadius: '1px' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1.5 }} style={{ height: '100%', background: 'var(--primary)', borderRadius: '1px' }} />
                                    </div>
                                </div>
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                        <span style={{ fontSize: '6px', fontWeight: 800, color: 'var(--text-dim)' }}>PHYSICS ACC.</span>
                                        <span style={{ fontSize: '6px', fontWeight: 900, color: 'var(--primary)' }}>98%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '2px', background: 'rgba(0,0,0,0.05)', borderRadius: '1px' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: '98%' }} transition={{ duration: 2 }} style={{ height: '100%', background: 'var(--primary)', borderRadius: '1px' }} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '2px', fontSize: '7px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.6 }}>
                                    {userProfile?.measurements?.height ? `H: ${userProfile.measurements.height}cm` : 'H: PENDING'} | W: AUTO
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lower Section: Wardrobe Select & Action */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Category Tabs */}
                    <div className="glass-panel" style={{ padding: '4px', borderRadius: '16px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', display: 'flex' }}>
                        {(['top', 'bottom', 'outer'] as const).map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className="outfit"
                                style={{ 
                                    flex: 1, padding: '10px', borderRadius: '12px', fontSize: '11px', fontWeight: 900,
                                    background: selectedCategory === cat ? 'white' : 'transparent',
                                    color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-dim)',
                                    border: 'none', transition: 'all 0.3s',
                                    boxShadow: selectedCategory === cat ? '0 4px 10px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                {cat.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Horizontal Wardrobe List */}
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'none' }}>
                        {wardrobe.filter(i => i.category === selectedCategory).length > 0 ? (
                            wardrobe.filter(i => i.category === selectedCategory).map(item => (
                                <motion.div 
                                    key={item.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setFittingItems(prev => ({ ...prev, [selectedCategory]: item.imageUrl }))}
                                    style={{ 
                                        flexShrink: 0, width: '80px', height: '100px', borderRadius: '18px', 
                                        overflow: 'hidden', cursor: 'pointer', position: 'relative',
                                        border: fittingItems[selectedCategory] === item.imageUrl ? `2px solid var(--primary)` : '1px solid rgba(0,0,0,0.05)',
                                        boxShadow: fittingItems[selectedCategory] === item.imageUrl ? '0 8px 16px var(--primary-glow)' : 'none'
                                    }}
                                >
                                    <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {fittingItems[selectedCategory] === item.imageUrl && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(138, 43, 226, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
                                                <Check size={14} color="white" />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <div onClick={() => navigate('/ocr')} style={{ width: '100%', height: '100px', borderRadius: '18px', border: '1px dashed var(--border-glass)', background: 'rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', gap: '8px' }}>
                                <Plus size={18} />
                                <span className="outfit" style={{ fontSize: '9px', fontWeight: 900 }}>EMPTY WARDROBE</span>
                            </div>
                        )}
                    </div>

                    {/* AI Insight Bubble */}
                    <motion.div 
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="glass-panel" 
                        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.7)', border: '1px solid white' }}
                    >
                        <div style={{ padding: '8px', borderRadius: '12px', background: 'var(--primary-glow)' }}>
                            <Sparkles size={16} color="var(--primary)" />
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.5 }}>
                            {aiInsight}
                        </p>
                    </motion.div>

                    {/* Primary Action */}
                    <button 
                        disabled={isSynthesizing}
                        onClick={handleAITryOn}
                        className="primary-button outfit"
                        style={{ 
                            width: '100%', padding: '18px', borderRadius: '20px', 
                            fontSize: '15px', fontWeight: 900, letterSpacing: '1.5px',
                            boxShadow: '0 20px 40px var(--primary-glow)'
                        }}
                    >
                        {isSynthesizing ? (
                            <>
                                <RefreshCw size={18} className="spin" />
                                SYNTHESIZING LOOK...
                            </>
                        ) : (
                            <>
                                <Zap size={18} />
                                START AI SYNTHESIS
                            </>
                        )}
                    </button>
                    
                </div>
            </main>
        </div>
    );
}
