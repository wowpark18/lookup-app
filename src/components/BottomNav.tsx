import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const navItems = [
    { name: '홈', path: '/dashboard', icon: 'home' },
    { name: '옷장', path: '/wardrobe', icon: 'checkroom' },
    { name: '쇼핑몰', path: '/shop', icon: 'shopping_bag' },
    { name: 'OOTD', path: '/ootd', icon: 'calendar_month' },
];

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: '480px',
            height: '84px', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            paddingBottom: '20px',
            backgroundColor: 'var(--bg-overlay)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border-glass)',
            zIndex: 9999,
        }}>
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <div
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={{
                            position: 'relative',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            width: '70px', height: '100%',
                            cursor: 'pointer',
                        }}
                    >
                        {/* 활성화 배경 박스: 안정성을 위해 layoutId 제거 및 직접 제어 */}
                        <motion.div
                            initial={false}
                            animate={{
                                opacity: isActive ? 1 : 0,
                                scale: isActive ? 1 : 0.8,
                            }}
                            style={{
                                position: 'absolute',
                                width: '54px', height: '54px',
                                backgroundColor: 'rgba(157, 78, 221, 0.15)',
                                borderRadius: '18px',
                                border: '1px solid rgba(157, 78, 221, 0.3)',
                                zIndex: 0,
                                boxShadow: '0 4px 12px var(--primary-glow)',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />

                        {/* 아이콘 */}
                        <span className="material-symbols-outlined" style={{
                            position: 'relative',
                            fontSize: '26px',
                            color: isActive ? 'var(--primary)' : 'var(--text-muted)', 
                            fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                            transition: 'color 0.25s ease',
                            zIndex: 1,
                            marginBottom: '2px'
                        }}>
                            {item.icon}
                        </span>

                        {/* 라벨 */}
                        <span style={{ 
                            position: 'relative',
                            fontSize: '11px', 
                            fontWeight: isActive ? '800' : '500', 
                            color: isActive ? 'var(--primary)' : 'var(--text-muted)', 
                            transition: 'color 0.25s ease',
                            zIndex: 1,
                        }}>
                            {item.name}
                        </span>
                    </div>
                );
            })}
        </nav>
    );
}
