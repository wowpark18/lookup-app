import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles, TrendingUp, Info, ArrowRight, ExternalLink } from 'lucide-react';

export default function Shop() {

    const RECOMMENDED_PRODUCTS = [
        {
            id: 1,
            name: "Premium Cashmere Knit",
            brand: "LEMAIRE",
            price: "₩425,000",
            img: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=400&auto=format&fit=crop",
            tag: "BEST MATCH"
        },
        {
            id: 2,
            name: "Classic Wool Overcoat",
            brand: "SANDERSON",
            price: "₩890,000",
            img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop",
            tag: "WARDROBE ESSENTIAL"
        },
        {
            id: 3,
            name: "Wide Straight Denim",
            brand: "A.P.C.",
            price: "₩280,000",
            img: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=400&auto=format&fit=crop",
            tag: "WEEKEND LOOK"
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', paddingBottom: '100px' }}>
            
            {/* Header */}
            <header style={{ padding: '60px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="outfit" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', color: 'var(--text-main)' }}>SMART SHOP</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>대표님만을 위한 큐레이션</p>
                </div>
                <motion.div whileTap={{ scale: 0.9 }} style={{ position: 'relative', cursor: 'pointer' }}>
                    <div className="glass-panel" style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
                        <ShoppingBag size={22} color="var(--primary)" />
                    </div>
                    <div style={{ position: 'absolute', top: -5, right: -5, width: '20px', height: '20px', backgroundColor: 'var(--secondary)', borderRadius: '50%', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg-app)', fontWeight: '900' }}>2</div>
                </motion.div>
            </header>

            {/* AI Wardrobe Analysis Card */}
            <section style={{ padding: '0 20px', marginBottom: '32px' }}>
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="glass-panel"
                    style={{ borderRadius: '28px', padding: '24px', color: 'var(--text-main)', border: '1px solid var(--border-glass)', position: 'relative', overflow: 'hidden' }}
                >
                    <div style={{ position: 'absolute', top: -40, right: -40, width: '120px', height: '120px', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(30px)', opacity: 0.5 }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(157,78,221,0.2)' }}>
                            <TrendingUp size={18} color="var(--primary)" />
                        </div>
                        <span className="outfit" style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: 'var(--primary)' }}>WARDROBE ANALYSIS</span>
                    </div>
                    
                    <h2 style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.5, marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                        대표님은 현재 <span style={{ color: 'var(--primary)' }}>상의 비중이 70%</span>로 다소 높습니다. 하의와의 밸런스를 고려한 스마트 쇼핑을 추천드려요.
                    </h2>

                    <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 1 }}>
                        {[
                            { label: '상의', val: '14점', active: false },
                            { label: '하의 필요', val: '3점', active: true },
                            { label: '아우터', val: '5점', active: false },
                        ].map((stat, i) => (
                            <div key={i} style={{ 
                                flex: 1, 
                                backgroundColor: stat.active ? 'var(--primary-glow)' : 'var(--bg-app)', 
                                padding: '16px 10px', 
                                borderRadius: '18px', 
                                textAlign: 'center', 
                                border: stat.active ? '1.5px solid var(--primary)' : '1px solid var(--border-glass)',
                                boxShadow: stat.active ? '0 8px 16px var(--primary-glow)' : 'none'
                             }}>
                                <div style={{ fontSize: '10px', color: stat.active ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '6px', fontWeight: '800' }}>{stat.label}</div>
                                <div style={{ fontSize: '17px', fontWeight: '900', color: stat.active ? 'var(--primary)' : 'var(--text-main)' }}>{stat.val}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Recommended List */}
            <section style={{ padding: '0 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', padding: '0 4px' }}>
                    <h3 className="outfit" style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.5px' }}>EXCLUSIVE FOR YOU</h3>
                    <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        SEE ALL <ArrowRight size={14} />
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {RECOMMENDED_PRODUCTS.map((product) => (
                        <motion.div 
                            key={product.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="glass-panel"
                            style={{ display: 'flex', gap: '18px', borderRadius: '24px', padding: '14px', border: '1px solid var(--border-glass)' }}
                        >
                            <div style={{ width: '100px', height: '100px', borderRadius: '18px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-glass)' }}>
                                <img src={product.img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                    <Sparkles size={12} color="var(--primary)" />
                                    <span className="outfit" style={{ fontSize: '10px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>{product.tag}</span>
                                </div>
                                <h4 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px', color: 'var(--text-main)' }}>{product.name}</h4>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '12px' }}>{product.brand}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="outfit" style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>{product.price}</span>
                                    <motion.button 
                                        whileTap={{ scale: 0.92 }}
                                        style={{ 
                                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                                            color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', 
                                            fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px',
                                            boxShadow: '0 4px 12px var(--primary-glow)'
                                        }}
                                    >
                                        BUY <ExternalLink size={12} />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Smart Styling Info */}
            <section style={{ padding: '40px 20px' }}>
                <div style={{ 
                    background: 'linear-gradient(135deg, rgba(58,134,255,0.05) 0%, rgba(157,78,221,0.05) 100%)', 
                    borderRadius: '24px', padding: '24px', display: 'flex', alignItems: 'flex-start', gap: '18px',
                    border: '1px solid rgba(58,134,255,0.1)'
                }}>
                    <div style={{ backgroundColor: 'rgba(58,134,255,0.1)', padding: '10px', borderRadius: '14px' }}>
                        <Info size={20} color="var(--accent)" />
                    </div>
                    <div>
                        <h4 className="outfit" style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', color: 'var(--accent)', letterSpacing: '0.5px' }}>SMART SHOPPING TIP</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 500 }}>
                            대표님의 '봄 웜톤' 데이터와 현재 글로벌 트렌드를 결합한 결과입니다. 위 아이템들은 기존 옷장 아이템과의 코디 매칭률이 85% 이상으로 예측됩니다.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
