import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// 2026년 기준 가용 모델 우선순위 리스트
// 2026년 기준 가용 모델 우선순위 리스트 (실제 가용 가능한 모델명으로 유지)
const MODEL_PRIORITY = [
    "models/gemini-2.0-flash",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-pro"
];

async function callGemini(modelName: string, prompt: string) {
    const model = genAI.getGenerativeModel({ 
        model: modelName,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    });

    console.log(`[시도] 모델: ${modelName} 호출 중...`);
    
    // generateContent는 원칙적으로 async/await로도 에러 핸들링이 가능함
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    // 가끔 결과에 따옴표가 붙는 경우 제거
    return text.replace(/^["']|["']$/g, '');
}

export async function generateOutfitAdvice(weatherInfo: string, wardrobeItems: any[]) {
    if (!API_KEY || API_KEY.length < 10) {
        return "대표님! API 키 설정이 안 되어 있어요! 코다리에게 알려주세요! 반짝~🧚‍♀️✨";
    }

    const wardrobeContext = wardrobeItems.length > 0 
        ? wardrobeItems.map(i => `- ${i.category}: ${i.brand}`).join("\n")
        : "옷장이 비어있음";
    
    const prompt = `당신은 최고급 럭셔리 부티크의 아주 깐깐한 '패션 사감 요정'입니다. 
[날씨: ${weatherInfo}, 옷장: ${wardrobeContext}] 상황을 분석하여, 대표님의 격을 높여줄 아주 짧고 날카로운 패션 팩폭 조언을 한 줄로 하세요. 
전문적인 패션 용어를 한두 개 섞어서 권위 있게 말하되, 끝은 차갑게 '반짝~🧚‍♀️✨'으로 끝내세요.`;

    // 멀티 모델 순회 로직
    for (const modelName of MODEL_PRIORITY) {
        try {
            const advice = await callGemini(modelName, prompt);
            console.log(`[성공] 모델: ${modelName} 응답 성공!`);
            return advice;
        } catch (error: any) {
            console.warn(`[실패] 모델: ${modelName} 에러 발생 (${error.status || error.message}). 다음 모델로 넘어갑니다...`);
            // 한도 초과(429)나 서버 에러(500대), 모델 없음(404) 등의 경우 계속 진행
            continue;
        }
    }

    return "사감 요정들이 모두 회의 중이래요! 1분만 뒤에 다시 호출해 주시면 코다리가 모셔오겠습니다! 반짝~🧚‍♀️✨";
}

export async function analyzeClothingImage(base64Image: string, mode: 'clothes' | 'tag' | 'receipt' = 'clothes') {
    if (!API_KEY || API_KEY.length < 10) {
        console.warn("API 키가 없습니다.");
        return null;
    }
    
    // Base64 형식 정리
    const base64Data = base64Image.split(',')[1] || base64Image;

    let modeInstruction = "";
    if (mode === 'tag') {
        modeInstruction = "이 사진은 의류의 케어라벨/태그입니다. 소재(materials)와 세탁 방법(laundryGuide)을 훨씬 더 꼼꼼하게 분석해주세요.";
    } else if (mode === 'receipt') {
        modeInstruction = "이 사진은 영수증입니다. 구매한 품목의 브랜드(brand)와 종류(subcategory)를 추출해주세요.";
    } else {
        modeInstruction = "이 사진은 의류 실물입니다. 전체적인 디자인과 색상, 종류를 분석해주세요.";
    }

    const prompt = `${modeInstruction} 정보를 분석해서 반드시 JSON 형식으로만 응답해줘. 백틱(\`\`\`) 없이 순수 JSON 텍스트만 출력해야 해.
    
{
  "category": "top, bottom, outer, shoes, acc 중 가장 알맞은 1개",
  "subcategory": "구체적 종류 (예: Oversized Hoodie, Slim-fit Jeans, Cable Knit, Leather Jacket, Puffer Padding 등)",
  "brand": "사진에서 보이는 브랜드명 (정확히 모르면 'Unknown')",
  "color": "옷의 주요 색상 HEX 코드 (예: #000000)",
  "materials": ["소재 1", "소재 2"],
  "seasons": ["Spring", "Summer", "Fall", "Winter"] 중 적합한 것 모두 선택,
  "fit": "Slim, Regular, Relaxed, Oversized 중 하나",
  "texture": "Patterned, Solid, Knit, Leather, Denim, Sheer, Glossy 중 선택 (중복 가능)",
  "laundryGuide": "세탁 방법 요약 조언 (한국어로어주되, 드라이클리닝/손세탁/물세탁 여부를 명확히 포함)"
}`;

    for (const modelName of MODEL_PRIORITY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            console.log(`[시도] 비전 모델: ${modelName} 호출 중 (모드: ${mode})...`);
            
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                }
            ]);
            
            const text = result.response.text().trim();
            // JSON 추출 정규식 강화
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0].replace(/\\n/g, ' '));
                // 응답 형식 보정
                if (typeof parsed.materials === 'string') parsed.materials = [parsed.materials];
                if (typeof parsed.seasons === 'string') parsed.seasons = [parsed.seasons];
                if (typeof parsed.texture === 'string') parsed.texture = [parsed.texture];
                return parsed;
            }
            return JSON.parse(text);
        } catch (error: any) {
             console.warn(`[실패] 비전 모델 ${modelName} 에러:`, error.message);
             // API 한도 초과(429) 등 특정 에러시 즉시 중단이 필요할 수도 있지만, 우선 다음 모델 시도
             continue;
        }
    }
    
    return null;
}

