# Look-UP 🚀

Look-UP은 AI 기반의 프리미엄 스마트 옷장 및 스타일 추천 애플리케이션입니다. 
당신의 옷장을 디지털화하고, 인공지능을 통해 날씨와 TPO(시간, 장소, 상황)에 맞는 최적의 스타일링을 제안합니다.

## ✨ 주요 기능 (Core Features)

- **AI 피팅룸 (Fitting Room)**: 가상 피팅 및 스마트 거울 기능을 제공하는 핵심 공간. 글래스모피즘(Glassmorphism)과 생체 인식 패널, HUD 오버레이 등 프리미엄 사이버펑크 감성의 UI 적용.
- **스마트 옷장 (Wardrobe)**: 등록된 의류 아이템들을 카테고리별로 관리하고 확인할 수 있는 공간.
- **OCR 스캔 (OCR Scan)**: 의류의 케어 라벨을 스캔하여 세탁 방법 및 재질 정보를 자동으로 추출하는 기능.
- **AI 스타일 추천 (AI Recommendation)**: 날씨 정보와 사용자의 옷장 데이터를 분석하여 최적의 코디를 제안하는 인공지능 어시스턴트.
- **소셜 로그인 (Social Auth)**: Google 및 Apple 계정을 활용한 안전하고 빠른 간편 로그인 지원 (Firebase Auth 연동).

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, Lucide React (Icons), Framer Motion (Animations)

### Cross-Platform & Native
- **Framework**: Ionic Framework
- **Native Runtime**: Capacitor (iOS & Android 지원)
- **Plugins**: `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/storage`, `@capacitor-community/apple-sign-in` 등

### Backend / BaaS
- **Firebase**: Authentication, Firestore Database

## 📂 프로젝트 구조 (Directory Structure)

```text
lookup-app/
├── android/            # Android 네이티브 프로젝트 폴더
├── ios/                # iOS 네이티브 프로젝트 폴더
├── public/             # 정적 리소스 (로고, 폰트, 아이콘 등)
├── src/
│   ├── components/     # 재사용 가능한 UI 컴포넌트 (ActionBar, AIAssistant 등)
│   ├── lib/            # 유틸리티 및 설정 파일 (authUtils.ts 등)
│   ├── pages/          # 애플리케이션의 각 화면 (Splash, FittingRoom, Wardrobe, OCRScan 등)
│   └── services/       # 비즈니스 로직 및 외부 API 연동 (ai, laundry, recommendation, weather 등)
├── capacitor.config.ts # Capacitor 설정 파일
├── tailwind.config.js  # Tailwind CSS 설정 파일
└── vite.config.ts      # Vite 빌드 설정 파일
```

## 🚀 시작하기 (Getting Started)

### 사전 요구사항
- Node.js (v18 이상 권장)
- npm 또는 yarn
- iOS 빌드를 위한 Xcode (Mac 전용)
- Android 빌드를 위한 Android Studio

### 설치 및 실행

1. 의존성 설치
```bash
npm install
```

2. 로컬 개발 서버 실행
```bash
npm run dev
```

3. 모바일 네이티브 빌드 준비 및 동기화
```bash
npm run build
npx cap sync
```

4. iOS 프로젝트 열기
```bash
npx cap open ios
```

## 📝 개발 이력 및 주요 업데이트
- **2026.04**: GitHub 리포지토리 초기화 및 연동 (`wowpark18/lookup-app`)
- **2026.04**: Fitting Room 및 OCR Scan 화면 프리미엄 UI(AI Vision Studio 컨셉) 리디자인 적용
- **2026.04**: iOS 환경 카메라 접근 권한 및 HTTPS 로컬 호스팅 이슈 해결
- **2026.04**: Firebase 연동 및 멀티 플랫폼 소셜 로그인(Google, Apple) 구현
