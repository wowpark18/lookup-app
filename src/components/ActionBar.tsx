import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

interface ActionBarProps {
    primaryText?: string;
    secondaryText?: string;
    onPrimaryClick?: () => void;
    onSecondaryClick?: () => void;
    isPrimaryLoading?: boolean;
    isSecondaryLoading?: boolean;
    primaryIcon?: string;
    secondaryIcon?: string;
}

export default function ActionBar({
    primaryText = "WEAR NOW",
    secondaryText = "SHUFFLE",
    onPrimaryClick,
    onSecondaryClick,
    isPrimaryLoading = false,
    isSecondaryLoading = false,
    primaryIcon = "check_circle",
    secondaryIcon = "shuffle"
}: ActionBarProps) {
    const location = useLocation();
    const navigate = useNavigate();

    // Only show on specific main pages
    const visiblePaths = ['/dashboard', '/wardrobe', '/shop', '/ootd'];
    const isVisible = visiblePaths.some(path => location.pathname.startsWith(path));

    if (!isVisible) return null;

    return (
        <div style={{ 
            position: 'fixed', 
            bottom: '84px', // Exactly above BottomNav
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '100%', 
            maxWidth: '480px', 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px', 
            height: '72px', 
            padding: '12px 20px', 
            zIndex: 9000,
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border-glass)',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.03)'
        }}>
            <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={onPrimaryClick || (() => navigate('/ootd'))} 
                disabled={isPrimaryLoading}
                style={{ 
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                    color: 'white', 
                    borderRadius: '16px', 
                    fontWeight: 900, 
                    fontSize: '13px', 
                    border: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    boxShadow: '0 8px 16px rgba(157,78,221,0.2)', 
                    opacity: isPrimaryLoading ? 0.7 : 1,
                    cursor: 'pointer'
                }}
                className="outfit"
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: isPrimaryLoading ? 'spin 1s linear infinite' : 'none' }}>
                    {isPrimaryLoading ? 'sync' : primaryIcon}
                </span> 
                {isPrimaryLoading ? 'SAVING...' : primaryText}
            </motion.button>

            <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={onSecondaryClick || (() => navigate('/dashboard'))} 
                disabled={isSecondaryLoading}
                className="glass-panel outfit"
                style={{ 
                    color: 'var(--text-main)', 
                    borderRadius: '16px',
                    fontWeight: 900, 
                    fontSize: '13px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    opacity: isSecondaryLoading ? 0.7 : 1,
                    cursor: 'pointer',
                    border: '1px solid var(--border-glass)',
                    backgroundColor: 'var(--bg-card)'
                }}
            >
                <motion.span 
                    animate={{ rotate: isSecondaryLoading ? 360 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px' }}
                >
                    {secondaryIcon}
                </motion.span> 
                {isSecondaryLoading ? '...' : secondaryText}
            </motion.button>
        </div>
    );
}