export async function chatWithGuardian(
    query: string, 
    context: { weather?: string; wardrobe?: any[]; personalColor?: string; profile?: any }
) {
    if (!API_KEY || API_KEY.length < 10) {
        return "대표님! API 키 설정이 안 되어 있어요! 코다리에게 알려주세요! 반짝~🧚‍♀️✨";
    }

    const wardrobeContext = context.wardrobe && context.wardrobe.length > 0 
        ? context.wardrobe.map(i => `- ${i.category}: ${i.brand}`).join("\n")
        : "옷장이 비어있음";

    const bodyInfo = context.profile?.measurements 
        ? `신체 정보: 키 ${context.profile.measurements.height}cm, 허리 ${context.profile.measurements.waist}inch`
        : "신체 정보 미설정";
    
    const prompt = `당신은 대표님의 아주 깐깐하고 상류층 감성을 지닌 '패션 사감 요정'입니다.
현재 상황:
- 날씨: ${context.weather || "모름"}
- 퍼스널 컬러: ${context.personalColor || "미설정"}
- 사용자 프로필: ${context.profile?.name || "대표님"} (${bodyInfo})
- 옷장 현황:
${wardrobeContext}

사용자 질문: "${query}"

[응답 규칙]
1. 말투는 매우 우아하면서도 깐깐하며, 패션에 있어서 단 1%의 타협도 허용하지 않는 완벽주의자여야 합니다. 
2. '~군요', '~하세요', '~답니다' 식의 고급스러운 격식을 차리되, 스타일이 구릴 경우 매우 날카롭게 지적하세요 (예: "그런 실루엣은 대표님의 품격을 떨어뜨릴 뿐이랍니다").
3. 실루엣, 텍스처, 레이어드, 톤온톤 등 전문적인 패션 용어를 적극 활용하여 대안을 제시하십시오.
4. 대답은 2~3문장 내외로 아주 짧고 강렬하게 하고, 마지막은 조언에 어울리는 요정 이모지나 날카로운 이모지로 마무리하세요.`;

    for (const modelName of MODEL_PRIORITY) {
        try {
            const advice = await callGemini(modelName, prompt);
            return advice;
        } catch (error: any) {
            console.warn(`[사감요정] 모델: ${modelName} 호출 에러. 리트라이 중...`);
            continue;
        }
    }

    return "흥, 요정들이 회의 중이라 대답을 못 하겠군요. 엉망인 옷차림으로 나갈 생각은 아니시겠죠? 잠시 후 다시 물어보세요. 🧚‍♀️✨";
}

