import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, User, Settings, Info, CloudRain, ChevronRight, ChevronDown, UserPlus, X, Upload, Bell, Moon, HelpCircle, LogOut, Sun, Cloud, CloudSnow, CloudLightning, CloudFog, Mic, Wand2, Send, Bot, Shirt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { Suspense, Component, useEffect, useState, useMemo, useRef } from 'react';
import type { ReactNode, WheelEvent, TouchEvent } from 'react';
import * as THREE from 'three';

// Error Boundary for 3D Model
class ModelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#a1a1aa' }}>
                    <p>3D 모델을 불러올 수 없습니다.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function AvatarModel({ panY, zoom, profileId, styleColor }: { panY: number; zoom: number; profileId: string; styleColor: string }) {
    // Using a local cached Xbot glTF as a placeholder to ensure it loads without network/CORS issues
    const { scene } = useGLTF('/assets/Xbot.glb');

    // 스캔(Scan3D) 페이지에서 측정한 결과를 가져옵니다. 없을 경우 기본 비율(1.0)을 유지합니다.
    const measurements = useMemo(() => {
        if (profileId.startsWith('child')) {
            // 자녀(아동) 비율: 관절 메시가 깨지지 않는 선에서 귀엽고 자연스러운 아동 체형(머리가 크고 팔다리가 약간 짧음)으로 조정
            return { height: 0.75, armLength: 0.85, legLength: 0.85, chestDepth: 0.95, thighWidth: 0.95, headSize: 1.25, hipSize: 0.95 };
        }
        try {
            const dataStr = localStorage.getItem('lookUpMeasurements');
            if (dataStr) {
                const raw = JSON.parse(dataStr);
                // Scan3D에서 cm 단위로 수집된 값을 Three.js 스케일 비율(1.0) 기준으로 변환합니다.
                return { 
                    height: (raw.height || 175) / 175, 
                    armLength: (raw.armLength || 60) / 60, 
                    legLength: (raw.legLength || 102) / 102, 
                    chestDepth: (raw.chest || 95) / 95, 
                    thighWidth: (raw.hip || 98) / 98, 
                    headSize: 1.0, 
                    hipSize: (raw.hip || 98) / 98 
                };
            }
        } catch (e) {
            console.error(e);
        }
        return { height: 1.0, armLength: 1.0, legLength: 1.0, chestDepth: 1.0, thighWidth: 1.0, headSize: 1.0, hipSize: 1.0 };
    }, [profileId]);

    // T-pose를 차렷 자세로 만들고 스캔된 체형 비율(Morphing)을 관절(Bone) 구조에 적용합니다.
    useEffect(() => {
        if (!scene) return;

        // 선택된 OOTD 옵션에 따라 아바타 옷(메쉬) 색상 변경 시뮬레이션
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.name === 'Alpha_Surface' && mesh.material) {
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    if (mat.color) {
                        mat.color.set(styleColor);
                        mat.needsUpdate = true;
                    }
                }
            }
        });

        const leftArm = scene.getObjectByName('mixamorigLeftArm');
        const rightArm = scene.getObjectByName('mixamorigRightArm');
        const leftForeArm = scene.getObjectByName('mixamorigLeftForeArm');
        const rightForeArm = scene.getObjectByName('mixamorigRightForeArm');

        const head = scene.getObjectByName('mixamorigHead');
        const spine1 = scene.getObjectByName('mixamorigSpine1');
        const spine2 = scene.getObjectByName('mixamorigSpine2');
        const hips = scene.getObjectByName('mixamorigHips');

        const leftUpLeg = scene.getObjectByName('mixamorigLeftUpLeg');
        const rightUpLeg = scene.getObjectByName('mixamorigRightUpLeg');
        const leftLeg = scene.getObjectByName('mixamorigLeftLeg');
        const rightLeg = scene.getObjectByName('mixamorigRightLeg');

        // 1. 팔(Arm)을 Z축 기준으로 내려 차렷 자세 모방
        if (leftArm) leftArm.rotation.z = -1.2;
        if (rightArm) rightArm.rotation.z = 1.2;

        // 2. 신체 세부 계측 스케일링 (체형 변형 처리)

        // 흉곽(가슴 두께와 너비)
        if (spine1) spine1.scale.set(measurements.chestDepth, 1, measurements.chestDepth);
        if (spine2) spine2.scale.set(measurements.chestDepth, 1, measurements.chestDepth);

        // 얼굴 크기 (상위 노드인 Spine/Neck의 스케일 축소를 상쇄하여 머리가 길쭉해지는 왜곡 방지)
        if (head) {
            head.scale.set(
                measurements.headSize / measurements.chestDepth,
                measurements.headSize,
                measurements.headSize / measurements.chestDepth
            );
        }

        // 힙 사이즈
        if (hips) hips.scale.set(measurements.hipSize, 1, measurements.hipSize);

        // 허벅지 둘레 (X, Z 스케일) & 허벅지 뼈 길이 (Y 스케일)
        if (leftUpLeg) leftUpLeg.scale.set(measurements.thighWidth, measurements.legLength, measurements.thighWidth);
        if (rightUpLeg) rightUpLeg.scale.set(measurements.thighWidth, measurements.legLength, measurements.thighWidth);

        // 종아리 뼈 길이
        if (leftLeg) leftLeg.scale.set(1, measurements.legLength, 1);
        if (rightLeg) rightLeg.scale.set(1, measurements.legLength, 1);

        // 팔 길이 측정 반영
        if (leftArm) leftArm.scale.y = measurements.armLength;
        if (rightArm) rightArm.scale.y = measurements.armLength;
        if (leftForeArm) leftForeArm.scale.y = measurements.armLength;
        if (rightForeArm) rightForeArm.scale.y = measurements.armLength;

    }, [scene, measurements, styleColor]);

    // 전체 키(신장)는 최상단 primitive object의 전체 scale 파라미터에 곱해 반영합니다.
    const overallScale = zoom * measurements.height;
    return <primitive object={scene} scale={overallScale} position={[0, -1.4 + panY, 0]} />;
}

const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, filter: 'blur(10px)' }
};

