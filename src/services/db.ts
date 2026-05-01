import { db, serverTimestamp, storage } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';


export interface UserProfile {
    uid: string;
    email: string | null;
    name: string | null;
    photoURL?: string | null;
    provider?: string;
    createdAt?: string;
    updatedAt?: string;
    isGuest?: boolean;
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
    personalColorResult?: any;
}

export interface WardrobeItem {
    id?: string;
    userId: string;
    imageUrl: string;
    category: string; // 'top', 'bottom', 'outer', 'shoes', 'acc'
    subcategory?: string; // 'T-shirt', 'Jeans', etc.
    season?: string[]; // ['Spring', 'Summer']
    brand?: string;
    size?: string;
    color?: string;
    materials?: string[]; // ['Cotton 100%'], ['Wool 50%', 'Polyester 50%'] 등
    fit?: string; // 'Slim', 'Regular', 'Oversized', etc.
    texture?: string[]; // ['Patterned', 'Knit', 'Denim'] 등
    careSymbols?: string[]; // ['handwash', 'no-bleach', 'dryclean'] 등
    laundryGuide?: string; // AI 세탁 조언
    createdAt: Date;
}

export interface WearingHistory {
    id: string;
    userId: string;
    items: string[]; // Wardrobe item IDs
    wornAt: Date;
    title?: string;
    subtitle?: string;
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

// 이미지 업로드 (Firebase Storage)
export async function uploadImage(userId: string, dataUrl: string, folder: string = 'wardrobe'): Promise<string> {
    if (!dataUrl.startsWith('data:')) {
        return dataUrl; // 이미 URL이면 그대로 반환
    }

    try {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, `${userId}/${folder}/${fileName}`);
        
        // base64 부분만 추출
        const base64Content = dataUrl.split(',')[1];
        
        console.log(`[Storage] 이미지 업로드 시작... (${folder})`);
        const uploadResult = await uploadString(storageRef, base64Content, 'base64', {
            contentType: 'image/jpeg'
        });
        
        const downloadURL = await getDownloadURL(uploadResult.ref);
        console.log("[Storage] 업로드 완료 및 URL 획득:", downloadURL);
        return downloadURL;
    } catch (e) {
        console.error("이미지 업로드 실패:", e);
        return dataUrl; // 실패 시 우선 base64 유지 (비권장하지만 일단 동작 보장)
    }
}

