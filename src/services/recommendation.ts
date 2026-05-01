import { getWardrobeItems, getUserProfile } from './db';
import type { WeatherData } from './weather';
import { generateStyleConcepts } from './ai';

export interface OutfitRecommendation {
    id: number;
    title: string;
    subtitle: string;
    tags: string[];
    img: string;
    bg: string;
    source: 'wardrobe' | 'trend';
    aiMessage?: string;
    items?: string[];
}

// ─── 고퀄리티 패션 이미지 풀 (Unsplash 기반) ──────────────────────────────
const FASHION_IMAGES = [
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520367288098-2794e632db99?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1617137968427-83939b4421c1?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=800&auto=format&fit=crop",
];

// ─── 날씨 상태 분류 ───────────────────────────────────────────────────────

// ─── 메인 추천 함수: 정교한 AI 엔진 ───────────────────────────────────────
export async function getAIRecommendations(
    userId: string,
    weather: WeatherData | null,
    schedule: string = '일상/휴식'
): Promise<OutfitRecommendation[]> {

    const weatherInfo = weather ? `${weather.description}, 기온 ${weather.temp}도` : "선선한 봄 날씨";
    const [wardrobeItems, profile] = await Promise.all([
        getWardrobeItems(userId).catch(() => []),
        getUserProfile(userId).catch(() => null)
    ]);

    const personalColor = profile?.personalColor || "미설정";
    const contextInfo = `날씨: ${weatherInfo}, 오늘 일정/TPO: ${schedule}`;
    
    try {
        // [Refined Step] AI에게 3가지 컨셉 제안 요청 (퍼스널 컬러 및 일정 포함)
        const concepts = await generateStyleConcepts(contextInfo, wardrobeItems, personalColor);
        
        if (concepts && Array.isArray(concepts) && concepts.length >= 3) {
            return concepts.slice(0, 3).map((c, idx) => ({
                id: Date.now() + idx,
                title: c.title,
                subtitle: c.subtitle,
                tags: c.tags,
                img: FASHION_IMAGES[idx % FASHION_IMAGES.length],
                bg: idx === 0 ? "from-[#fdfcfb] to-[#e2d1c3]" : idx === 1 ? "from-[#f5f7fa] to-[#c3cfe2]" : "from-[#e6e9f0] to-[#eef1f5]",
                source: wardrobeItems.length > 0 ? 'wardrobe' : 'trend',
                aiMessage: c.advice
            }));
        }
    } catch (e) {
        console.warn("AI 컨셉 생성 실패, 기본 추천으로 전환:", e);
    }

    // Fallback: 기존 정적 로직
    return [
        {
            id: 1,
            title: "TREND PICK",
            subtitle: "내 옷장이 비어있어요. 이 스타일은 어떠세요?",
            tags: ["린넨 실루엣", "시티보이 룩", "웨어러블"],
            img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop",
            bg: "from-[#fdfcfb] to-[#e2d1c3]",
            source: 'trend',
            aiMessage: "내 옷을 등록하면 개인 맞춤 코디 조언이 제공됩니다! 반짝~🧚‍♀️✨"
        },
        {
            id: 2,
            title: "URBAN CASUAL",
            subtitle: "STYLE EXPANSION · 봄·가을 베스트 컨셉",
            tags: ["오버사이즈 블레이저", "화이트 티셔츠", "스트레이트 진"],
            img: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800&auto=format&fit=crop",
            bg: "from-[#f5f7fa] to-[#c3cfe2]",
            source: 'trend',
            aiMessage: "완벽한 외출 날씨입니다! 가볍게 레이어드 하기 좋은 시즌이에요. 반짝~🧚‍♀️✨"
        },
        {
            id: 3,
            title: "MISSING PIECE",
            subtitle: "SHOP THE LOOK · 실버 포인트 시계",
            tags: ["Silver Watch", "Add to wishlist", "Premium"],
            img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
            bg: "from-[#e6e9f0] to-[#eef1f5]",
            source: 'trend',
            aiMessage: "스타일의 완성은 액세서리입니다! 실버 톤으로 포인트를 주세요. 반짝~🧚‍♀️✨"
        }
    ];
}
