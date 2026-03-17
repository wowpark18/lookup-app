import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Scan, Tags } from 'lucide-react';

export default function BottomNav() {
    const location = useLocation();

    const navItems = [
        { name: '홈', path: '/dashboard', icon: Home },
        { name: '스캔', path: '/scan', icon: Scan },
        { name: '옷 등록', path: '/ocr', icon: Tags },
        { name: '캘린더', path: '/ootd', icon: Calendar },
    ];

    return (
        <nav className="glass-panel" style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            right: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 24px',
            zIndex: 50,
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px'
        }}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                            transition: 'color 0.3s ease'
                        }}
                    >
                        <div style={{
                            padding: '8px',
                            borderRadius: '50%',
                            background: isActive ? 'rgba(157, 78, 221, 0.15)' : 'transparent',
                            boxShadow: isActive ? '0 0 10px rgba(157, 78, 221, 0.3)' : 'none'
                        }}>
                            <Icon size={24} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 400 }}>{item.name}</span>
                    </Link>
                )
            })}
        </nav>
    );
}