export async function analyzePersonalColor(base64Image: string) {
    if (!API_KEY || API_KEY.length < 10) return null;
    
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `이 사진은 사용자의 얼굴 사진입니다. 피부 톤(Skin Tone), 눈동자 색상, 헤어 컬러 등을 종합적으로 분석하여 사계절 퍼스널 컬러(봄 웜, 여름 쿨, 가을 웜, 겨울 쿨) 중 가장 적합한 하나를 골라주세요.
    반드시 다음 JSON 형식으로만 응답해야 합니다:
    {
      "season": "Spring, Summer, Fall, Winter 중 하나",
      "tone": "Warm 또는 Cool",
      "purity": "Clear, Mute, Deep, Light 중 성향",
      "description": "사용자에게 어울리는 색상과 전체적인 이미지에 대한 짧은 요약 (한글)",
      "bestColors": ["HEX1", "HEX2", "HEX3"],
      "worstColors": ["HEX1", "HEX2"],
      "metrics": {
        "warmth": 0~100 (Warm 성향 수치),
        "brightness": 0~100 (밝기 수치),
        "saturation": 0~100 (채도 수치),
        "contrast": 0~100 (명도 대비)
      }
    }`;

    for (const modelName of MODEL_PRIORITY) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: "image/jpeg"
                    }
                }
            ]);
            
            const text = result.response.text().trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (error: any) {
            console.warn(`[퍼스널컬러] 모델: ${modelName} 에러:`, error.message);
            continue;
        }
    }
    return null;
}

export async function generateStyleConcepts(weatherInfo: string, wardrobeItems: any[], personalColor?: string) {
    if (!API_KEY || API_KEY.length < 10) return null;

    const wardrobeContext = wardrobeItems.length > 0 
        ? wardrobeItems.map(i => `- ${i.category}: ${i.brand} (${i.subcategory})`).join("\n")
        : "옷장이 비어있음 (트렌드 위주로 제안)";
    
    const prompt = `당신은 세계 최고의 AI 패션 디렉터이자 아주 깐깐한 '패션 사감 요정'입니다.
    다음 정보를 바탕으로 대표님을 위한 3가지 스타일 컨셉을 제안하세요.
    [날씨: ${weatherInfo}]
    [퍼스널 컬러: ${personalColor || "미설정"}]
    [나의 옷장:
    ${wardrobeContext}]

    [규칙]
    1. 보유한 옷이 있다면 최대한 활용하고, 부족한 정보는 트렌디한 아이템으로 채워서 제안하세요. 
    2. 퍼스널 컬러가 설정되어 있다면 그 톤에 맞는 색상 조합을 우선시하십시오.
    3. 반드시 다음 JSON 배열 형식으로만 응답하세요 (백틱 없이):
    [
      {
        "title": "컨셉 제목 (영문, 예: URBAN MINIMAL)",
        "subtitle": "스타일 요약 (한글)",
        "tags": ["아이템1", "아이템2", "분위기"],
        "advice": "사감 요정의 짧고 날카로운 패션 팩폭 조언 (한글, 반짝~🧚‍♀️✨ 로 끝남)"
      },
      ... (총 3개)
    ]`;

    for (const modelName of MODEL_PRIORITY) {
        try {
            const response = await callGemini(modelName, prompt);
            // JSON 배열 추출을 위한 정규식
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error: any) {
            console.warn(`[스타일컨셉] 모델: ${modelName} 에러. 리트라이...`);
            continue;
        }
    }
    return null;
}