export default function Dashboard() {
    const navigate = useNavigate();

    // 수동으로 아바타를 제어하기 위한 상태
    const [panY, setPanY] = useState(0);
    const [zoom, setZoom] = useState(1.55); // 약간 축소하여 헤드룸(머리 위쪽 공간) 확보
    const [touchDist, setTouchDist] = useState(0);
    const [profiles, setProfiles] = useState<{ id: string, name: string }[]>([
        { id: 'adult', name: 'Emma' },
        { id: 'child', name: '온유 (자녀)' }
    ]);
    const [selectedProfile, setSelectedProfile] = useState<{ id: string, name: string }>(profiles[0]);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showProfileDetail, setShowProfileDetail] = useState(false);
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [newProfileName, setNewProfileName] = useState("");
    const [selectedOOTD, setSelectedOOTD] = useState<'A' | 'B' | 'C'>('A');
    const [profileImages, setProfileImages] = useState<Record<string, string>>({});
    const [showSubscription, setShowSubscription] = useState(false);
    const [pushNotificationEnabled, setPushNotificationEnabled] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    const [measurements, setMeasurements] = useState(() => {
        const saved = localStorage.getItem('lookUpMeasurements');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { }
        }
        return {
            height: 175,
            shoulder: 45,
            chest: 95,
            armLength: 60,
            waist: 78,
            hip: 98,
            legLength: 102
        };
    });

    const handleMeasurementChange = (key: keyof typeof measurements, value: string) => {
        const numValue = parseInt(value) || 0;
        const newMeasurements = { ...measurements, [key]: numValue };
        setMeasurements(newMeasurements);
        localStorage.setItem('lookUpMeasurements', JSON.stringify(newMeasurements));
    };

    const [personalColor, setPersonalColor] = useState(() => {
        const saved = localStorage.getItem('lookUpPersonalColor');
        return saved || 'Summer Cool';
    });
    const [personalColorStatus, setPersonalColorStatus] = useState<'scan' | 'photo' | 'manual'>('manual');

    useEffect(() => {
        // Initial check for status
        const savedStatus = localStorage.getItem('lookUpPersonalColorStatus') as any;
        if (savedStatus) setPersonalColorStatus(savedStatus);
    }, []);

    const personalColorTypes = [
        { id: 'Spring Warm', label: '봄 웜톤', gradient: 'linear-gradient(135deg, #FF9E7D, #FFCF81)', colors: ['#FF9E7D', '#FFCF81', '#FFEB94'] },
        { id: 'Summer Cool', label: '여름 쿨톤', gradient: 'linear-gradient(135deg, #B9E9FF, #D6B9FF)', colors: ['#B9E9FF', '#D6B9FF', '#FFB9D6'] },
        { id: 'Autumn Warm', label: '가을 웜톤', gradient: 'linear-gradient(135deg, #965D30, #D2B48C)', colors: ['#965D30', '#D2B48C', '#8A3324'] },
        { id: 'Winter Cool', label: '겨울 쿨톤', gradient: 'linear-gradient(135deg, #2E3192, #1BFFFF)', colors: ['#2E3192', '#1BFFFF', '#FF00FF'] }
    ];

    const handlePersonalColorChange = (type: string, status: 'scan' | 'photo' | 'manual' = 'manual') => {
        setPersonalColor(type);
        setPersonalColorStatus(status);
        localStorage.setItem('lookUpPersonalColor', type);
        localStorage.setItem('lookUpPersonalColorStatus', status);
    };

    // 3D 스캔 데이터 감지하여 1차 진단 (초기 1회)
    useEffect(() => {
        const hasScanned = localStorage.getItem('lookUpMeasurements');
        const hasStatus = localStorage.getItem('lookUpPersonalColorStatus');

        if (hasScanned && !hasStatus) {
            // 3D 스캔 정보를 기반으로 한 1차 임의 진단 (실제는 피부톤 센서 데이터 활용 가정)
            handlePersonalColorChange('Summer Cool', 'scan');
        }
    }, []);

    // 팝업창(모달) 오픈 시 배경 스크롤 잠금
    useEffect(() => {
        const isModalOpen = showProfileDetail || showAddProfile || showSettings || showAIChat || showSubscription;
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            // iOS 등 일부 브라우저 대응을 위해 터치 이동 제한 추가 가능
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showProfileDetail, showAddProfile, showSettings, showAIChat, showSubscription]);

    const profileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showProfileMenu]);

    // 위치 기반 날씨 호출 Effect
    const [weather, setWeather] = useState<{ temp: number; text: string; icon: any; color: string } | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setWeather({ temp: 16, text: '위치 확인 불가', icon: Cloud, color: '#A9B2C3' });
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Open-Meteo 무료 호환 날씨 API (API-Key 불필요)
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                const data = await res.json();
                const code = data.current_weather.weathercode;
                const temp = Math.round(data.current_weather.temperature);

                let text = '맑음'; let Icon = Sun; let color = '#FDB813';
                if (code === 0 || code === 1) { text = '맑음'; Icon = Sun; color = '#FDB813'; }
                else if (code === 2 || code === 3) { text = '구름 많음'; Icon = Cloud; color = '#A9B2C3'; }
                else if (code >= 51 && code <= 67) { text = '비'; Icon = CloudRain; color = '#A7C7E7'; }
                else if (code >= 71 && code <= 77) { text = '눈'; Icon = CloudSnow; color = '#E0E8F5'; }
                else if (code >= 80 && code <= 82) { text = '소나기'; Icon = CloudRain; color = '#A7C7E7'; }
                else if (code >= 85 && code <= 86) { text = '눈보라'; Icon = CloudSnow; color = '#E0E8F5'; }
                else if (code >= 95) { text = '천둥번개'; Icon = CloudLightning; color = '#9d4edd'; }
                else if (code === 45 || code === 48) { text = '안개'; Icon = CloudFog; color = '#A9B2C3'; }

                setWeather({ temp, text, icon: Icon, color });
            } catch (error) {
                console.error("날씨 정보 호출 실패:", error);
                setWeather({ temp: 16, text: '날씨 정보 없음', icon: Cloud, color: '#A9B2C3' });
            }
        }, (error) => {
            console.error("위치 정보 없음:", error);
            setWeather({ temp: 16, text: '위치 인증 필요', icon: Cloud, color: '#A9B2C3' });
        });
    }, []);

    // 날씨/기온에 따른 동적 OOTD 추천 산출
    const dynamicOOTDOptions = useMemo(() => {
        let baseText = '';
        let A, B, C;

        const isRaining = weather?.text.includes('비') || weather?.text.includes('소나기');
        const temp = weather?.temp ?? 20;

        if (isRaining) {
            baseText = `비 오는 ${temp}°C 날씨에 맞춘 추천입니다.`;
            A = {
                title: `Option A (세이프 룩)`,
                desc: `발수 코팅된 울 트렌치 코트와 다크 플루이드 팬츠로 물튀김을 방어하세요.`,
                topImg: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop',
                topName: '발수 트렌치 코트',
                bottomImg: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop',
                bottomName: '다크 플루이드 팬츠',
                avatarColor: '#0f172a'
            };
            B = {
                title: `Option B (트렌디 룩)`,
                desc: `힙한 숏 윈드브레이커와 나일론 카고 팬츠 조합.`,
                topImg: 'https://plus.unsplash.com/premium_photo-1673356302835-1d6ebfa70c40?w=400&h=400&fit=crop&q=80',
                topName: '블랙 윈드브레이커',
                bottomImg: 'https://images.unsplash.com/photo-1517438476312-d0d7b2ece4ca?w=400&h=400&fit=crop',
                bottomName: '카키 나일론 카고',
                avatarColor: '#171717'
            };
            C = {
                title: `Option C (모험 룩)`,
                desc: `컬러풀한 레인부츠와 매치하기 좋은 비비드 숏 자켓 코디.`,
                topImg: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=400&fit=crop',
                topName: '비비드 숏 레인자켓',
                bottomImg: 'https://images.unsplash.com/photo-1584865288642-42078afe6942?w=400&h=400&fit=crop',
                bottomName: '화이트 코튼 팬츠',
                avatarColor: '#eab308'
            };
        } else if (temp < 10) {
            baseText = `쌀쌀한 ${temp}°C 날씨에 맞춘 보온성 추천입니다.`;
            A = {
                title: `Option A (세이프 룩)`,
                desc: `단정하고 깔끔한 네이비 싱글 코트와 따뜻한 울 슬랙스.`,
                topImg: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=400&h=400&fit=crop',
                topName: '네이비 싱글 코트',
                bottomImg: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop',
                bottomName: '베이지 울 슬랙스',
                avatarColor: '#1e3a8a'
            };
            B = {
                title: `Option B (트렌디 룩)`,
                desc: `실루엣을 살려주는 글로시 크롭 패딩과 와이드 데님.`,
                topImg: 'https://images.unsplash.com/photo-1545594861-3bef4369fec6?w=400&h=400&fit=crop',
                topName: '글로시 크롭 패딩',
                bottomImg: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop',
                bottomName: '와이드 인디고 데님',
                avatarColor: '#171717'
            };
            C = {
                title: `Option C (모험 룩)`,
                desc: `눈에 띄는 브라운 무스탕 코디로 스타일리시하게.`,
                topImg: 'https://images.unsplash.com/photo-1520975954732-57dd22299614?w=400&h=400&fit=crop',
                topName: '오버핏 브라운 무스탕',
                bottomImg: 'https://images.unsplash.com/photo-1584865288642-42078afe6942?w=400&h=400&fit=crop',
                bottomName: '크림 코듀로이 팬츠',
                avatarColor: '#b45309'
            };
        } else if (temp > 25) {
            baseText = `더운 ${temp}°C 날씨에 맞춘 시원한 추천입니다.`;
            A = {
                title: `Option A (세이프 룩)`,
                desc: `통기성 좋은 린넨 셔츠와 라이트 쿨 슬랙스.`,
                topImg: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=400&h=400&fit=crop',
                topName: '화이트 린넨 셔츠',
                bottomImg: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop',
                bottomName: '라이트 쿨 슬랙스',
                avatarColor: '#f1f5f9'
            };
            B = {
                title: `Option B (트렌디 룩)`,
                desc: `힙한 그래픽 오버핏 반팔과 나일론 카고 하프팬츠.`,
                topImg: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&h=400&fit=crop',
                topName: '그래픽 오버 티셔츠',
                bottomImg: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop',
                bottomName: '블랙 카고 하프팬츠',
                avatarColor: '#3b82f6'
            };
            C = {
                title: `Option C (모험 룩)`,
                desc: `과감한 네트 슬리브리스와 디스트로이드 와이드 데님.`,
                topImg: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=400&fit=crop',
                topName: '네트 니트 슬리브리스',
                bottomImg: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop',
                bottomName: '디스트로이드 블루진',
                avatarColor: '#d946ef'
            };
        } else {
            baseText = `야외 활동하기 적당한 ${temp}°C 날씨 코디입니다.`;
            A = {
                title: `Option A (세이프 룩)`,
                desc: `실패 없는 단정한 정석 네이비 셔츠 코디.`,
                topImg: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=400&h=400&fit=crop',
                topName: '네이비 셔츠',
                bottomImg: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop',
                bottomName: '베이지 치노 팬츠',
                avatarColor: '#1e3a8a'
            };
            B = {
                title: `Option B (트렌디 룩)`,
                desc: `요즘 유행하는 힙한 블랙 레더 자켓.`,
                topImg: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
                topName: '블랙 크롭 레더',
                bottomImg: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop',
                bottomName: '와이드 인디고 데님',
                avatarColor: '#171717'
            };
            C = {
                title: `Option C (모험 룩)`,
                desc: `평소 안 입어봤지만 분위기 반전을 노릴 화사한 가디건.`,
                topImg: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=400&fit=crop',
                topName: '마젠타 브이넥 가디건',
                bottomImg: 'https://images.unsplash.com/photo-1584865288642-42078afe6942?w=400&h=400&fit=crop',
                bottomName: '크림 핀턱 슬랙스',
                avatarColor: '#d946ef'
            };
        }

        return { A, B, C, baseText };
    }, [weather]);

    // 휠(트랙패드/마우스) 수직 핀치/패닝 핸들러
    const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
            // 트랙패드 핀치-줌 (ctrlKey == true)
            setZoom(prev => Math.max(1.0, Math.min(4.0, prev - e.deltaY * 0.01)));
        } else {
            // 두 손가락 위아래 스와이프: 위아래 패닝
            setPanY(prev => Math.max(-2.5, Math.min(2.5, prev - e.deltaY * 0.005)));
        }
    };

    // 모바일 터치 기반 핀치-줌 핸들러
    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            setTouchDist(dist);
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && touchDist > 0) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist - touchDist;
            setZoom(prev => Math.max(1.0, Math.min(4.0, prev + delta * 0.01)));
            setTouchDist(dist);
        }
    };

    const handleTouchEnd = () => {
        setTouchDist(0);
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ padding: '0px', display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            {/* 1st Viewport : Info & 3D Avatar */}
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '12px' }}>
                {/* Header Profile Area */}
                <div className="flex-row items-center justify-between" style={{ padding: '16px 24px 8px', zIndex: 10 }}>
                    <div className="flex-row items-center gap-4">
                        <div
                            style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                padding: '2px',
                                boxShadow: '0 4px 15px rgba(157, 78, 221, 0.4)',
                                cursor: 'pointer'
                            }}
                            onClick={() => setShowProfileDetail(true)}
                        >
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%',
                                background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {profileImages[selectedProfile.id] ? (
                                    <img src={profileImages[selectedProfile.id]} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={20} color="var(--primary)" />
                                )}
                            </div>
                        </div>
                        <div className="flex-col">
                            <div style={{ position: 'relative' }} ref={profileMenuRef}>
                                <div
                                    className="flex-row items-center gap-2"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                >
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
                                        {isLoggedIn ? selectedProfile.name : "게스트 (GUEST)"}
                                    </h2>
                                    <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
                                </div>

                                {showProfileMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            position: 'absolute', top: '100%', left: 0, marginTop: '8px',
                                            background: 'var(--bg-dark)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px', padding: '8px', zIndex: 100, width: '180px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {!isLoggedIn ? (
                                            <div
                                                style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(157, 78, 221, 0.1)', border: '1px solid rgba(157, 78, 221, 0.2)' }}
                                                onClick={() => { setShowLoginModal(true); setShowProfileMenu(false); }}
                                            >
                                                <div className="flex-row items-center gap-2">
                                                    <Bot size={16} color="var(--primary)" />
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>
                                                        로그인 / 가입
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ padding: '4px 12px 10px', opacity: 0.5 }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: 'var(--primary)' }}>MEMBER / LV.12</span>
                                                </div>
                                                {profiles.map(p => (
                                                    <div
                                                        key={p.id}
                                                        style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: selectedProfile.id === p.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                                                        onClick={() => { setSelectedProfile(p); setShowProfileMenu(false); }}
                                                    >
                                                        <span style={{ fontSize: '14px', fontWeight: 500, color: selectedProfile.id === p.id ? 'white' : 'rgba(255,255,255,0.7)' }}>
                                                            {p.id === 'adult' ? `${p.name} (나)` : p.name}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                                                <div
                                                    className="flex-row items-center gap-2"
                                                    style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary)' }}
                                                    onClick={() => { setShowSubscription(true); setShowProfileMenu(false); }}
                                                >
                                                    <UserPlus size={14} />
                                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>자녀 프로필 추가</span>
                                                </div>
                                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                                                <div
                                                    className="flex-row items-center gap-2"
                                                    style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
                                                    onClick={() => { setIsLoggedIn(false); setShowProfileMenu(false); }}
                                                >
                                                    <LogOut size={14} />
                                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>로그아웃</span>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-row items-center gap-2">
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSubscription(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(10px)',
                                padding: '3px 4px 3px 10px', borderRadius: '20px', cursor: 'pointer',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                            }}
                        >
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.3px' }}>Free Plan</span>
                            <div style={{
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                borderRadius: '16px', padding: '3px 8px',
                                display: 'flex', alignItems: 'center', gap: '3px',
                                boxShadow: '0 2px 8px rgba(255, 0, 110, 0.4)'
                            }}>
                                <Sparkles size={9} color="white" />
                                <span style={{ fontSize: '9px', fontWeight: 800, color: 'white' }}>UPGRADE</span>
                            </div>
                        </motion.div>
                        <div className="glass-panel" style={{ padding: '10px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => setShowSettings(true)}>
                            <Settings size={20} />
                        </div>
                    </div>
                </div>

                {/* Central Interactive 3D AR Mirror */}
                <div style={{ padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <motion.div
                        className="glass-panel"
                        style={{
                            flex: 1,
                            minHeight: '480px',
                            borderRadius: '32px',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)'
                        }}
                    >
                        {/* Ambient Background for Mirror */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(21,15,36,0) 0%, rgba(7,5,15,0.8) 100%)', zIndex: 1, pointerEvents: 'none' }} />
                        <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1], y: [-20, 20, -20] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ position: 'absolute', top: '-10%', left: '-10%', width: '70%', height: '50%', background: 'radial-gradient(circle, rgba(157, 78, 221, 0.4) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }}
                        />

                        {/* Top Badge Overlay */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
                            {weather ? (
                                <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <weather.icon size={16} color={weather.color} />
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: weather.color }}>
                                        {weather.text} · {weather.temp}°C
                                    </span>
                                </div>
                            ) : (
                                <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>날씨 정보 탐색 중...</span>
                                </div>
                            )}
                            <div
                                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,0,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--secondary)', cursor: 'pointer', pointerEvents: 'auto' }}
                                onClick={() => setShowAIChat(true)}
                            >
                                <Sparkles size={20} color="var(--secondary)" />
                            </div>
                        </div>

                        {/* 3D Canvas Area (Interactive) */}
                        <div
                            style={{ flex: 1, position: 'relative', zIndex: 5, cursor: 'grab', touchAction: 'none' }}
                            onWheel={handleWheel}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <ModelErrorBoundary>
                                <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                                    <ambientLight intensity={0.8} />
                                    <directionalLight position={[5, 10, 5]} intensity={1.5} color="#fff" />
                                    <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#9d4edd" />
                                    <Environment preset="city" />
                                    <Suspense fallback={null}>
                                        <AvatarModel panY={panY} zoom={zoom} profileId={selectedProfile.id} styleColor={dynamicOOTDOptions[selectedOOTD].avatarColor} />
                                    </Suspense>
                                    <OrbitControls
                                        enableZoom={false}
                                        enablePan={true}
                                        autoRotate={false}
                                        maxPolarAngle={Math.PI / 1.5}
                                        minPolarAngle={Math.PI / 4}
                                    />
                                </Canvas>
                            </ModelErrorBoundary>

                            {/* Hint Badge */}
                            <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                                <span style={{
                                    fontSize: '11px', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.5)',
                                    padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    회전(1손가락/클릭) · 확대/상하이동(2손가락)
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Scrolling Content: Outfit Recommendations */}
            <div style={{ padding: '0 24px', paddingBottom: '32px' }}>
                <div className="glass-panel" style={{ borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', marginBottom: '32px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <span style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', background: 'rgba(157, 78, 221, 0.1)', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(157, 78, 221, 0.2)' }}>
                            ✨ {dynamicOOTDOptions.baseText}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                            onClick={() => setSelectedOOTD('A')}
                            style={{ flex: 1, padding: '10px 0', borderRadius: '12px', background: selectedOOTD === 'A' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: selectedOOTD === 'A' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: '0.3s' }}
                        >
                            A (세이프)
                        </button>
                        <button
                            onClick={() => setSelectedOOTD('B')}
                            style={{ flex: 1, padding: '10px 0', borderRadius: '12px', background: selectedOOTD === 'B' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: selectedOOTD === 'B' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: '0.3s' }}
                        >
                            B (트렌디)
                        </button>
                        <button
                            onClick={() => setSelectedOOTD('C')}
                            style={{ flex: 1, padding: '10px 0', borderRadius: '12px', background: selectedOOTD === 'C' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: selectedOOTD === 'C' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: '0.3s' }}
                        >
                            C (모험)
                        </button>
                    </div>

                    <h3 className="outfit text-gradient" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{dynamicOOTDOptions[selectedOOTD].title}</h3>
                    <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
                        {dynamicOOTDOptions[selectedOOTD].desc}
                    </p>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="glass-panel" style={{ flex: 1, padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '100%', height: '100px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                                <img src={dynamicOOTDOptions[selectedOOTD].topImg} alt={dynamicOOTDOptions[selectedOOTD].topName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center', wordBreak: 'keep-all' }}>{dynamicOOTDOptions[selectedOOTD].topName}</span>
                        </div>
                        <div className="glass-panel" style={{ flex: 1, padding: '12px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '100%', height: '100px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
                                <img src={dynamicOOTDOptions[selectedOOTD].bottomImg} alt={dynamicOOTDOptions[selectedOOTD].bottomName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'center', wordBreak: 'keep-all' }}>{dynamicOOTDOptions[selectedOOTD].bottomName}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            < div style={{ padding: '0 24px', paddingBottom: '150px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-muted)' }}>나의 스마트 클로젯</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="glass-panel"
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '20px' }}
                        onClick={() => navigate('/scan')}
                    >
                        <div style={{ background: 'linear-gradient(135deg, rgba(58, 134, 255, 0.2), rgba(58, 134, 255, 0.05))', padding: '16px', borderRadius: '50%', boxShadow: '0 4px 20px rgba(58, 134, 255, 0.15)' }}>
                            <Camera size={24} color="var(--accent)" />
                        </div>
                        <h4 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textAlign: 'center' }}>3D 메이커</h4>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="glass-panel"
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '20px' }}
                        onClick={() => navigate('/ocr')}
                    >
                        <div style={{ background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.2), rgba(255, 0, 110, 0.05))', padding: '16px', borderRadius: '50%', boxShadow: '0 4px 20px rgba(255, 0, 110, 0.15)' }}>
                            <Info size={24} color="var(--secondary)" />
                        </div>
                        <h4 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textAlign: 'center' }}>영수증 / 태그</h4>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="glass-panel"
                        style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '20px' }}
                    // onClick={() => navigate('/my-closet')}
                    >
                        <div style={{ background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.2), rgba(157, 78, 221, 0.05))', padding: '16px', borderRadius: '50%', boxShadow: '0 4px 20px rgba(157, 78, 221, 0.15)' }}>
                            <Shirt size={24} color="var(--primary)" />
                        </div>
                        <h4 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textAlign: 'center' }}>내 옷장 보기</h4>
                    </motion.div>
                </div>
            </div>

            {/* Profile Detail & Face Upload Modal */}
            <AnimatePresence>
                {
                    showProfileDetail && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
                                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                                padding: '24px', overflowY: 'auto', WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="glass-panel"
                                style={{
                                    width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '32px',
                                    display: 'flex', flexDirection: 'column', position: 'relative',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    marginTop: '20px', marginBottom: '20px'
                                }}
                            >
                                <div style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer' }} onClick={() => setShowProfileDetail(false)}>
                                    <X size={24} color="rgba(255,255,255,0.7)" />
                                </div>

                                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>
                                    {selectedProfile.name} 상세 프로필
                                </h2>

                                {/* 1. Face Photo Upload (동기화) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                                    <div style={{
                                        width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                        border: '2px dashed rgba(255,255,255,0.2)', marginBottom: '12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        {profileImages[selectedProfile.id] ? (
                                            <img src={profileImages[selectedProfile.id]} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <User size={40} color="rgba(255,255,255,0.3)" />
                                        )}
                                        <label style={{
                                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: profileImages[selectedProfile.id] ? 'rgba(0,0,0,0.5)' : 'transparent', transition: '0.2s',
                                            opacity: profileImages[selectedProfile.id] ? 0 : 1, cursor: 'pointer'
                                        }}>
                                            {!profileImages[selectedProfile.id] && <Upload size={24} color="var(--primary)" />}
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const url = URL.createObjectURL(e.target.files[0]);
                                                    setProfileImages(prev => ({ ...prev, [selectedProfile.id]: url }));

                                                    // 고해상도 얼굴 사진 등록 시 2차 정밀 진단 시뮬레이션
                                                    setTimeout(() => {
                                                        const diagnosisResult = 'Winter Cool'; // 실제로는 이미지 분석 로직
                                                        handlePersonalColorChange(diagnosisResult, 'photo');
                                                        alert("📸 얼굴 분석 완료: 더 정확한 '2차 정밀 진단' 결과가 반영되었습니다!");
                                                    }, 1500);
                                                }
                                            }} />
                                        </label>
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>사진을 등록해 3D 얼굴을 스캐닝 하세요.</p>
                                </div>

                                {/* 2. Detail Avatar Stats (실측 신체 사이즈) */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>3D 정밀 스캔 데이터 (cm)</h3>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>* 탭하여 직접 수정 가능</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {[
                                            { key: 'height', label: '신장 (키)' },
                                            { key: 'shoulder', label: '어깨 너비' },
                                            { key: 'chest', label: '가슴 둘레' },
                                            { key: 'waist', label: '허리 둘레' },
                                            { key: 'hip', label: '엉덩이 둘레' },
                                            { key: 'armLength', label: '팔 길이' },
                                            { key: 'legLength', label: '다리 길이' }
                                        ].map((stat, i) => (
                                            <div key={i} style={{
                                                display: 'flex', flexDirection: 'column', gap: '4px',
                                                padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                                                border: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{stat.label}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number"
                                                        value={measurements[stat.key as keyof typeof measurements] || ''}
                                                        onChange={(e) => handleMeasurementChange(stat.key as keyof typeof measurements, e.target.value)}
                                                        style={{
                                                            width: '100%', background: 'transparent', border: 'none',
                                                            color: 'white', fontSize: '15px', fontWeight: 700,
                                                            outline: 'none', padding: 0
                                                        }}
                                                    />
                                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>cm</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Personal Color Selection */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>퍼스널 컬러 진단 결과</h3>
                                            <span style={{
                                                fontSize: '10px',
                                                color: personalColorStatus === 'photo' ? '#4CAF50' : personalColorStatus === 'scan' ? '#FFC107' : 'rgba(255,255,255,0.4)',
                                                fontWeight: 700
                                            }}>
                                                {personalColorStatus === 'photo' ? '● 2차 정밀 분석 완료 (사진 기반)' :
                                                    personalColorStatus === 'scan' ? '● 1차 기초 진단 완료 (3D 스캔 기반)' :
                                                        '● 수동 설정 모드'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}></span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                        {personalColorTypes.map((type) => (
                                            <div
                                                key={type.id}
                                                onClick={() => handlePersonalColorChange(type.id)}
                                                style={{
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    background: personalColor === type.id ? type.gradient : 'rgba(255,255,255,0.05)',
                                                    border: personalColor === type.id ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                    transform: personalColor === type.id ? 'scale(1.05)' : 'scale(1)',
                                                    boxShadow: personalColor === type.id ? '0 10px 20px rgba(0,0,0,0.3)' : 'none',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <span style={{
                                                    fontSize: '13px',
                                                    fontWeight: 800,
                                                    color: personalColor === type.id ? 'white' : 'white',
                                                    textShadow: personalColor === type.id ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                                                    zIndex: 2
                                                }}>
                                                    {type.label}
                                                </span>
                                                <div style={{ display: 'flex', gap: '4px', zIndex: 2 }}>
                                                    {type.colors.map((c, idx) => (
                                                        <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.3)' }} />
                                                    ))}
                                                </div>
                                                {personalColor === type.id && (
                                                    <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                                                        <Sparkles size={12} color="white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                                        선택된 퍼스널 컬러는 AI 코디 추천 최적화에 활용됩니다.
                                    </p>
                                </div>


                                {/* Actions */}
                                <button className="primary-button" style={{ width: '100%', marginTop: '24px', padding: '16px', borderRadius: '16px' }} onClick={() => setShowProfileDetail(false)}>
                                    정보 적용 및 닫기
                                </button>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Add Child Profile Modal */}
            <AnimatePresence>
                {
                    showAddProfile && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 110,
                                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="glass-panel"
                                style={{
                                    width: '100%', maxWidth: '360px', padding: '24px', borderRadius: '32px',
                                    display: 'flex', flexDirection: 'column', position: 'relative',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                }}
                            >
                                <div style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer' }} onClick={() => setShowAddProfile(false)}>
                                    <X size={24} color="rgba(255,255,255,0.7)" />
                                </div>

                                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>
                                    새 자녀 프로필 추가
                                </h2>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>자녀 이름 (애칭)</label>
                                    <input
                                        type="text"
                                        placeholder="이름을 입력하세요"
                                        value={newProfileName}
                                        onChange={(e) => setNewProfileName(e.target.value)}
                                        style={{
                                            width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.4)',
                                            border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                <button
                                    className="primary-button"
                                    style={{ width: '100%', padding: '16px', borderRadius: '16px', opacity: newProfileName ? 1 : 0.5 }}
                                    disabled={!newProfileName}
                                    onClick={() => {
                                        if (newProfileName.trim() === '') return;
                                        const newProfile = { id: `child_${Date.now()}`, name: `${newProfileName} (자녀)` };
                                        setProfiles([...profiles, newProfile]);
                                        setSelectedProfile(newProfile);
                                        setNewProfileName('');
                                        setShowAddProfile(false);
                                    }}
                                >
                                    프로필 등록하기
                                </button>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Quick Settings Modal */}
            <AnimatePresence>
                {
                    showSettings && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120,
                                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="glass-panel"
                                style={{
                                    width: '100%', maxWidth: '360px', padding: '24px', borderRadius: '32px',
                                    display: 'flex', flexDirection: 'column', position: 'relative',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                }}
                            >
                                <div style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer' }} onClick={() => setShowSettings(false)}>
                                    <X size={24} color="rgba(255,255,255,0.7)" />
                                </div>

                                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', textAlign: 'left' }}>
                                    설정 (Settings)
                                </h2>

                                {/* Subscription Upgrade Banner */}
                                <div
                                    onClick={() => { setShowSettings(false); setShowSubscription(true); }}
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.2), rgba(255, 0, 110, 0.2))',
                                        borderRadius: '16px', padding: '16px', cursor: 'pointer',
                                        border: '1px solid rgba(255, 0, 110, 0.3)', marginBottom: '24px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>👑 Look-UP Pro 업그레이드</h3>
                                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>무제한 옷장 & 고급 AI 코디</p>
                                    </div>
                                    <ChevronRight size={20} color="var(--primary)" />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div
                                        onClick={() => setPushNotificationEnabled(!pushNotificationEnabled)}
                                        className="flex-row items-center justify-between"
                                        style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', cursor: 'pointer' }}
                                    >
                                        <div className="flex-row items-center gap-3">
                                            <Bell size={20} color={pushNotificationEnabled ? "var(--primary)" : "rgba(255,255,255,0.4)"} />
                                            <span style={{ fontSize: '15px' }}>푸시 알림</span>
                                        </div>
                                        <div style={{
                                            width: '40px', height: '24px', borderRadius: '12px',
                                            background: pushNotificationEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                            position: 'relative', transition: '0.3s'
                                        }}>
                                            <motion.div
                                                animate={{ x: pushNotificationEnabled ? 16 : 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                style={{ position: 'absolute', left: '4px', top: '4px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }}
                                            />
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setIsDarkMode(!isDarkMode)}
                                        className="flex-row items-center justify-between"
                                        style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', cursor: 'pointer' }}
                                    >
                                        <div className="flex-row items-center gap-3">
                                            <Moon size={20} color={isDarkMode ? "var(--primary)" : "rgba(255,255,255,0.4)"} />
                                            <span style={{ fontSize: '15px' }}>다크 모드</span>
                                        </div>
                                        <div style={{
                                            width: '40px', height: '24px', borderRadius: '12px',
                                            background: isDarkMode ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                            position: 'relative', transition: '0.3s'
                                        }}>
                                            <motion.div
                                                animate={{ x: isDarkMode ? 16 : 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                style={{ position: 'absolute', left: '4px', top: '4px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-row items-center justify-between" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', cursor: 'pointer' }}>
                                        <div className="flex-row items-center gap-3">
                                            <HelpCircle size={20} color="var(--primary)" />
                                            <span style={{ fontSize: '15px' }}>앱 정보 / 고객센터</span>
                                        </div>
                                        <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
                                    </div>
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '24px 0 16px' }} />

                                <div className="flex-row items-center gap-3" style={{ padding: '8px', cursor: 'pointer', opacity: 0.8 }}
                                    onClick={() => {
                                        if (!isLoggedIn) setShowLoginModal(true);
                                        else {
                                            setIsLoggedIn(false);
                                            setShowSettings(false);
                                        }
                                    }}
                                >
                                    <LogOut size={18} color="var(--secondary)" />
                                    <span style={{ fontSize: '14px', color: 'var(--secondary)', fontWeight: 500 }}>
                                        {isLoggedIn ? '로그아웃' : '로그인 / 회원가입'}
                                    </span>
                                </div>

                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* AI Stylist Chat / Command Modal */}
            <AnimatePresence>
                {
                    showAIChat && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120,
                                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '24px'
                            }}
                        >
                            <div style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer', zIndex: 130 }} onClick={() => setShowAIChat(false)}>
                                <X size={28} color="white" />
                            </div>

                            {/* 대화창 화면 영역 (기본: 1번 대화형 AI) */}
                            <div style={{ flex: 1, width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}
                                >
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(157, 78, 221, 0.4)'
                                    }}>
                                        <Bot size={40} color="white" />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <h2 className="outfit text-gradient" style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                                            Look-UP AI Stylist
                                        </h2>
                                        <div style={{ display: 'inline-block', background: 'rgba(255,0,110,0.2)', color: 'var(--secondary)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, marginBottom: '16px', cursor: 'pointer', border: '1px solid rgba(255,0,110,0.3)' }} onClick={() => setShowSubscription(true)}>
                                            오늘 무료 AI 추천 3/3 남음 ⚡️ 무제한 업그레이드
                                        </div>
                                        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                                            "오늘 날씨에 맞춰서 코디를 도와드릴까요?"<br />
                                            <span style={{ fontSize: '14px', opacity: 0.6 }}>(착장 분석/평가는 AR 피팅룸 화면에서 제공됩니다)</span>
                                        </p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* 입력 & 기능 액션 바 */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="glass-panel"
                                style={{
                                    width: '100%', maxWidth: '800px', padding: '12px 16px', borderRadius: '24px',
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                }}
                            >
                                {/* 2. 자동 코디 생성 (Auto-Styling 버튼) */}
                                <button style={{
                                    background: 'rgba(58, 134, 255, 0.2)', border: '1px solid rgba(58, 134, 255, 0.3)',
                                    width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', flexShrink: 0
                                }}>
                                    <Wand2 size={20} color="#3a86ff" />
                                </button>

                                {/* 1. 대화창 텍스트 입력 */}
                                <input
                                    type="text"
                                    placeholder="예: 결혼식 하객 코디 추천해줘"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    style={{
                                        flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '16px',
                                        outline: 'none'
                                    }}
                                />

                                {chatInput.length > 0 ? (
                                    // 텍스트가 있을 때는 전송 버튼
                                    <button style={{
                                        background: 'var(--primary)', border: 'none', width: '44px', height: '44px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                                    }}>
                                        <Send size={20} color="white" />
                                    </button>
                                ) : (
                                    // 4. 음성 인식 비서 호출 (텍스트가 없을 때 마이크 버튼)
                                    <button style={{
                                        background: 'rgba(255, 0, 110, 0.2)', border: '1px solid rgba(255, 0, 110, 0.3)', width: '44px', height: '44px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                                    }}>
                                        <Mic size={20} color="var(--secondary)" />
                                    </button>
                                )}
                            </motion.div>
                        </motion.div>
                    )
                }

                {/* --- Subscription Modal --- */}
                {
                    showSubscription && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120,
                                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="glass-panel"
                                style={{
                                    width: '100%', maxWidth: '90%', padding: '24px', borderRadius: '32px',
                                    display: 'flex', flexDirection: 'column', position: 'relative',
                                    border: '1px solid rgba(255, 0, 110, 0.4)',
                                    boxShadow: '0 20px 60px rgba(255, 0, 110, 0.25)',
                                    maxHeight: '85vh', overflowY: 'auto'
                                }}
                            >
                                <div style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer', zIndex: 10 }} onClick={() => setShowSubscription(false)}>
                                    <X size={24} color="rgba(255,255,255,0.7)" />
                                </div>

                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 10px 30px rgba(255, 0, 110, 0.3)' }}>
                                        <Sparkles size={28} color="white" />
                                    </div>
                                    <h2 className="outfit text-gradient" style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                                        멤버십 업그레이드
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                                        라이프스타일에 맞는 요금제를 선택하세요.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Pro Plan */}
                                    <div style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '20px', padding: '20px', position: 'relative', overflow: 'hidden'
                                    }}>
                                        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderBottomLeftRadius: '12px' }}>
                                            ⭐ 가장 인기
                                        </div>
                                        <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Look-UP Pro</h3>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>나만의 완벽한 스마트 클로젯</p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                            <div className="flex-row items-center gap-2"><Shirt size={14} color="var(--primary)" /><span style={{ fontSize: '13px' }}>옷장 등록 무제한 (무료 30벌)</span></div>
                                            <div className="flex-row items-center gap-2"><Bot size={14} color="var(--secondary)" /><span style={{ fontSize: '13px' }}>AI 코디 추천 무제한 + 체형/컬러 매칭</span></div>
                                            <div className="flex-row items-center gap-2" style={{ opacity: 0.6 }}><Sparkles size={14} /><span style={{ fontSize: '13px' }}>본인 프로필 1개 전용 (추가 불가)</span></div>
                                        </div>

                                        <button
                                            onClick={() => { if (!isLoggedIn) setShowLoginModal(true); }}
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: '12px',
                                                background: 'rgba(255, 0, 110, 0.2)', color: 'white', border: '1px solid rgba(255, 0, 110, 0.5)',
                                                fontSize: '15px', fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            월 ₩4,900
                                        </button>
                                    </div>

                                    {/* Family Plan */}
                                    <div style={{
                                        background: 'linear-gradient(145deg, rgba(58, 134, 255, 0.1), rgba(157, 78, 221, 0.15))',
                                        border: '1px solid rgba(157, 78, 221, 0.4)',
                                        borderRadius: '20px', padding: '20px', position: 'relative'
                                    }}>
                                        <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Look-UP Family</h3>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>우리 가족 옷장 통합 관리</p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                            <div className="flex-row items-center gap-2"><Sparkles size={14} color="#3a86ff" /><span style={{ fontSize: '13px', fontWeight: 600 }}>가족 프로필 최대 4인 (배우자/자녀)</span></div>
                                            <div className="flex-row items-center gap-2"><Shirt size={14} color="#3a86ff" /><span style={{ fontSize: '13px', fontWeight: 600 }}>가족 간 옷장 공유 및 공용 옷장 지원</span></div>
                                            <div className="flex-row items-center gap-2"><Bot size={14} color="#3a86ff" /><span style={{ fontSize: '13px' }}>Pro의 모든 기능 포함</span></div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>(*5인 이상은 구성원 추가 결제 필요)</span>
                                            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>1인당 월 약 2,200원</span>
                                        </div>
                                        <button
                                            onClick={() => { if (!isLoggedIn) setShowLoginModal(true); }}
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: '12px',
                                                background: 'linear-gradient(90deg, #3a86ff, var(--secondary))',
                                                color: 'white', border: 'none',
                                                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                                                boxShadow: '0 8px 15px rgba(58, 134, 255, 0.3)'
                                            }}
                                        >
                                            월 ₩8,900
                                        </button>
                                    </div>
                                </div>
                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '16px' }}>언제든지 약정 없이 취소할 수 있습니다.</span>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Login / Auth Modal */}
            <AnimatePresence>
                {
                    showLoginModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
                                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 30 }}
                                className="glass-panel"
                                style={{
                                    width: '100%', maxWidth: '400px', padding: '40px 32px', borderRadius: '32px',
                                    display: 'flex', flexDirection: 'column', textAlign: 'center',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer' }} onClick={() => setShowLoginModal(false)}>
                                    <X size={24} color="rgba(255,255,255,0.5)" />
                                </div>

                                <div style={{
                                    width: '70px', height: '70px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                    margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Bot size={36} color="white" />
                                </div>

                                <h2 className="outfit" style={{ fontSize: '26px', fontWeight: 800, marginBottom: '12px', color: 'white' }}>환영합니다!</h2>
                                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '24px' }}>
                                    로그인하시면 3D 스캔 데이터와<br />맞춤 코디 히스토리 및 구독 정보를<br />안전하게 관리할 수 있습니다.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="email"
                                            placeholder="이메일 주소"
                                            style={{
                                                width: '100%', padding: '14px 16px', borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'white', fontSize: '14px', outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="password"
                                            placeholder="비밀번호"
                                            style={{
                                                width: '100%', padding: '14px 16px', borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'white', fontSize: '14px', outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsLoggedIn(true);
                                            setShowLoginModal(false);
                                        }}
                                        className="primary-button"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700 }}
                                    >
                                        로그인
                                    </button>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>회원가입</span>
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>비밀번호 찾기</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px' }}>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>간편 로그인</span>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <button
                                        onClick={() => {
                                            setIsLoggedIn(true);
                                            setShowLoginModal(false);
                                            alert("성공적으로 로그인되었습니다!");
                                        }}
                                        className="primary-button"
                                        style={{ width: '100%', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
                                    >
                                        <img src="https://www.google.com/favicon.ico" style={{ width: '18px', filter: 'brightness(0) invert(1)' }} alt="" />
                                        Google로 시작하기
                                    </button>

                                    <button
                                        onClick={() => {
                                            setIsLoggedIn(true);
                                            setShowLoginModal(false);
                                        }}
                                        style={{
                                            width: '100%', padding: '16px', borderRadius: '16px', background: '#FEE500', color: '#191919',
                                            fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                                        }}
                                    >
                                        💬 카카오로 시작하기
                                    </button>



                                    <button
                                        style={{
                                            width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)',
                                            color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                                        }}
                                        onClick={() => setShowLoginModal(false)}
                                    >
                                        나중에 하기 (게스트 모드)
                                    </button>
                                </div>

                                <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                    가입 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
                                </p>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </motion.div>
    );
}