// 스캔된 옷 정보 (내 옷장) 저장 - [낙관적 업데이트 & 로컬 백업 적용]
export async function addWardrobeItem(item: Omit<WardrobeItem, 'id' | 'createdAt'>) {
    const customId = `wardrobe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 0. 이미지 업로드 (만약 base64라면)
    let imageUrl = item.imageUrl;
    if (imageUrl.startsWith('data:')) {
        imageUrl = await uploadImage(item.userId, imageUrl);
    }

    const newItem: WardrobeItem = {
        ...item,
        imageUrl,
        id: customId,
        createdAt: new Date(),
    };

    // 1. 로컬 스토리지 선반영 (Optimistic)
    try {
        const localWardrobe = JSON.parse(localStorage.getItem('local_wardrobe') || '[]');
        localWardrobe.unshift(newItem); // 최신순
        localStorage.setItem('local_wardrobe', JSON.stringify(localWardrobe.slice(0, 100)));
    } catch (e) {
        console.warn("로컬 옷장 저장 실패:", e);
    }

    // 2. Firestore 저장 시도
    try {
        const docRef = doc(db, 'wardrobes', customId);
        await setDoc(docRef, {
            ...item,
            imageUrl,
            id: customId,
            createdAt: serverTimestamp()
        });
        console.log("Firestore 옷 저장 완료:", customId);
        return customId;
    } catch (e) {
        console.error("Firestore 옷 저장 지연/실패 (로컬에만 유지):", e);
        return customId;
    }
}

// 내 옷장에서 아이템 불러오기 - [로컬 + 서버 데이터 병합]
export async function getWardrobeItems(userId: string): Promise<WardrobeItem[]> {
    let combinedItems: WardrobeItem[] = [];

    // 1. 먼저 로컬 데이터 로드
    try {
        const local = JSON.parse(localStorage.getItem('local_wardrobe') || '[]');
        combinedItems = local.map((item: any) => ({
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
        }));
    } catch (e) {
        console.error("로컬 옷장 로드 실패:", e);
    }

    // 2. Firestore 데이터 가져오기
    try {
        const q = query(
            collection(db, 'wardrobes'), 
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshots = await getDocs(q);
        const serverItems = snapshots.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
            } as WardrobeItem;
        });

        // 3. 중복 제거 (서버 데이터 우선)
        const serverIds = new Set(serverItems.map(i => i.id));
        const filteredLocal = combinedItems.filter(i => !serverIds.has(i.id));
        combinedItems = [...serverItems, ...filteredLocal];

        // 4. 로컬 저장소 최신화 (메모리 정돈)
        localStorage.setItem('local_wardrobe', JSON.stringify(combinedItems.slice(0, 100)));
    } catch (e) {
        console.error("Firestore 옷장 로드 실패 (로컬 데이터만 반환):", e);
    }

    return combinedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// [코다리 제안] 옷장 개수 확인 (구독 모델 준비 - 30벌 제한)
export async function getWardrobeItemCount(userId: string): Promise<number> {
    try {
        const q = query(collection(db, 'wardrobes'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (e) {
        console.error("옷장 개수 조회 실패:", e);
        return 0;
    }
}

// 아이템 삭제
export async function deleteWardrobeItem(itemId: string, imageUrl?: string) {
    // 1. 로컬 스토리지 삭제
    try {
        const local = JSON.parse(localStorage.getItem('local_wardrobe') || '[]');
        const updated = local.filter((i: any) => i.id !== itemId);
        localStorage.setItem('local_wardrobe', JSON.stringify(updated));
    } catch (e) {
        console.warn("로컬 삭제 실패:", e);
    }

    // 2. Firestore 삭제
    try {
        await deleteDoc(doc(db, 'wardrobes', itemId));
    } catch (e) {
        console.error("Firestore 삭제 실패:", e);
        throw e;
    }

    // 3. Storage 이미지 삭제 (옵션: URL이 Firebase Storage인 경우만)
    if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
        try {
            // URL에서 경로 추출 시도
            const decodedUrl = decodeURIComponent(imageUrl);
            const pathStart = decodedUrl.indexOf('/o/') + 3;
            const pathEnd = decodedUrl.indexOf('?');
            const fullPath = decodedUrl.substring(pathStart, pathEnd);
            
            const imageRef = ref(storage, fullPath);
            await deleteObject(imageRef);
            console.log("Storage 이미지 삭제 완료");
        } catch (e) {
            console.warn("Storage 이미지 삭제 실패 (이미 삭제되었거나 경로 오류):", e);
        }
    }
}

// 오늘 입은 옷 기록 저장
export async function saveWearingHistory(history: Omit<WearingHistory, 'id' | 'wornAt'>) {
    const customId = `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newData: WearingHistory = {
        ...history,
        id: customId,
        wornAt: new Date(), // 로컬 저장용 Date 객체
    };

    // 1. 로컬 스토리지에 즉시 백업
    try {
        const localHistory = JSON.parse(localStorage.getItem('local_wearing_history') || '[]');
        localHistory.push(newData);
        // 최근 50개만 유지
        if (localHistory.length > 50) localHistory.shift();
        localStorage.setItem('local_wearing_history', JSON.stringify(localHistory));
    } catch (e) {
        console.error("로컬 저장 실패:", e);
    }

    // 2. Firestore 저장 시도
    try {
        const docRef = doc(db, 'wearing_history', customId);
        await setDoc(docRef, {
            ...history,
            id: customId,
            wornAt: serverTimestamp()
        });
        console.log("Firestore 저장 완료:", customId);
        return customId;
    } catch (e: any) {
        console.error("Firestore 저장 지연/실패 (로컬 데이터로 대체):", e);
        return customId; 
    }
}

// 오늘 입은 옷 기록 불러오기
export async function getWearingHistory(userId: string): Promise<WearingHistory[]> {
    let combinedHistory: WearingHistory[] = [];

    // 1. 로컬 데이터 가져오기 (날짜 객체 복원 및 중복 방지를 위한 정리)
    try {
        const local = JSON.parse(localStorage.getItem('local_wearing_history') || '[]');
        combinedHistory = local.map((item: any) => ({
            ...item,
            wornAt: item.wornAt ? new Date(item.wornAt) : new Date()
        }));
    } catch (e) {
        console.error("로컬 로드 실패:", e);
    }

    // 2. Firestore 데이터 가져오기
    try {
        const q = query(
            collection(db, 'wearing_history'), 
            where('userId', '==', userId),
            orderBy('wornAt', 'desc')
        );
        const snapshots = await getDocs(q);
        const serverHistory = snapshots.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                userId: data.userId,
                items: data.items || [],
                title: data.title,
                subtitle: data.subtitle,
                wornAt: data.wornAt instanceof Timestamp ? data.wornAt.toDate() : new Date(data.wornAt || Date.now())
            } as WearingHistory;
        });

        // 3. ID 중복 제거 후 합치기
        const localIds = new Set(combinedHistory.map(h => h.id));
        serverHistory.forEach(h => {
            if (!localIds.has(h.id)) {
                combinedHistory.push(h);
            }
        });
    } catch (e) {
        console.error("Firestore 로드 실패 (로컬 데이터만 반환):", e);
    }
    
    // 전체를 다시 시간순으로 정렬
    return combinedHistory.sort((a, b) => b.wornAt.getTime() - a.wornAt.getTime());
}
