# NUTRISIGHT - REVIEW KOMPREHENSIF APLIKASI
> React Native · Expo · TypeScript · Appwrite · OpenRouter AI  
> Review Date: 2026-04-02 | Reviewer: Claude Code (AI)

---

## DAFTAR ISI

1. [Executive Summary](#1-executive-summary)
2. [Arsitektur Keseluruhan](#2-arsitektur-keseluruhan)
3. [Stack & Dependencies](#3-stack--dependencies)
4. [Struktur Direktori](#4-struktur-direktori)
5. [Navigation & Routing](#5-navigation--routing)
6. [State Management](#6-state-management)
7. [Sistem Offline-First & Sync](#7-sistem-offline-first--sync)
8. [Autentikasi](#8-autentikasi)
9. [Meal & Nutrition Tracking](#9-meal--nutrition-tracking)
10. [Kamera & Analisis AI](#10-kamera--analisis-ai)
11. [Komponen UI](#11-komponen-ui)
12. [Backend (Appwrite)](#12-backend-appwrite)
13. [Konfigurasi & Environment](#13-konfigurasi--environment)
14. [Kualitas Kode](#14-kualitas-kode)
15. [Bug & Potensi Error](#15-bug--potensi-error)
16. [Keamanan (Security)](#16-keamanan-security)
17. [Performa](#17-performa)
18. [Saran Improvement](#18-saran-improvement)
19. [Checklist Kedepan](#19-checklist-kedepan)

---

## 1. EXECUTIVE SUMMARY

**Nama Aplikasi**: NutriSight  
**Versi**: 1.0.1  
**Kategori**: Food & Nutrition Tracking  
**Platform Target**: Android & iOS  
**Total Kode**: ~76 file TypeScript/TSX | ~12.000+ baris  

### Gambaran Aplikasi

NutriSight adalah aplikasi pelacak nutrisi berbasis React Native yang memungkinkan pengguna:
- Menganalisis kandungan nutrisi makanan via **foto kamera** (AI Vision)
- Memilih makanan dari **katalog menu** digital
- Melihat **statistik nutrisi harian & mingguan**
- Bekerja secara **offline-first** dengan sinkronisasi otomatis ke cloud

### Penilaian Cepat

| Aspek | Nilai | Keterangan |
|---|---|---|
| Arsitektur | ★★★★★ | Offline-first pattern sangat baik |
| Kualitas Kode | ★★★★☆ | TypeScript strict, butuh split beberapa file besar |
| Keamanan | ★★☆☆☆ | API key exposed di config, masalah kritikal |
| Performa | ★★★☆☆ | Baik untuk skala saat ini, butuh optimasi |
| Test Coverage | ★☆☆☆☆ | Tidak ada unit/integration test sama sekali |
| UI/UX | ★★★★☆ | NativeWind rapi, animasi smooth |
| Maintainability | ★★★★☆ | Struktur jelas, beberapa file perlu dipecah |

---

## 2. ARSITEKTUR KESELURUHAN

### Diagram Arsitektur

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│         React Native UI + NativeWind + Reanimated            │
│   Screens / Modals / Components (File-based Expo Router)     │
└──────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌──────────────────────────────────────────────────────────────┐
│                     STATE LAYER                               │
│              React Context API (3 Contexts)                  │
│         AuthContext | MenuContext | CartContext               │
└──────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌──────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                             │
│          authService | mealService | menuService             │
│          cameraAPI | openRouterService | dataManagementAPI   │
└──────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌──────────────────────────────────────────────────────────────┐
│                     SYNC ENGINE                               │
│    SyncManager (strategy pattern) + SyncQueue (persistence)  │
│  authStrategy | mealStrategy | menuStrategy | photoStrategy  │
└──────────────────────────────────────────────────────────────┘
                       ↓             ↓
        ┌──────────────────┐  ┌───────────────────┐
        │   OFFLINE STORE   │  │    ONLINE APIs     │
        │  AsyncStorage     │  │  Appwrite (BaaS)   │
        │  FileSystem       │  │  OpenRouter (AI)   │
        └──────────────────┘  └───────────────────┘
```

### Pola Arsitektur yang Digunakan

| Pattern | Di mana | Tujuan |
|---|---|---|
| **Strategy Pattern** | SyncManager | Abstrak berbagai tipe sync |
| **Factory Pattern** | Service layer | Pilih Online/Offline API |
| **Singleton Pattern** | AppwriteService, SyncQueue | Instance tunggal |
| **Observer Pattern** | NetInfo listener | Deteksi perubahan network |
| **Repository Pattern** | `*OnlineAPI` + `*OfflineAPI` | Abstrak sumber data |
| **Context + Hooks** | AuthContext, CartContext, MenuContext | State management |

### Kekuatan Arsitektur

- Offline-first yang solid — user action tidak pernah di-block oleh koneksi
- Separation of concerns yang jelas antar layer
- Strategy pattern di SyncManager sangat elegant dan extensible
- Context provider nesting terstruktur dengan baik

### Kelemahan Arsitektur

- Tidak ada layer caching khusus (hanya AsyncStorage raw)
- CartContext terlalu "gemuk" — mixing nutrition logic + UI state + API calls
- Tidak ada centralized error handling layer
- SyncQueue tidak punya batas ukuran (bisa overflow memory)

---

## 3. STACK & DEPENDENCIES

### Core Stack

| Teknologi | Versi | Fungsi |
|---|---|---|
| React Native | 0.81.5 | Framework mobile |
| Expo | 54.0.33 | Managed workflow |
| TypeScript | 5.9.2 | Type safety |
| Expo Router | 6.0.23 | File-based navigation |
| NativeWind | 4.2.1 | TailwindCSS untuk RN |
| Appwrite | 22.0.0 | Backend-as-a-Service |
| React | 19.1.0 | UI library |

### Dependencies Penting

**UI & Animasi:**
- `react-native-reanimated` 4.1.1 — animasi native thread
- `react-native-gesture-handler` 2.28.0 — gesture native
- `@shopify/react-native-skia` 2.2.12 — high-perf graphics
- `victory-native` 36.3.1 — chart library
- `expo-linear-gradient` — gradient UI
- `@expo/vector-icons` — icon pack

**Storage & Data:**
- `@react-native-async-storage/async-storage` 2.2.0 — local key-value store
- `expo-file-system` 19.0.21 — file operations

**Camera & Media:**
- `expo-camera` 17.0.10
- `expo-image-picker` 17.0.10
- `expo-image` 3.0.11

**Networking & Device:**
- `@react-native-community/netinfo` 11.4.1 — network state
- `expo-notifications` 0.32.16 — push notif
- `expo-haptics` 15.0.8 — haptic feedback

### Catatan Dependencies

- `@shopify/react-native-skia` + `react-native-worklets` adalah library berat — pastikan benar-benar dipakai untuk justifikasi ukuran app
- `victory-native` sudah cukup berat; pertimbangkan apakah chart yang ada setimpal
- React 19 masih relatif baru, pantau compatibility dengan Expo 54
- `r2Config.ts` ada di config tapi tampaknya tidak digunakan (Cloudflare R2?)

---

## 4. STRUKTUR DIREKTORI

```
app/
├── (auth)/                  ← Auth stack (Stack Navigator)
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
│
├── (tabs)/                  ← Tab Navigator utama
│   ├── _layout.tsx          ← Sync status badge di tab bar
│   ├── index.tsx            ← Home/Dashboard
│   ├── makan.tsx            ← Katalog makanan
│   └── pengaturan.tsx       ← Settings
│
├── components/              ← Reusable UI components
│   ├── SyncStatusComponents.tsx
│   ├── addFoodModal.tsx
│   ├── analysisLoadingOverlay.tsx
│   ├── analysisResultCard.tsx
│   ├── card.tsx
│   ├── customHeader.tsx
│   ├── errorScreen.tsx
│   ├── foodHistoryCard.tsx
│   ├── loadingScreen.tsx
│   ├── searchBox.tsx
│   ├── tabItem.tsx
│   ├── useToast.tsx
│   └── weeklyInsightCard.tsx
│
├── config/                  ← Konfigurasi eksternal
│   ├── appwriteConfig.ts
│   ├── openRouterConfig.ts
│   └── r2Config.ts          ← TIDAK DIGUNAKAN
│
├── contexts/                ← React Context providers
│   ├── authContext.tsx
│   ├── cartContext.tsx      ← File terbesar, perlu dipecah
│   └── menuContext.tsx
│
├── services/                ← Business logic layer
│   ├── auth/
│   │   ├── authService.ts
│   │   ├── authOnlineAPI.ts
│   │   ├── authOfflineAPI.ts
│   │   └── authSyncStrategy.ts
│   ├── camera/
│   │   ├── cameraAPI.ts
│   │   ├── photoUploadService.ts
│   │   └── photoSyncStrategy.ts
│   ├── meal/
│   │   ├── mealService.ts
│   │   ├── mealOnlineAPI.ts
│   │   ├── mealOfflineAPI.ts
│   │   ├── mealSyncStrategy.ts
│   │   └── nutritionCalculator.ts
│   ├── menu/
│   │   ├── menuService.ts
│   │   ├── menuOnlineAPI.ts
│   │   ├── menuOfflineAPI.ts
│   │   └── menuSyncStrategy.ts
│   ├── openrouter/
│   │   └── openRouterServices.ts
│   ├── pengaturan/
│   │   ├── dataManagementAPI.ts
│   │   └── notificationAPI.ts
│   └── sync/
│       ├── syncInit.ts
│       ├── syncManager.ts
│       └── syncQueue.ts
│
├── types/                   ← TypeScript interfaces
│   ├── camera.ts
│   ├── components.ts
│   ├── dataManagement.ts
│   ├── env.d.ts
│   ├── food.ts
│   ├── meal.ts
│   ├── pengaturan.ts
│   └── user.ts
│
├── utils/                   ← Pure utility functions
│   ├── cartUtils.ts
│   ├── env.ts
│   ├── menuUtils.ts
│   └── nutritionUtils.ts
│
├── pengaturan/              ← Settings sub-routes
│   ├── profil.tsx
│   ├── notifikasi.tsx
│   ├── manajemenData.tsx
│   ├── syncStatusPage.tsx
│   ├── informasiAplikasi.tsx
│   ├── informasiPrivasi.tsx
│   └── termsAndCondition.tsx
│
├── laukList/                ← Food catalog sub-routes
│   └── foodCard/[id].tsx   ← Dynamic route
│
├── _layout.tsx              ← Root layout + sync init
├── index.tsx                ← Entry routing
├── history.tsx              ← History page (~779 baris!)
├── globals.css              ← NativeWind base styles
└── camera.tsx               ← Camera screen
```

### Observasi Struktur

**Baik:**
- Pemisahan `services/`, `contexts/`, `components/`, `types/`, `utils/` sudah benar
- Setiap domain (auth, meal, menu, camera) punya folder sendiri di services
- File types terpusat di `types/`

**Perlu Perbaikan:**
- `history.tsx` mencapai ~779 baris — harus dipecah menjadi sub-komponen
- `cartContext.tsx` 500+ baris mencampur state, logic, dan API calls
- `app-example/` folder masih ada (sisa template, hapus)
- `r2Config.ts` tidak digunakan, hapus atau pakai

---

## 5. NAVIGATION & ROUTING

### Struktur Routing (Expo Router File-Based)

```
/                           → index.tsx (routing guard)
├── /(auth)/login           → Login screen
├── /(auth)/register        → Register screen
│
├── /(tabs)/
│   ├── /                   → Home/Dashboard (index.tsx)
│   ├── /makan              → Katalog makanan
│   └── /pengaturan         → Settings
│
├── /history                → Riwayat nutrisi (modal/screen)
├── /camera                 → Kamera analisis (modal/screen)
│
├── /laukList/foodCard/[id] → Detail makanan (dynamic)
│
└── /pengaturan/
    ├── /profil
    ├── /notifikasi
    ├── /manajemenData
    ├── /syncStatusPage
    ├── /informasiAplikasi
    ├── /informasiPrivasi
    └── /termsAndCondition
```

### Auth Guard Flow

```
app/index.tsx
    ↓
isAuthenticated?
    ├── YES → router.replace('/(tabs)')
    └── NO  → router.replace('/(auth)/login')

loading?
    └── Show LoadingScreen component
```

### Catatan Navigation

**Baik:**
- File-based routing bersih dan mudah dipahami
- Auth guard di `index.tsx` sederhana namun efektif
- Deep linking siap (expo-linking terkonfigurasi)

**Perlu Diperhatikan:**
- Tidak ada `router.back()` guard — user bisa tekan back dari `/(tabs)` ke auth
- Modal `/camera` dan `/history` — pastikan mereka dikonfigurasi sebagai modal bukan push di `_layout.tsx`
- Tidak ada 404/not-found screen custom

---

## 6. STATE MANAGEMENT

### Tiga Context Provider

#### AuthContext (`authContext.tsx`)

```typescript
// State
user: User | null
token: string | null
loading: boolean
isAuthenticated: boolean
isOffline: boolean
loginAttempts: number

// Methods
login(email, password): Promise<void>
register(data): Promise<void>
logout(): void
updateUser(data): Promise<void>
syncProfile(): Promise<void>
syncPendingUpdates(): Promise<void>
changePassword(old, new): Promise<void>
```

**Fitur khusus:**
- Membatasi login attempts (max 5)
- Deteksi offline via NetInfo
- Auto-sync saat kembali online

#### MenuContext (`menuContext.tsx`)

```typescript
// State
menuItems: MenuItem[]
categories: string[]
loading: boolean
error: string | null
syncStatus: SyncStatus

// Methods
fetchMenuItems(): Promise<void>
searchMenu(query): MenuItem[]
filterByCategory(cat): MenuItem[]
```

#### CartContext (`cartContext.tsx`)

```typescript
// State
cart: CartItem[]
ricePortion: number
mealMetadata: MealMetadata
recentScans: NutritionScan[]
todayScans: NutritionScan[]
weeklyInsight: WeeklyInsight
todayStats: TodayStatistics
isAnalyzing: boolean

// Methods
addToCart(id, qty): void
removeFromCart(id): void
clearCart(): void
submitAnalysis(): Promise<void>
analyzePhoto(uri): Promise<void>
refreshScans(): Promise<void>
refreshWeeklyInsight(): Promise<void>
deleteScan(id): Promise<void>
```

### Provider Nesting Order

```jsx
// app/_layout.tsx
<AuthProvider>
  <MenuProvider>
    <CartProvider>
      <AppContent />
    </CartProvider>
  </MenuProvider>
</AuthProvider>
```

### Masalah State Management

**Critical:**
- CartContext mencampur terlalu banyak tanggung jawab:
  - Cart state + nutrition tracking + photo analysis + weekly stats — seharusnya dipisah

**Warning:**
- Tidak ada memoization di context value → semua consumer re-render saat apapun berubah
- WeeklyInsight dihitung ulang setiap kali scans berubah tanpa caching/memoization
- Tidak ada optimistic update reversal jika sync gagal

**Info:**
- Pertimbangkan Zustand atau Jotai untuk state management yang lebih granular

---

## 7. SISTEM OFFLINE-FIRST & SYNC

### Gambaran Besar

Ini adalah salah satu bagian **terkuat** dari aplikasi. Arsitektur offline-first diimplementasikan dengan sangat baik.

### Komponen Sync

#### SyncQueue (`syncQueue.ts`)

Storage antrian persisten berbasis AsyncStorage:

```typescript
interface SyncPayload {
  id: string;
  type: 'auth' | 'meal' | 'menu' | 'photo';
  data: any;
  priority: number;     // 1 (tinggi) - 5 (rendah)
  retries: number;
  lastRetry?: string;
  createdAt: string;
}
```

**Fitur:**
- Persist ke AsyncStorage — survive app restart
- Priority queue — data kritis didahulukan
- Retry tracking — tahu kapan terakhir kali gagal

#### SyncManager (`syncManager.ts`)

Universal sync engine dengan Strategy Pattern:

```typescript
// Registrasi strategy
syncManager.registerStrategy('auth', authSyncStrategy);
syncManager.registerStrategy('meal', mealSyncStrategy);
syncManager.registerStrategy('menu', menuSyncStrategy);
syncManager.registerStrategy('photo', photoSyncStrategy);

// API
syncManager.sync('meal', data)      // Sync satu item
syncManager.syncAll()               // Sync semua antrian
syncManager.syncBatch(10)           // Sync batch
syncManager.getStatus()             // Status global
```

#### Priority Sync Strategies

| Strategy | Priority | Max Retries | Deskripsi |
|---|---|---|---|
| authSyncStrategy | 1 (tertinggi) | 2 | Register user, update profil |
| mealSyncStrategy | 2 | 3 | Submit analisis nutrisi |
| photoSyncStrategy | 2 | 3 | Upload foto + analisis AI |
| menuSyncStrategy | 4 | 2 | Sinkronisasi katalog menu |

#### Initialization Flow

```
[Sync Level] syncInit.ts (module-level, synchronous)
   ├─ new SyncQueue()         → instance singleton
   ├─ new SyncManager()       → instance singleton
   └─ registerStrategy(x4)   → daftar semua strategy

[App Level] app/_layout.tsx (async, saat app start)
   ├─ syncQueue.initialize()  → load queue dari AsyncStorage
   ├─ getQueueStatus()        → cek antrian tertunda
   ├─ processQueue() if online → proses antrian lama
   └─ Show SyncInitializer UI saat loading
```

### User Flow Offline-First

```
User ambil foto / submit analisis
       ↓
Simpan ke AsyncStorage (instant, ~5ms)
       ↓
Tampilkan ke UI immediately
       ↓
Antri ke SyncQueue
       ↓
[Background] Check koneksi internet
       ↓
Online? → Process queue → Kirim ke Appwrite/OpenRouter
Offline? → Tetap di antrian → Auto-retry saat online
```

### Masalah Sync

**High:**
- Tidak ada **batas ukuran queue** — jika user pakai offline sangat lama, queue bisa membengkak dan menghabiskan memori/storage
- Tidak ada **conflict resolution** — jika data berubah di server dan lokal, siapa yang menang?
- `cleanup()` di SyncManager mungkin tidak selalu dipanggil saat app crash

**Medium:**
- Tidak ada **exponential backoff** yang visible di retry logic — apakah sudah ada?
- Status sync di UI (SyncStatusComponents) — apakah akurat saat offline lama?
- Tidak ada **max queue age** — item yang sangat lama di queue mungkin sudah tidak relevan

**Low:**
- `data: any` di SyncPayload tidak type-safe — pertimbangkan discriminated union

---

## 8. AUTENTIKASI

### User Model

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  role: "ibu hamil" | "anak anak" | "remaja" | "dewasa" | "lansia";
  phone?: string;
  createdAt: string;
  updatedAt?: string;
}
```

### Auth Flow

```
Login:
email + password
    ↓ Validate (regex email, min 10 char password)
    ↓ Check login attempts (< 5)
    ↓ authService.login()
    ├─ Online: Appwrite Account API → JWT token
    └─ Offline: Local credential check

Register:
Collect all fields
    ↓ Validate semua field
    ↓ authService.register()
    ├─ Save ke Appwrite
    ├─ Save ke AsyncStorage
    └─ Queue sync jika offline

Logout:
    └─ Clear AsyncStorage user data
       (works offline — tidak perlu server)

Auto-login:
app start
    └─ authService.getCurrentUser()
       ← AsyncStorage (lokal)
```

### Validasi Auth

**Yang sudah ada:**
- Email regex validation
- Password minimum 10 karakter
- Login attempt limit (5x)
- Offline detection sebelum login

**Yang belum ada:**
- Password strength indicator
- Email format lebih ketat (domain validation)
- Captcha / bot protection
- Session expiry handling
- Token refresh mechanism (Appwrite sessions punya expiry)

### Masalah Auth

**Critical:**
- Tidak ada handling untuk **token expiry** — user mungkin tiba-tiba tidak bisa akses API tanpa tahu alasannya
- Jika user ada di Appwrite Auth tapi tidak punya dokumen di database, bisa terjadi **silent failure**

**Medium:**
- Login attempt limit di-reset saat app restart (tidak persistent)
- Tidak ada "lupa password" flow
- Tidak ada email verification

---

## 9. MEAL & NUTRITION TRACKING

### Data Model

```typescript
// Record nutrisi satu kali makan
interface NutritionScan {
  id: string;
  userId?: string;
  foodName: string;
  date: string;         // "Jan 1, 2024"
  time: string;         // "12:30 PM"
  calories: number;
  protein: number;      // gram
  carbs: number;        // gram
  fats: number;         // gram
}

// Statistik mingguan
interface WeeklyInsight {
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealsCount: number;
  balancedMealsCount: number;
  aiSummary?: string;   // Generated via OpenRouter
}

// Statistik hari ini
interface TodayStatistics {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealsCount: number;
  balancedMealsCount: number;
  scans: NutritionScan[];
}
```

### Nutrition Goals (Hardcoded!)

```typescript
// nutritionUtils.ts — HARDCODED, TIDAK PERSONALISASI
const nutritionGoals = {
  calories: { min: 300, max: 700 },
  protein:  { min: 15,  max: 50  },
  carbs:    { min: 30,  max: 100 },
  fats:     { min: 10,  max: 35  },
};
```

**Masalah:** Goal ini sama untuk "ibu hamil", "anak anak", "remaja", "dewasa", "lansia" — padahal kebutuhan nutrisi sangat berbeda!

### Submit Analisis Flow

```
User pilih makanan dari katalog
    ↓ addToCart(id, qty)
    ↓ Set ricePortion
    ↓ submitAnalysis()
        ├─ Calculate nutrition dari selected foods
        ├─ Create NutritionScan object
        ├─ Save ke AsyncStorage (instant)
        ├─ Tambah ke state UI (instant)
        ├─ Clear cart
        └─ Queue sync ke Appwrite
```

### Masalah Nutrition Tracking

**Critical:**
- Nutrition goals **hardcoded** tidak sesuai user role
- Format tanggal `"Jan 1, 2024"` (string) tidak robust untuk parsing — gunakan ISO 8601

**Medium:**
- Tidak ada unit conversion (gram → porsi sendok, dll)
- Tidak ada tracking micronutrients (vitamin, mineral)
- Weekly insight calculation O(n) — bisa lambat dengan banyak data
- Tidak ada pagination untuk history scan

**Low:**
- `balancedMealsCount` definisinya: semua macro dalam goal — definisi ini bisa diperbaiki
- Tidak ada export data ke PDF/CSV (meski ada settings data management)

---

## 10. KAMERA & ANALISIS AI

### Camera Flow

```
User tekan tombol kamera
    ↓
Request permission (camera / gallery)
    ↓
Ambil foto / pilih dari galeri
    ↓
analyzeFood(photoUri)
    ├─ Simpan foto lokal via PhotoUploadService
    ├─ Buat placeholder scan: foodName="Menganalisis..."
    ├─ Return placeholder ke UI (instant)
    └─ Queue ke photoSyncStrategy

[Background — saat online]
photoSyncStrategy.upload()
    ├─ Convert foto ke base64
    ├─ Kirim ke OpenRouter (GPT-4o Vision)
    ├─ Parse response JSON
    ├─ Hitung kalori + makro
    ├─ Update scan di Appwrite
    └─ Update scan di AsyncStorage
```

### OpenRouter AI Integration

**Models yang dipakai:**
- `gpt-4o` — Analisis foto makanan (vision)
- `gpt-4.1-turbo` — Generate weekly summary text

**Konfigurasi:**

```typescript
PHOTO_ANALYSIS_CONFIG: {
  model: "gpt-4o",
  max_tokens: 2048,
  temperature: 0.7
}

WEEKLY_SUMMARY_CONFIG: {
  model: "gpt-4.1-turbo",
  max_tokens: 256,
  temperature: 0.8
}
```

**Non-food detection:**
```
Foto bukan makanan?
    ├─ isFood: false
    ├─ notFoodReason: "The image shows a cat"
    └─ Tampilkan ke user: "Bukan Makanan"
```

### Masalah Camera & AI

**Critical:**
- Tidak ada **request timeout** untuk OpenRouter API — bisa hang tak terbatas
- API key OpenRouter ada di client-side config (lihat Security section)

**High:**
- Tidak ada **image compression** sebelum upload — foto kamera modern bisa 5-15MB
- Base64 encoding foto besar sangat boros memori (3x ukuran asli)
- JSON parsing response AI via regex — fragile, bisa gagal di edge case

**Medium:**
- `gpt-4o` cukup mahal per request — tidak ada cost tracking/limiting
- Tidak ada fallback jika AI analisis gagal (selain retry)
- Status "Menganalisis..." tidak punya timeout — bisa stuck selamanya
- Tidak ada preview/edit hasil analisis sebelum disimpan

**Low:**
- Foto tersimpan lokal tidak pernah dibersihkan (disk usage terus bertambah)

---

## 11. KOMPONEN UI

### Komponen Utama

#### `useToast.tsx`
Custom toast notification system tanpa library eksternal.

```typescript
showToast({
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message?: string,
  actions?: Array<{ label: string; onPress: () => void }>,
  duration?: number,  // ms, default 3000
});
```

**Baik:** No external dependency, fully custom, type-safe  
**Masalah:** Jika `duration=0` dan tidak ada `actions`, toast tidak bisa ditutup

#### `analysisResultCard.tsx`
Menampilkan hasil nutrisi setelah analisis.

**Baik:** Macro breakdown visual yang jelas  
**Masalah:** Tidak ada edit/koreksi manual jika AI salah analisis

#### `weeklyInsightCard.tsx`
Kartu statistik mingguan + AI summary.

**Baik:** AI summary memberikan nilai tambah  
**Masalah:** AI summary tidak di-cache — di-generate ulang setiap kali (biaya API)

#### `SyncStatusComponents.tsx`
Badge status sinkronisasi di tab bar.

**Baik:** User tahu ada data tertunda untuk sync  
**Masalah:** Tidak ada detail item apa yang tertunda

#### `analysisLoadingOverlay.tsx`
Full-screen overlay saat analisis berlangsung.

**Baik:** Preview foto ditampilkan, ada tombol cancel  
**Masalah:** Tombol cancel — apakah benar-benar membatalkan request API?

### Styling Approach

**NativeWind (Tailwind for RN):**
```jsx
<View className="flex-1 bg-primary rounded-xl px-4 py-3" />
<Text className="text-lg font-bold text-text-primary" />
```

**Dynamic colors (inline style):**
```jsx
<View style={{ backgroundColor: color + '30' }} />
```

**Animations (Reanimated):**
```jsx
<Animated.View
  entering={FadeInDown.delay(100).springify()}
  style={animatedStyle}
/>
```

### Custom Color Palette

```javascript
// tailwind.config.js
colors: {
  primary: "#37B37E",    // Hijau emerald — brand utama
  secondary: "#1F78FF",  // Biru
  accent: "#ffa726",     // Orange — warning
  success: "#37B37E",
  error: "#ef4444",
  warning: "#ffa726",
  background: {
    light: "#f0fdf4",    // Hijau sangat muda
    dark: "#1a1a1a",
  }
}
```

---

## 12. BACKEND (APPWRITE)

### Collections Database

```typescript
COLLECTIONS = {
  USERS: 'users',
  USER_PREFERENCES: 'user_preferences',
  MENU_ITEMS: 'menu_items',
  MENU_CATEGORIES: 'menu_categories',
  NUTRITION_SCANS: 'nutrition_scans',
  NUTRITION_GOALS: 'nutrition_goals',
  WEEKLY_INSIGHTS: 'weekly_insights',
  USER_FEEDBACK: 'user_feedback',
  PHOTO_ANALYSIS: 'photo_analysis',
}
```

### Storage Buckets

```typescript
BUCKETS = {
  FOOD_IMAGES: 'food-images',    // Gambar katalog
  MEAL_PHOTOS: 'meal-photos',    // Foto user
}
```

### Appwrite Functions (Didefinisikan tapi mungkin belum aktif)

```typescript
FUNCTIONS = {
  YOLO_ANALYSIS: 'yolo-food-detection',
  GPT4_VISION_ANALYSIS: 'gpt4-vision-analysis',
  NUTRITION_CALCULATION: 'nutrition-calculator',
  LLM_ADVICE: 'llm-nutrition-advice',
  PERSONALIZED_THRESHOLDS: 'personalized-thresholds',
}
```

### Client Pattern

```typescript
class AppwriteService {
  private static instance: AppwriteService; // Singleton
  
  // Exposed services
  public client: Client;
  public account: Account;
  public databases: Databases;
  public storage: Storage;
  public functions: Functions;
}
```

### Masalah Backend

**Critical:**
- OpenRouter API dipanggil dari **client-side** — seharusnya lewat Appwrite Functions
- Tidak ada **Appwrite permission rules** yang terverifikasi dari code review

**High:**
- `WEEKLY_INSIGHTS` collection ada tapi tampaknya weekly insight dihitung lokal — konsistensi?
- `NUTRITION_GOALS` collection ada tapi goals masih hardcoded di client
- Tidak ada **data retention policy** — foto lama tidak pernah dihapus dari storage

**Medium:**
- Tidak ada **database indexes** yang dikonfigurasi dari client config
- Error handling dari Appwrite API error codes tidak comprehensif

---

## 13. KONFIGURASI & ENVIRONMENT

### app.json

```json
{
  "name": "Nutrisight",
  "slug": "Nutrisight",
  "android": {
    "package": "com.innovilage.nutrisight"
  },
  "ios": {
    "bundleIdentifier": "com.innovilage.nutrisight"
  }
}
```

**Permissions Android:**
CAMERA, MICROPHONE, READ/WRITE_EXTERNAL_STORAGE, READ_MEDIA_IMAGES/VIDEO, NOTIFICATIONS, VIBRATE, ACCESS_NETWORK_STATE, SCHEDULE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED, INTERNET

**Catatan:** `MICROPHONE` dan `RECORD_AUDIO` diminta tapi apakah benar-benar digunakan? Jika tidak, **hapus** — review app store bisa reject karena permission tidak digunakan.

### eas.json (Build Config)

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  },
  "env": {
    "EXPO_PUBLIC_OPENROUTER_API_KEY": "sk-or-v1-..."  // BAHAYA!
  }
}
```

### Environment Variables

```
EXPO_PUBLIC_APPWRITE_ENDPOINT     = https://sgp.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID   = [ID]
EXPO_PUBLIC_APPWRITE_DATABASE_ID  = [ID]
EXPO_PUBLIC_APPWRITE_PROJECT_NAME = nutrisight
EXPO_PUBLIC_OPENROUTER_API_KEY    = sk-or-v1-... ← EXPOSED!
```

**Catatan Penting:** `EXPO_PUBLIC_*` prefix berarti variabel ini **dikompile ke dalam bundle** dan **bisa dibaca oleh siapa saja** yang punya file APK. Ini bukan environment variable yang aman untuk secrets.

---

## 14. KUALITAS KODE

### TypeScript Usage

**Kekuatan:**
- Strict mode aktif (`"strict": true` di tsconfig)
- Interface/type definitions komprehensif di `types/`
- Type guards dipakai (`isFoodItem`, `isMenuSyncResult`)
- Union types untuk state yang terdefinisi
- Return types pada sebagian besar fungsi

**Kelemahan:**
```typescript
// Contoh masalah yang mungkin ada:
data: any                         // Di SyncPayload — tidak type-safe
catch (error: unknown) { ... }   // Perlu type narrowing
response as SomeType              // Type assertion tanpa validasi
```

### File Size (Perlu Dipecah)

| File | Estimasi Baris | Status |
|---|---|---|
| `history.tsx` | ~779 baris | TERLALU BESAR |
| `cartContext.tsx` | ~500+ baris | PERLU DIPECAH |
| `openRouterServices.ts` | ~400+ baris | Borderline |
| `syncManager.ts` | ~350+ baris | Acceptable |

### Code Patterns

**Baik:**
- Async/await konsisten (tidak mixing Promise chains)
- `useCallback` untuk memoize fungsi di context
- Destructuring untuk props dan state
- Named exports (tidak default untuk everything)

**Perlu Perbaikan:**
- `console.log` / `console.error` masih ada untuk production logging — gunakan logging service
- Magic numbers tersebar di kode (gunakan constants)
- Comment dalam bahasa campuran (Indonesia + Inggris)

### Naming Conventions

**Konsisten:**
- Components: PascalCase ✅
- Hooks: camelCase dengan prefix `use` ✅
- Services: camelCase ✅
- Types/Interfaces: PascalCase ✅
- Constants: UPPER_SNAKE_CASE (di config) ✅

**Tidak konsisten:**
- Beberapa file/folder dalam bahasa Indonesia (`pengaturan`, `makan`, `lauk`) dan beberapa dalam bahasa Inggris
- Mix bahasa di error messages

---

## 15. BUG & POTENSI ERROR

### CRITICAL

#### 1. Photo Analysis Stuck — Tidak Ada Timeout

**File:** `openRouterServices.ts`  
**Masalah:** OpenRouter request tidak punya timeout. Jika server lambat atau koneksi putus di tengah request, app bisa hang.

```typescript
// TIDAK ADA:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

// YANG SEHARUSNYA:
const response = await fetch(url, {
  signal: controller.signal,
  // ...
});
```

**Dampak:** User melihat "Menganalisis..." selamanya tanpa bisa dibatalkan secara efektif.

#### 2. Silent Auth Failure — User ada di Auth tapi tidak di DB

**File:** `authService.ts`  
**Masalah:** Jika Appwrite account ada tapi dokumen user di database tidak ada, aplikasi bisa crash atau menampilkan data kosong tanpa pesan error yang jelas.

**Dampak:** User terjebak dalam state yang tidak valid.

#### 3. JSON Parsing Fragile dari AI Response

**File:** `openRouterServices.ts`  
**Masalah:** Response AI di-parse dengan regex atau `JSON.parse` sederhana. AI bisa mengembalikan format berbeda-beda.

```typescript
// Jika AI return: "Sure! Here's the analysis: {...}"
// JSON.parse akan gagal karena ada text sebelum JSON
```

**Dampak:** Analisis foto gagal tanpa pesan error yang informatif.

### HIGH PRIORITY

#### 4. Login Attempt Counter Tidak Persistent

**File:** `authContext.tsx`  
**Masalah:** `loginAttempts` disimpan di state React, reset saat app restart.

**Dampak:** User bisa bypass limit 5 percobaan dengan menutup dan membuka app.

#### 5. Tidak Ada Pagination di History

**File:** `history.tsx`  
**Masalah:** Semua scan di-load sekaligus dari AsyncStorage.

**Dampak:** Dengan ratusan/ribuan scan, UI bisa sangat lambat dan boros memori.

#### 6. AsyncStorage Size Limit

**Masalah:** AsyncStorage di Android punya limit ~6MB default (varies by device).

**Dampak:** Jika terlalu banyak data (foto base64, queue besar), bisa gagal menyimpan data baru.

#### 7. Race Condition di Multiple Submit

**File:** `cartContext.tsx`  
**Masalah:** User bisa double-tap tombol submit analisis.

**Dampak:** Dua request terkirim, dua scan tersimpan untuk satu makan.

### MEDIUM PRIORITY

#### 8. Memory Leak Potensial di NetInfo Listener

**File:** `syncManager.ts` / `authContext.tsx`  
**Masalah:** NetInfo subscription mungkin tidak di-unsubscribe dengan benar saat component unmount.

```typescript
// Harus ada:
useEffect(() => {
  const unsub = NetInfo.addEventListener(handler);
  return () => unsub(); // Cleanup!
}, []);
```

#### 9. Weekly Insight — Date Parsing Tidak Robust

**File:** `nutritionUtils.ts`  
**Masalah:** Format date `"Jan 1, 2024"` di-parse ulang untuk filter mingguan. Jika format tidak konsisten, filter salah.

#### 10. Toast Tidak Bisa Ditutup

**File:** `useToast.tsx`  
**Masalah:** Toast dengan `duration=0` dan tanpa `actions` tidak bisa ditutup oleh user.

### LOW PRIORITY

#### 11. r2Config.ts Tidak Digunakan

**File:** `app/config/r2Config.ts`  
**Masalah:** File konfigurasi Cloudflare R2 ada tapi tidak digunakan.

#### 12. MICROPHONE Permission Tidak Jelas Dipakai

**File:** `app.json`  
**Masalah:** Permission microphone/audio recording diminta tapi tidak ada fitur rekaman audio yang terlihat.

#### 13. Foto Lokal Tidak Pernah Dibersihkan

**File:** `photoUploadService.ts`  
**Masalah:** Foto disimpan di FileSystem lokal tapi tidak ada mekanisme cleanup.

**Dampak:** Storage device terus berkurang seiring waktu.

---

## 16. KEAMANAN (SECURITY)

### CRITICAL — API Key Exposed

```
❌ eas.json:
   "EXPO_PUBLIC_OPENROUTER_API_KEY": "sk-or-v1-..."

❌ .env:
   EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-...
```

**Masalah:** `EXPO_PUBLIC_` prefix artinya variabel ini dikompile masuk ke JavaScript bundle. Siapapun yang punya APK bisa mengekstrak API key dengan tools seperti `apktool`.

**Solusi yang Benar:**
```
Client App → Appwrite Function (server) → OpenRouter API
                  ↓
              API key aman di server environment
```

### HIGH — Appwrite Credentials di Client

Project ID dan Database ID di-expose di client. Meski ini kurang berbahaya dari API key, perlu perhatian:
- Jika Appwrite security rules tidak ketat, ini bisa dieksploitasi

### HIGH — AsyncStorage Tidak Encrypted

Data user (profile, scan history) disimpan di AsyncStorage yang **tidak terenkripsi** di Android. Dengan akses root atau backup tools, data bisa dibaca.

**Solusi:** Gunakan `expo-secure-store` untuk data sensitif.

### MEDIUM — Token/Session Management

- Tidak ada automatic session refresh
- Tidak ada session invalidation dari server jika user logout di device lain
- Token disimpan di AsyncStorage (tidak encrypted)

### MEDIUM — Input Validation

- Validasi di client saja (email, password)
- Perlu server-side validation juga (Appwrite rules)
- Tidak ada sanitization untuk input nama makanan, dll.

### LOW — Debug Logging di Production

`console.log` statements yang berisi data user/token bisa ter-capture di production crash logs.

---

## 17. PERFORMA

### Yang Sudah Baik

- **Reanimated** untuk animasi — berjalan di native thread, tidak block JS
- **AsyncStorage caching** — data lokal tersedia instant
- **Lazy loading** photo dengan `expo-image`
- **Batch sync** — tidak satu per satu
- **useCallback** di beberapa context method

### Yang Perlu Dioptimasi

#### Context Re-render

```typescript
// MASALAH: Setiap perubahan state di CartContext
// menyebabkan RE-RENDER SEMUA consumer CartContext

// SOLUSI: Split context atau gunakan useMemo
const value = useMemo(() => ({
  cart, addToCart, removeFromCart
}), [cart]);
```

#### Weekly Calculation

```typescript
// MASALAH: O(n) kalkulasi setiap kali scans berubah
calculateWeeklyInsight(allScans);  // Semua scan dihitung ulang

// SOLUSI: useMemo dengan dependency yang tepat
const weeklyInsight = useMemo(() =>
  calculateWeeklyInsight(scans),
  [scans]  // Only recalculate when scans actually change
);
```

#### List Rendering

```typescript
// MASALAH: FlatList tanpa optimasi
<FlatList data={scans} renderItem={...} />

// SOLUSI: Tambahkan ini
<FlatList
  data={scans}
  renderItem={...}
  getItemLayout={(_, index) => ({    // Fixed height items
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  windowSize={10}                    // Render 10 items at a time
  maxToRenderPerBatch={5}
  removeClippedSubviews={true}
/>
```

#### Image Loading

```typescript
// Tambahkan image compression sebelum upload
import * as ImageManipulator from 'expo-image-manipulator';

const compressed = await ImageManipulator.manipulateAsync(
  photoUri,
  [{ resize: { width: 1024 } }],
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
);
```

### Estimasi Performa Saat Ini

| Operasi | Estimasi | Target |
|---|---|---|
| App startup | ~2-4 detik | < 2 detik |
| Analisis foto (AI) | ~5-30 detik | < 10 detik |
| Load history | < 1 detik (lokal) | < 500ms |
| Sync ke cloud | ~2-10 detik | < 5 detik |
| Menu search | < 100ms | < 50ms |

---

## 18. SARAN IMPROVEMENT

### Jangka Pendek (Segera)

#### 1. Pindahkan API Key ke Server

```
SEKARANG: Client → OpenRouter (API key exposed)
SEHARUSNYA: Client → Appwrite Function → OpenRouter
```

Buat Appwrite Function yang menjadi proxy:
```typescript
// Appwrite Function (server-side)
export default async function handler(req, res) {
  const apiKey = process.env.OPENROUTER_API_KEY; // Aman di server
  // Call OpenRouter...
}
```

#### 2. Tambahkan Request Timeout

```typescript
// utils/fetchWithTimeout.ts
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
```

#### 3. Enkripsi Data Sensitif

```typescript
// Ganti AsyncStorage untuk data sensitif
import * as SecureStore from 'expo-secure-store';

// Token, user credentials → SecureStore
// Non-sensitive (menu items, scan history) → AsyncStorage tetap ok
```

#### 4. Tambahkan Loading Guard untuk Double Submit

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const submitAnalysis = async () => {
  if (isSubmitting) return;  // Guard
  setIsSubmitting(true);
  try {
    await doSubmit();
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 5. Personalisasi Nutrition Goals

```typescript
// Berdasarkan user role + berat badan
function calculateGoals(user: User): NutritionGoals {
  const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);
  
  switch (user.role) {
    case "ibu hamil":
      return { calories: { min: 500, max: 800 }, ... };
    case "anak anak":
      return { calories: { min: 200, max: 400 }, ... };
    // ...
  }
}
```

### Jangka Menengah

#### 6. Tambahkan Pagination

```typescript
// mealService.ts
async getScans(userId: string, page: number, limit: number = 20) {
  const offset = page * limit;
  return await databases.listDocuments(
    DATABASE_ID,
    NUTRITION_SCANS,
    [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(limit),
      Query.offset(offset),
    ]
  );
}
```

#### 7. Image Compression

```typescript
// photoUploadService.ts
import * as ImageManipulator from 'expo-image-manipulator';

async function compressPhoto(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
```

#### 8. Error Monitoring

```bash
npx expo install @sentry/react-native
```

```typescript
// app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
});
```

#### 9. Lokal Cleanup untuk Foto

```typescript
// Hapus foto lokal setelah sync berhasil
async function cleanupLocalPhotos() {
  const files = await FileSystem.readDirectoryAsync(photoDir);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  for (const file of files) {
    const info = await FileSystem.getInfoAsync(`${photoDir}/${file}`);
    if (info.modificationTime < oneWeekAgo) {
      await FileSystem.deleteAsync(`${photoDir}/${file}`);
    }
  }
}
```

#### 10. Pisah File Besar

```
history.tsx (779 baris) → pisah menjadi:
├── history.tsx (main screen, ~200 baris)
├── components/TodayScans.tsx
├── components/AllScans.tsx
└── components/HistoryWeeklyCard.tsx

cartContext.tsx (500+ baris) → pisah menjadi:
├── contexts/cartContext.tsx (state only)
├── contexts/nutritionContext.tsx (stats)
└── services/meal/analysisService.ts (logic)
```

### Jangka Panjang

#### 11. Offline-First Search

Implementasi local full-text search untuk menu tanpa perlu ke server:
```bash
npx expo install @vlcn.io/react-native-quick-sqlite
# atau
npx expo install expo-sqlite
```

#### 12. Push Notifications untuk Meal Reminder

Sudah ada `expo-notifications` terpasang, tinggal implementasi:
```typescript
// Reminder makan siang, dll
await scheduleNotification({
  content: { title: "Jangan lupa makan!", body: "Sudah saatnya makan siang" },
  trigger: { hour: 12, minute: 0, repeats: true },
});
```

#### 13. Weekly Report PDF Export

```typescript
// Gunakan expo-print atau react-native-html-to-pdf
const html = generateReportHTML(weeklyInsight, scans);
const { uri } = await Print.printToFileAsync({ html });
await Sharing.shareAsync(uri);
```

---

## 19. CHECKLIST KEDEPAN

### Keamanan (SEGERA)

- [ ] **KRITIKAL:** Rotasi/invalidasi OpenRouter API key yang sudah exposed
- [ ] Pindahkan OpenRouter calls ke Appwrite Function (server-side)
- [ ] Enkripsi data sensitif di AsyncStorage dengan `expo-secure-store`
- [ ] Review Appwrite security rules/permissions
- [ ] Hapus `console.log` yang berisi data sensitif
- [ ] Verify `.env` ada di `.gitignore`
- [ ] Verify `eas.json` tidak commit API key ke git history

### Bug & Error Handling

- [ ] Tambahkan timeout (30s) untuk semua OpenRouter API calls
- [ ] Handle state "user di Auth tapi tidak di DB"
- [ ] Fix toast yang tidak bisa ditutup (duration=0, no actions)
- [ ] Tambahkan guard double-submit di semua form/button submit
- [ ] Persist login attempt counter ke AsyncStorage
- [ ] Validasi date format — gunakan ISO 8601 konsisten
- [ ] Handle session expiry dari Appwrite (token expired)
- [ ] Tambahkan error boundary di komponen utama

### Kode & Arsitektur

- [ ] Pecah `history.tsx` (~779 baris) menjadi sub-komponen
- [ ] Pecah `cartContext.tsx` (~500+ baris) menjadi context terpisah
- [ ] Hapus `r2Config.ts` jika tidak dipakai
- [ ] Hapus folder `app-example/` (sisa template)
- [ ] Ganti semua `console.log/error` dengan logging service
- [ ] Tambahkan return types yang hilang di beberapa fungsi
- [ ] Hilangkan `any` types, ganti dengan proper types
- [ ] Standardisasi bahasa komentar (pilih satu: Indonesia atau Inggris)
- [ ] Tambahkan error boundary di `_layout.tsx`

### Performa

- [ ] Tambahkan image compression sebelum analisis/upload (target: < 1MB)
- [ ] Implementasi pagination di history screen (20 item per halaman)
- [ ] Tambahkan `getItemLayout` + `windowSize` ke semua FlatList
- [ ] Bungkus context values dengan `useMemo`
- [ ] Split CartContext supaya consumer tidak semua re-render
- [ ] Cleanup foto lokal yang sudah tersync (hapus setelah 7 hari)
- [ ] Tambahkan SyncQueue size limit (max 500 items)

### Fitur

- [ ] Personalisasi nutrition goals berdasarkan user role + berat badan
- [ ] Implementasi "Lupa Password" flow
- [ ] Tambahkan edit manual hasil analisis AI (jika salah deteksi)
- [ ] Implementasi meal reminder notifikasi terjadwal
- [ ] Export riwayat nutrisi ke PDF/CSV
- [ ] Tambahkan micronutrient tracking (vitamin, mineral)
- [ ] Cache AI weekly summary (jangan generate ulang terus)
- [ ] Tambahkan konfirmasi sebelum delete scan

### Testing

- [ ] Setup testing framework (Jest + React Native Testing Library)
- [ ] Unit test `nutritionUtils.ts` (calculateWeeklyInsight, isMealBalanced)
- [ ] Unit test `authService.ts` (login, register, offline scenarios)
- [ ] Unit test `syncQueue.ts` (enqueue, dequeue, priority)
- [ ] Integration test offline → sync flow
- [ ] Integration test photo upload → AI analysis → save scan
- [ ] E2E test full user journey (login → photo → analyze → history)

### Deployment & Build

- [ ] Setup CI/CD dengan EAS (GitHub Actions atau GitLab CI)
- [ ] Cek MICROPHONE permission — hapus jika tidak dipakai
- [ ] Setup Sentry atau error monitoring di production build
- [ ] Konfigurasi ProGuard/R8 rules untuk production Android
- [ ] Test build production di real device sebelum submit
- [ ] Siapkan privacy policy URL yang valid (untuk Play Store)
- [ ] Siapkan screenshots dan metadata Play Store

### Dokumentasi

- [ ] Tambahkan JSDoc untuk semua fungsi di service layer
- [ ] Dokumentasikan SyncStrategy interface
- [ ] Buat README.md yang informatif
- [ ] Dokumentasikan cara setup development environment
- [ ] Dokumentasikan Appwrite collections schema

---

## PENUTUP

NutriSight adalah aplikasi dengan **fondasi arsitektur yang sangat solid** — offline-first pattern, strategy pattern untuk sync, dan pemisahan layer yang baik menunjukkan pemikiran desain yang matang.

**Prioritas utama yang harus diselesaikan sebelum production:**

1. **Security:** Rotasi API key dan pindahkan ke server-side
2. **Stability:** Timeout untuk AI requests + double-submit guard
3. **Data Integrity:** Personalisasi nutrition goals
4. **Testing:** Minimal unit test untuk kalkulasi nutrisi

Dengan perbaikan di atas, aplikasi ini siap untuk deployment production dan memiliki struktur yang baik untuk berkembang ke fitur-fitur yang lebih kompleks.

---

*Review ini dibuat berdasarkan analisis statis kode. Beberapa temuan mungkin perlu diverifikasi dengan testing aktual.*
