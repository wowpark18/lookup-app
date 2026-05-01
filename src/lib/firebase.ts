import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  serverTimestamp, 
  initializeFirestore 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy"
};

// Initialize Firebase (싱글톤 보장)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Firestore 설정 (Capacitor/iOS 안정성 확보를 위해 Long Polling 강제 적용)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  // @ts-ignore - useFetchStreams might not be in newer types but is still relevant for some environments
  useFetchStreams: false
});

// 통신 최적화는 별도의 설정을 권장하지만, Hanging 방지를 위해 기본 연결성을 테스트합니다.
// 만약 여전히 문제가 있다면 롱폴링 설정을 다시 검토하겠습니다.

export const storage = getStorage(app);
export { serverTimestamp };
