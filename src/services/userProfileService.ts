/**
 * userProfileService.ts
 *
 * Quản lý thông tin profile người dùng (FactoryInfo + defaultNotes).
 * Chiến lược: Google Apps Script = source of truth, LocalStorage = offline cache theo uid.
 *
 * Luồng đọc:  Login → fetchProfile(uid) → ghi LocalStorage → render UI
 * Luồng ghi:  User edit → ghi LocalStorage ngay → debounce 1.5s → ghi Cloud
 * Luồng fallback: Mạng lỗi → đọc LocalStorage cache (offline-friendly)
 */

// Không dùng Firestore nữa, dùng Google Apps Script
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzoaJPV-pJctzp4m2b-PXplYkWtsmT-xKPq_JFhfjrsjG04kPqpQNDFKFjYKi_kUNVQQw/exec'

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

/**
 * Tải profile từ Google Sheet qua Apps Script.
 */
export async function fetchProfileFromCloud(uid: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getProfile&uid=${uid}`)
    const json = await res.json()
    if (json.success && json.data) {
      return json.data as UserProfile
    }
    return null
  } catch {
    return null
  }
}

/**
 * Lưu profile lên Google Sheet qua Apps Script.
 */
export async function saveProfileToCloudEndpoint(uid: string, profile: UserProfile, email: string = ''): Promise<void> {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // Dùng text/plain để tránh lỗi CORS Preflight trên trình duyệt
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveProfile',
        uid,
        email,
        profile
      })
    })
  } catch (e) {
    console.error('Lỗi lưu Google Sheet:', e)
  }
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Tải profile khi user đăng nhập.
 * Ưu tiên: Cloud → ghi cache → trả về.
 * Fallback: LocalStorage cache nếu Cloud không trả về kịp hoặc lỗi.
 * Nếu cả hai đều null (lần đầu dùng) → trả về default values.
 */
export async function loadUserProfile(uid: string): Promise<UserProfile> {
  try {
    const remote = await fetchProfileFromCloud(uid)
    if (remote) {
      writeProfileCache(uid, remote)
      return remote
    }
    // Chưa có document (lần đầu login) — check cache rồi dùng default
    const cached = readProfileCache(uid)
    return cached ?? { factoryInfo: DEFAULT_FACTORY_INFO, defaultNotes: DEFAULT_NOTES }
  } catch {
    // Mất mạng hoặc lỗi — fallback sang cache
    const cached = readProfileCache(uid)
    return cached ?? { factoryInfo: DEFAULT_FACTORY_INFO, defaultNotes: DEFAULT_NOTES }
  }
}

/**
 * Lưu profile lên Cloud (Google Sheet).
 * Thường được gọi qua debounce timer.
 */
export async function saveProfileToCloud(uid: string, profile: UserProfile, email: string = ''): Promise<void> {
  await saveProfileToCloudEndpoint(uid, profile, email)
}

/**
 * Lưu profile (cả Cloud lẫn cache).
 * Ghi LocalStorage ngay, ghi Cloud bất đồng bộ.
 */
export async function saveUserProfile(uid: string, profile: UserProfile, email: string = ''): Promise<void> {
  writeProfileCache(uid, profile) // Ghi cache ngay — UX không chờ mạng
  await saveProfileToCloudEndpoint(uid, profile, email) // Ghi cloud
}
