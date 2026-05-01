/**
 * userProfileService.ts
 *
 * Quản lý thông tin profile người dùng (FactoryInfo + defaultNotes).
 * Chiến lược: Firestore = source of truth, LocalStorage = offline cache theo uid.
 *
 * Luồng đọc:  Login → fetchProfile(uid) → ghi LocalStorage → render UI
 * Luồng ghi:  User edit → ghi LocalStorage ngay → debounce 1.5s → ghi Firestore
 * Luồng fallback: Firestore lỗi → đọc LocalStorage cache (offline-friendly)
 */

import { db } from '@/firebase/firebaseConfig'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FactoryInfo {
  name: string
  address: string
  hotline: string
  email: string
  pageTitle: string
}

export interface UserProfile {
  factoryInfo: FactoryInfo
  defaultNotes: string[]
  updatedAt?: string
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_FACTORY_INFO: FactoryInfo = {
  name: 'XƯỞNG SX - NỘI THẤT - THÂN THIỆN',
  address: 'Địa chỉ: Khu B4, Phường Đông Xuyên',
  hotline: 'Hotline: 0918306813 - 0988288701',
  email: 'Email: vitinhlx@gmail.com',
  pageTitle: 'BÁO GIÁ THI CÔNG NỘI THẤT',
}

export const DEFAULT_NOTES: string[] = [
  'Sản phẩm gỗ nội thất được bảo hành kỹ thuật 12 tháng (lỗi do kỹ thuật thi công: rơi vỡ, rung lắc,...)',
  'Không bảo hành nước, mối mọt đối với vật liệu gỗ.',
  'Bảng báo giá trên có hiệu lực 30 ngày kể từ ngày báo giá, sẽ có điều chỉnh dựa trên tình hình giá cả vật tư tăng giảm(nếu có). Cảm ơn Quí khách hàng đã tin tưởng và ủng hộ !!!',
  'Thông tin số tài khoản : 0.5555.1368 - Nguyễn Phước Vĩnh Thành - Ngân Hàng : Nam Á Bank',
]

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────

/** Cache key theo uid — tránh lẫn data giữa các user khác nhau */
const cacheKey = (uid: string) => `userProfile_${uid}`

export function readProfileCache(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    if (!raw) return null
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function writeProfileCache(uid: string, profile: UserProfile): void {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(profile))
  } catch {
    // LocalStorage full — silently ignore
  }
}

export function clearProfileCache(uid: string): void {
  localStorage.removeItem(cacheKey(uid))
}

// ─── Firestore CRUD ───────────────────────────────────────────────────────────

const profileDocRef = (uid: string) => doc(db, 'users', uid, 'settings', 'profile')

/**
 * Tải profile từ Firestore.
 * Nếu document chưa tồn tại (lần đầu đăng nhập) → trả về null.
 * Nếu mất mạng / lỗi → throw để caller fallback sang cache.
 */
export async function fetchProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(profileDocRef(uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    factoryInfo: data.factoryInfo ?? DEFAULT_FACTORY_INFO,
    defaultNotes: data.defaultNotes ?? DEFAULT_NOTES,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
  }
}

/**
 * Lưu profile lên Firestore.
 * Dùng merge: true để không ghi đè các fields khác (nếu sau này mở rộng schema).
 */
export async function saveProfileToFirestore(uid: string, profile: UserProfile): Promise<void> {
  await setDoc(
    profileDocRef(uid),
    {
      factoryInfo: profile.factoryInfo,
      defaultNotes: profile.defaultNotes,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Tải profile khi user đăng nhập.
 * Ưu tiên: Firestore → ghi cache → trả về.
 * Fallback: LocalStorage cache nếu Firestore không trả về kịp hoặc lỗi.
 * Nếu cả hai đều null (lần đầu dùng) → trả về default values.
 */
export async function loadUserProfile(uid: string): Promise<UserProfile> {
  try {
    const remote = await fetchProfileFromFirestore(uid)
    if (remote) {
      writeProfileCache(uid, remote)
      return remote
    }
    // Firestore chưa có document (lần đầu login) — check cache rồi dùng default
    const cached = readProfileCache(uid)
    return cached ?? { factoryInfo: DEFAULT_FACTORY_INFO, defaultNotes: DEFAULT_NOTES }
  } catch {
    // Mất mạng hoặc lỗi Firestore — fallback sang cache
    const cached = readProfileCache(uid)
    return cached ?? { factoryInfo: DEFAULT_FACTORY_INFO, defaultNotes: DEFAULT_NOTES }
  }
}

/**
 * Lưu profile lên Firestore (cloud only).
 * Caller phải đã ghi cache (writeProfileCache) trước khi gọi.
 * Thường được gọi qua debounce timer.
 */
export async function saveProfileToCloud(uid: string, profile: UserProfile): Promise<void> {
  await saveProfileToFirestore(uid, profile)
}

/**
 * Lưu profile (cả Firestore lẫn cache).
 * Ghi LocalStorage ngay, ghi Firestore bất đồng bộ.
 */
export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  writeProfileCache(uid, profile) // Ghi cache ngay — UX không chờ mạng
  await saveProfileToFirestore(uid, profile) // Ghi cloud
}
