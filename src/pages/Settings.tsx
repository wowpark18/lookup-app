import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, User, Bell, Shield, Smartphone, LogOut, CreditCard, Check, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { getUserProfile, saveUserProfile, type UserProfile } from '../services/db';

export default function Settings() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    const [personalColor, setPersonalColor] = useState(localStorage.getItem('personal_color') || 'spring');

    useEffect(() => {
        const loadProfile = async () => {
            if (auth.currentUser) {
                const data = await getUserProfile(auth.currentUser.uid);
                setProfile(data);
                if (data?.personalColor) {
                    setPersonalColor(data.personalColor);
                    localStorage.setItem('personal_color', data.personalColor);
                }
            }
            setIsLoading(false);
        };
        loadProfile();
    }, []);

    const colors = [
        { id: 'spring', name: '봄 웜톤', color: '#FFD966', desc: '생기 있고 밝은 느낌' },
        { id: 'summer', name: '여름 쿨톤', color: '#7EB5FF', desc: '청량하고 깨끗한 느낌' },
        { id: 'autumn', name: '가을 웜톤', color: '#A27B5C', desc: '차분하고 고급스러운 느낌' },
        { id: 'winter', name: '겨울 쿨톤', color: '#555555', desc: '선명하고 도시적인 느낌' },
    ];

    const handleColorSelect = async (id: string) => {
        setPersonalColor(id);
        localStorage.setItem('personal_color', id);
        if (auth.currentUser) {
            await saveUserProfile(auth.currentUser.uid, { personalColor: id });
        }
        setShowColorPicker(false);
    };

    const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!auth.currentUser || !profile) return;
        
        const formData = new FormData(e.currentTarget);
        const newData: Partial<UserProfile> = {
            name: formData.get('name') as string,
            measurements: {
                height: Number(formData.get('height')),
                shoulder: Number(formData.get('shoulder')),
                chest: Number(formData.get('chest')),
                armLength: Number(formData.get('armLength')),
                waist: Number(formData.get('waist')),
                hip: Number(formData.get('hip')),
                legLength: Number(formData.get('legLength')),
            }
        };

        await saveUserProfile(auth.currentUser.uid, newData);
        setProfile(prev => ({ ...prev!, ...newData }));
        setShowProfileModal(false);
        alert("프로필 정보가 업데이트되었습니다! 😎");
    };

    const sections = [
        { icon: <User size={20} />, title: "프로필 설정", desc: "닉네임, 체형 데이터 관리", onClick: () => setShowProfileModal(true) },
        { icon: <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(45deg, #FFB7B7, #7EB5FF, #FFD966, #A27B5C)' }} />, title: "퍼스널 컬러", desc: colors.find(c => c.id === personalColor)?.name || "나에게 어울리는 톤 설정", onClick: () => setShowColorPicker(true) },
        { icon: <CreditCard size={20} />, title: "구독 관리", desc: "Look-UP Pro 멤버십 상태", onClick: () => setShowSubscriptionModal(true) },
        { icon: <Bell size={20} />, title: "알림 설정", desc: "코디 추천, 쇼핑 혜택 알림", onClick: () => {} },
        { icon: <Shield size={20} />, title: "개인정보 보호", desc: "데이터 수집 및 이용 동의", onClick: () => {} },
        { icon: <Smartphone size={20} />, title: "앱 정보", desc: "Stable v1.5.2 (Latest)", onClick: () => {} },
    ];

    if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)' }}>로딩 중...</div>;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            style={{ minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', padding: '24px', paddingBottom: '100px' }}
        >
            {/* Header */}
            <div style={{ 
                paddingTop: 'calc(8px + env(safe-area-inset-top, 44px))', 
                paddingBottom: '24px',
                display: 'flex', alignItems: 'center', gap: '16px' 
            }}>
                <div onClick={() => navigate(-1)} className="glass-panel" style={{ cursor: 'pointer', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
                    <ChevronLeft size={22} color="var(--text-main)" />
                </div>
                <h1 className="outfit" style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px', margin: 0 }}>SETTINGS</h1>
            </div>

            {/* Profile Summary Card */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '28px', marginBottom: '32px', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: '120px', height: '120px', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '24px', border: '2px solid var(--border-glass)', overflow: 'hidden', boxShadow: '0 8px 16px rgba(0,0,0,0.05)' }}>
                        <img src={auth.currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="P" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{profile?.name || auth.currentUser?.displayName || '대표님'}</h2>
                            <span className="outfit" style={{ fontSize: '9px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', color: 'white', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', boxShadow: '0 4px 10px var(--primary-glow)' }}>{profile?.uid ? 'PRO MEMBER' : 'PRO'}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>{auth.currentUser?.email}</p>
                    </div>
                </div>
            </div>

            {/* Settings List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sections.map((item, idx) => (
                    <motion.div 
                        key={idx} 
                        whileTap={{ scale: 0.98 }} 
                        onClick={item.onClick}
                        className="glass-panel"
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '18px', padding: '20px', borderRadius: '24px', 
                            cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: '1px solid var(--border-glass)'
                        }}
                    >
                        <div style={{ color: 'var(--primary)', background: 'var(--primary-glow)', padding: '12px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{item.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>{item.desc}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Logout */}
            <div onClick={() => auth.signOut()} style={{ marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', color: '#ff4d4d', cursor: 'pointer', fontWeight: '900', fontSize: '15px', background: 'rgba(255,77,77,0.08)', borderRadius: '24px', border: '1px solid rgba(255,77,77,0.1)' }}>
                <LogOut size={20} />
                <span className="outfit" style={{ letterSpacing: '1px' }}>LOGOUT</span>
            </div>

            {/* Profile Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileModal(false)} style={{ position: 'absolute', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(20px)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                            style={{ position: 'relative', width: '100%', background: 'var(--bg-app)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px', maxHeight: '92vh', overflowY: 'auto', borderTop: '1px solid var(--border-glass)' }}
                        >
                             <div style={{ width: '40px', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', margin: '0 auto 24px' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <h3 className="outfit" style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)' }}>PROFILE & BODY</h3>
                                <div onClick={() => setShowProfileModal(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></div>
                            </div>
                            
                            <form onSubmit={handleProfileUpdate}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1.5px' }}>NICKNAME</label>
                                        <input name="name" defaultValue={profile?.name || ''} style={{ padding: '18px', borderRadius: '18px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.03)', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', outline: 'none' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        {[
                                            { label: 'HEIGHT (cm)', name: 'height' },
                                            { label: 'SHOULDER (cm)', name: 'shoulder' },
                                            { label: 'CHEST (cm)', name: 'chest' },
                                            { label: 'WAIST (inch)', name: 'waist' },
                                            { label: 'HIP (cm)', name: 'hip' },
                                            { label: 'LEG (cm)', name: 'legLength' },
                                            { label: 'ARM (cm)', name: 'armLength' },
                                        ].map(f => (
                                            <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>{f.label}</label>
                                                <input name={f.name} type="number" defaultValue={(profile?.measurements as any)?.[f.name] || ''} style={{ padding: '16px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.02)', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', outline: 'none' }} />
                                            </div>
                                        ))}
                                    </div>
                                    <button type="submit" style={{ marginTop: '20px', width: '100%', padding: '20px', borderRadius: '24px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 900, fontSize: '16px', boxShadow: '0 8px 24px var(--primary-glow)' }}>SAVE CHANGES</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Personal Color Picker */}
            <AnimatePresence>
                {showColorPicker && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowColorPicker(false)} style={{ position: 'absolute', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(20px)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 250 }}
                            style={{ position: 'relative', width: '100%', background: 'var(--bg-app)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px', borderTop: '1px solid var(--border-glass)' }}
                        >
                            <h3 className="outfit" style={{ fontSize: '22px', fontWeight: 900, marginBottom: '24px', color: 'var(--text-main)' }}>PERSONAL COLOR</h3>
                            <div style={{ display: 'grid', gap: '14px' }}>
                                {colors.map(c => (
                                    <motion.div 
                                        key={c.id} 
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleColorSelect(c.id)} 
                                        style={{ 
                                            padding: '20px', borderRadius: '24px', 
                                            border: `1px solid ${personalColor === c.id ? 'var(--primary)' : 'var(--border-glass)'}`, 
                                            background: personalColor === c.id ? 'var(--primary-glow)' : 'rgba(0,0,0,0.02)', 
                                            display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' 
                                        }}
                                    >
                                        <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: c.color, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{c.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>{c.desc}</div>
                                        </div>
                                        {personalColor === c.id && <Check size={20} color="var(--primary)" strokeWidth={3} />}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Subscription Modal */}
            <AnimatePresence>
                {showSubscriptionModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSubscriptionModal(false)} style={{ position: 'absolute', inset: 0, background: 'var(--bg-overlay)', backdropFilter: 'blur(20px)' }} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel"
                            style={{ position: 'relative', width: '100%', maxWidth: '380px', borderRadius: '40px', padding: '48px 32px', textAlign: 'center', border: '1px solid var(--border-glass)' }}
                        >
                            <div style={{ width: '88px', height: '88px', background: 'linear-gradient(135deg, rgba(157,78,221,0.1), rgba(255,0,110,0.1))', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', border: '1px solid var(--primary-glow)' }}>
                                <Sparkles size={44} color="var(--primary)" />
                            </div>
                            <h2 className="outfit" style={{ fontSize: '28px', fontWeight: 900, marginBottom: '14px', color: 'var(--text-main)' }}>Look-UP PRO</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '36px', fontWeight: '500' }}>나만의 AI 스타일리스트와 함께<br />스마트한 옷장을 완성해 보세요.</p>
                            
                            <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(0,0,0,0.02)', marginBottom: '32px', textAlign: 'left', border: '1px solid var(--border-glass)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>연간 구독 프리미엄</span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '15px' }}>₩49,000 / 년</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '600' }}>30% DISCOUNT APPLIED</div>
                            </div>
                            
                            <button onClick={() => { alert("PRO 멤버십 구독이 완료되었습다!"); setShowSubscriptionModal(false); }} style={{ width: '100%', padding: '22px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', border: 'none', fontWeight: 900, fontSize: '17px', boxShadow: '0 12px 24px rgba(157,78,221,0.3)' }}>START NOW</button>
                            <button onClick={() => setShowSubscriptionModal(false)} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>DISMISS</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
