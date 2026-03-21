import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email: string | null;
    name: string | null;
    measurements?: {
        height: number;
        shoulder: number;
        chest: number;
        armLength: number;
        waist: number;
        hip: number;
        legLength: number;
    };
    personalColor?: string;
}

export interface WardrobeItem {
    id?: string;
    userId: string;
    imageUrl: string;
    category: string; // 'top', 'bottom', 'outer', 'shoes'
    brand?: string;
    size?: string;
    color?: string;
    createdAt: Date;
}

// 사용자 프로필 및 스캔 결과 저장
export async function saveUserProfile(userId: string, data: Partial<UserProfile>) {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, data, { merge: true });
        console.log("프로필 저장 완료!");
    } catch (e) {
        console.error("프로필 저장 실패:", e);
    }
}

// 사용자 프로필 불러오기
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
        const userRef = doc(db, 'users', userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            return snapshot.data() as UserProfile;
        }
        return null;
    } catch (e) {
        console.error("프로필 로드 실패:", e);
        return null;
    }
}

// 스캔된 옷 정보 (내 옷장) 저장
export async function addWardrobeItem(item: Omit<WardrobeItem, 'id' | 'createdAt'>) {
    try {
        const docRef = await addDoc(collection(db, 'wardrobes'), {
            ...item,
            createdAt: new Date()
        });
        return docRef.id;
    } catch (e) {
        console.error("옷 저장 실패:", e);
        return null;
    }
}

// 내 옷장에서 아이템 불러오기
export async function getWardrobeItems(userId: string): Promise<WardrobeItem[]> {
    try {
        const q = query(collection(db, 'wardrobes'), where('userId', '==', userId));
        const snapshots = await getDocs(q);
        return snapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }) as WardrobeItem);
    } catch (e) {
        console.error("옷장 로드 실패:", e);
        return [];
    }
}
