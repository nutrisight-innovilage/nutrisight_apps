# 🚀 APPWRITE MIGRATION GUIDE

## 📋 Summary

Successfully refactored **7 files** untuk menggunakan Appwrite sebagai backend, TANPA mengubah [service] layer. Semua perubahan terisolasi di layer [online API] dan [sync strategy].

---

## ✅ Files Created/Modified

### 1. **appwriteConfig.ts** ✨ NEW
**Purpose:** Initialize Appwrite client dan services

**What it does:**
- Setup Appwrite Client, Account, Databases, Storage, Functions
- Define collections dan buckets structure
- Export helper functions (generateId, QueryHelpers, error handler)
- Session management utilities

**Usage:**
```typescript
import { account, databases, storage, functions } from './appwriteConfig';
import { COLLECTIONS, BUCKETS, FUNCTIONS } from './appwriteConfig';
```

---

### 2. **authOnlineAPI.ts** 🔄 REFACTORED
**Changes:**
- ❌ Removed: `fetch()` calls ke REST API
- ✅ Added: Appwrite SDK methods (account.create, account.createEmailPasswordSession, etc.)
- ✅ Added: Session-based authentication (auto-refresh)
- ✅ Added: User document sync to Databases

**Key Differences:**
```typescript
// BEFORE (REST):
const response = await fetch(`${API_BASE_URL}/auth/register`, {
  method: 'POST',
  body: JSON.stringify(data),
});

// AFTER (Appwrite):
const userId = generateId();
await account.create(userId, email, password, name);
const session = await account.createEmailPasswordSession(email, password);
```

**Important Notes:**
- Token = Session secret (auto-refreshed by Appwrite)
- User profile stored in both Account AND Databases collection
- Profile pictures uploaded to Storage bucket

---

### 3. **menuOnlineAPI.ts** 🔄 REFACTORED
**Changes:**
- ❌ Removed: REST API calls
- ✅ Added: Appwrite Databases queries
- ✅ Added: Efficient pagination
- ✅ Added: Advanced filtering dengan Query helpers

**Key Differences:**
```typescript
// BEFORE (REST):
const response = await fetch(`${API_BASE_URL}/menu`);

// AFTER (Appwrite):
const response = await databases.listDocuments(
  DATABASE_ID,
  COLLECTIONS.MENU_ITEMS,
  [QueryHelpers.limit(100)]
);
```

**Important Notes:**
- Menu items stored as documents in `menu_items` collection
- Search menggunakan `Query.search()`
- Incremental sync via `$updatedAt` timestamp
- Soft-delete needs custom implementation (isDeleted flag)

---

### 4. **mealOnlineAPI.ts** 🔄 REFACTORED
**Changes:**
- ❌ Removed: REST API calls
- ✅ Added: Appwrite Functions for YOLO & LLM
- ✅ Added: Databases for nutrition storage
- ✅ Added: Storage for meal photos

**Key Differences:**
```typescript
// BEFORE (REST):
const response = await fetch(`${API_BASE_URL}/analyze/photo`, {
  method: 'POST',
  body: formData,
});

// AFTER (Appwrite):
// 1. Upload to Storage
const uploadedFile = await storage.createFile(BUCKETS.MEAL_PHOTOS, fileId, imageFile);

// 2. Call Function
const execution = await functions.createExecution(
  FUNCTIONS.YOLO_ANALYSIS,
  JSON.stringify({ fileId: uploadedFile.$id })
);

// 3. Parse result
const result = JSON.parse(execution.responseBody);
```

**Important Notes:**
- YOLO analysis = Appwrite Function (serverless)
- Nutrition calculation = Appwrite Function
- LLM advice = Appwrite Function
- Historical data = Batch create documents
- Photos stored in Storage bucket

---

### 5. **authSyncStrategy.ts** 🔄 REFACTORED
**Changes:**
- Adjusted untuk Appwrite session-based auth
- Handle registration conflicts (user already exists)
- Support untuk profile updates via Account + Databases
- Password changes via account.updatePassword()

**Key Differences:**
- Registration might conflict if offline user already registered → auto-login instead
- Session tokens berbeda dari JWT (Appwrite manages refresh)
- Account deletion requires Server SDK (client can only logout)

---

### 6. **menuSyncStrategy.ts** 🔄 REFACTORED
**Changes:**
- Sync via Databases queries instead of REST
- Incremental sync menggunakan `$updatedAt`
- Optional: Real-time sync capability via Appwrite Realtime

**Key Differences:**
- No API timeout handling (Appwrite SDK handles it)
- Server always wins for menu data (read-only from client perspective)
- Can enable real-time sync for premium features

---

### 7. **mealSyncStrategy.ts** 🔄 REFACTORED
**Changes:**
- YOLO analysis via Functions
- Nutrition storage via Databases
- Feedback storage via Databases
- Photo uploads via Storage

**Key Differences:**
- Functions have execution limits (time & memory)
- Batch uploads more important untuk avoid rate limits
- File uploads chunked untuk large files

---

## 🎯 What DIDN'T Change

### ✅ authService.ts - NO CHANGES NEEDED
- Still calls authOnlineAPI and authOfflineAPI
- Flow tetap sama: write local → queue sync
- All refactoring hidden behind authOnlineAPI interface

### ✅ menuService.ts - NO CHANGES NEEDED
- Still calls menuOnlineAPI and menuOfflineAPI
- Sync flow tetap sama
- All Appwrite integration hidden

### ✅ mealService.ts - NO CHANGES NEEDED
- Still calls MealOnlineAPI and MealOfflineAPI
- All actions (submitAnalysis, analyzePhoto, etc.) tetap sama
- All Appwrite integration hidden

### ✅ authOfflineAPI.ts - NO CHANGES NEEDED
- Pure local storage operations
- Independent dari backend choice

### ✅ menuOfflineAPI.ts - NO CHANGES NEEDED
- Pure local storage operations
- Independent dari backend choice

### ✅ mealOfflineAPI.ts - NO CHANGES NEEDED
- Pure local storage operations
- Independent dari backend choice

---

## 📦 Required Appwrite Setup

### 1. Install Appwrite SDK
```bash
npm install appwrite
# or
yarn add appwrite
```

### 2. Environment Variables
```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=main
```

### 3. Create Collections in Appwrite Console

#### **users** Collection
```json
{
  "email": "string (email)",
  "name": "string",
  "phone": "string (optional)",
  "dateOfBirth": "string (optional)",
  "gender": "string (optional)",
  "address": "string (optional)",
  "imageUrl": "string (optional)",
  "imageFileId": "string (optional)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

**Indexes:**
- `email` (unique, string)

**Permissions:**
- Read: User (owner only)
- Create: Any
- Update: User (owner only)
- Delete: User (owner only)

---

#### **menu_items** Collection
```json
{
  "foodName": "string",
  "description": "string",
  "imageUrl": "string",
  "category": "string",
  "calories": "integer",
  "protein": "integer",
  "carbs": "integer",
  "fats": "integer",
  "fiber": "integer",
  "sodium": "integer",
  "sugar": "integer",
  "servingSize": "integer",
  "servingUnit": "string",
  "allergens": "string[]",
  "ingredients": "string[]",
  "preparationTime": "integer",
  "isVegetarian": "boolean",
  "isVegan": "boolean",
  "isGlutenFree": "boolean",
  "spicyLevel": "integer",
  "popularity": "integer"
}
```

**Indexes:**
- `foodName` (full-text search)
- `category` (string)
- `$updatedAt` (datetime)

**Permissions:**
- Read: Any
- Create: Admin only
- Update: Admin only
- Delete: Admin only

---

#### **nutrition_scans** Collection
```json
{
  "userId": "string",
  "date": "datetime",
  "mealType": "string",
  "items": "string[]",
  "ricePortion": "integer",
  "totalCalories": "integer",
  "totalProtein": "integer",
  "totalCarbs": "integer",
  "totalFats": "integer",
  "totalFiber": "integer",
  "photoUrl": "string (optional)",
  "notes": "string (optional)",
  "isManual": "boolean"
}
```

**Indexes:**
- `userId` (string)
- `date` (datetime)

**Permissions:**
- Read: User (owner only via userId)
- Create: User (owner only)
- Update: User (owner only)
- Delete: User (owner only)

---

#### **nutrition_goals** Collection
```json
{
  "userId": "string",
  "dailyCalories": "integer",
  "dailyProtein": "integer",
  "dailyCarbs": "integer",
  "dailyFats": "integer",
  "goal": "string",
  "activityLevel": "string",
  "createdAt": "datetime"
}
```

**Permissions:**
- Read: User (owner only)
- Create: User (owner only)

---

#### **user_feedback** Collection
```json
{
  "scanId": "string",
  "userId": "string",
  "rating": "integer",
  "accuracyFeedback": "string (JSON)",
  "corrections": "string (JSON)",
  "comments": "string",
  "createdAt": "datetime"
}
```

**Permissions:**
- Read: Admin only (for ML training)
- Create: User

---

### 4. Create Storage Buckets

#### **profile-pictures**
- Max file size: 2MB
- Allowed extensions: jpg, jpeg, png, webp
- Permissions: Read (any), Create (user), Update (user), Delete (user)

#### **food-images**
- Max file size: 5MB
- Allowed extensions: jpg, jpeg, png, webp
- Permissions: Read (any), Create (admin)

#### **meal-photos**
- Max file size: 10MB
- Allowed extensions: jpg, jpeg, png
- Permissions: Read (user), Create (user), Delete (user)

---

### 5. Create Functions (Serverless)

#### **yolo-food-detection**
**Runtime:** Python 3.9 or Node.js 18
**Purpose:** Analyze food photos dengan YOLO model

**Input:**
```json
{
  "fileId": "string",
  "bucketId": "string"
}
```

**Output:**
```json
{
  "success": true,
  "detectedFoods": [
    {
      "name": "nasi goreng",
      "quantity": 1,
      "unit": "piring",
      "confidence": 0.95
    }
  ],
  "confidence": 0.95,
  "processingTime": 1234
}
```

---

#### **nutrition-calculator**
**Runtime:** Node.js 18
**Purpose:** Calculate nutrition dari meal items

**Input:**
```json
{
  "items": ["item1", "item2"],
  "ricePortion": 2,
  "userId": "string"
}
```

**Output:**
```json
{
  "success": true,
  "scan": {
    "id": "unique_id",
    "totalCalories": 850,
    "totalProtein": 35,
    "totalCarbs": 120,
    "totalFats": 25
  }
}
```

---

#### **llm-nutrition-advice**
**Runtime:** Node.js 18
**Purpose:** Generate personalized advice menggunakan LLM

**Input:**
```json
{
  "action": "advice",
  "context": {
    "recentScans": [...],
    "goals": {...}
  }
}
```

**Output:**
```json
{
  "advice": "Based on your recent meals...",
  "recommendations": [...],
  "warnings": [...],
  "tips": [...]
}
```

---

#### **personalized-thresholds**
**Runtime:** Node.js 18
**Purpose:** Calculate personalized nutrition thresholds

**Output:**
```json
{
  "success": true,
  "thresholds": {
    "calories": { "min": 1800, "max": 2200 },
    "protein": { "min": 60, "max": 100 },
    "carbs": { "min": 200, "max": 300 },
    "fats": { "min": 40, "max": 70 }
  }
}
```

---

## 🔄 Migration Checklist

### Pre-Migration
- [ ] Install Appwrite SDK
- [ ] Setup Appwrite project
- [ ] Create all collections
- [ ] Create all storage buckets
- [ ] Deploy all functions
- [ ] Configure environment variables
- [ ] Test Appwrite connection

### Migration
- [ ] Replace old online API files
- [ ] Replace old sync strategy files
- [ ] Update appwriteConfig with your project ID
- [ ] Test authentication flow
- [ ] Test menu sync
- [ ] Test meal analysis
- [ ] Test photo upload

### Post-Migration
- [ ] Monitor function execution times
- [ ] Check storage usage
- [ ] Verify sync operations
- [ ] Test offline scenarios
- [ ] Optimize queries if needed
- [ ] Setup real-time sync (optional)

---

## ⚠️ Important Notes

### 1. **Session Management**
Appwrite uses session-based auth, bukan JWT. Session auto-refresh handled by SDK.

### 2. **Function Limits**
- Execution time: Max 30 seconds (Cloud), configurable (Self-hosted)
- Memory: 512MB default
- Payload size: 10MB max

### 3. **Rate Limits**
- Free tier: 75,000 requests/month
- Pro tier: Unlimited
- Consider batch operations

### 4. **Storage Costs**
- Free tier: 2GB storage
- Pro tier: 100GB included
- Optimize image sizes

### 5. **Real-time**
- Can enable for premium features
- Subscription requires active connection
- Battery impact on mobile

### 6. **Offline Considerations**
- Appwrite SDK requires internet for most operations
- Offline-first architecture still valid (local storage first)
- Sync when online (as implemented)

---

## 🎨 Usage Examples

### Initialize Appwrite
```typescript
import { appwriteService } from './appwriteConfig';

// Set session after login
appwriteService.setSession(sessionToken);

// Clear session on logout
appwriteService.clearSession();
```

### Authentication
```typescript
import authOnlineAPI from './authOnlineAPI';

// Register
const authData = await authOnlineAPI.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secure123',
});

// Login
const authData = await authOnlineAPI.login({
  email: 'john@example.com',
  password: 'secure123',
});
```

### Menu Operations
```typescript
import menuOnlineAPI from './menuOnlineAPI';

// Fetch all menu
const items = await menuOnlineAPI.fetchMenuItems();

// Search
const results = await menuOnlineAPI.searchMenuItems('nasi goreng');

// Sync cache
const syncResult = await menuOnlineAPI.syncMenuCache(lastSyncTime);
```

### Meal Operations
```typescript
import { MealOnlineAPI } from './mealOnlineAPI';

// Analyze photo
const yoloResult = await MealOnlineAPI.analyzeFoodFromPhoto(photoUri);

// Submit meal
const scan = await MealOnlineAPI.analyzeMeal({
  items: ['item1', 'item2'],
  ricePortion: 2,
  userId: 'user123',
});

// Send feedback
await MealOnlineAPI.sendUserFeedback({
  scanId: 'scan123',
  rating: 5,
  accuracyFeedback: {...},
});
```

---

## 🚨 Troubleshooting

### "Project not found" Error
- Check `EXPO_PUBLIC_APPWRITE_PROJECT_ID`
- Verify project exists in Appwrite Console

### "Collection not found" Error
- Check collection names in appwriteConfig
- Verify collections created in Console
- Check DATABASE_ID

### "Unauthorized" Error
- Check session token
- Re-login if needed
- Verify permissions in Console

### "Function execution failed" Error
- Check function logs in Console
- Verify function is deployed
- Check input payload format

### Slow Performance
- Enable caching
- Use incremental sync
- Optimize queries (add indexes)
- Batch operations when possible

---

## 📚 Resources

- [Appwrite Docs](https://appwrite.io/docs)
- [Appwrite React Native](https://appwrite.io/docs/getting-started-for-react-native)
- [Appwrite Functions](https://appwrite.io/docs/functions)
- [Appwrite Storage](https://appwrite.io/docs/storage)
- [Appwrite Databases](https://appwrite.io/docs/databases)

---

## ✨ Benefits of Appwrite

1. **Built-in Auth** - Session management, OAuth, 2FA
2. **Real-time** - WebSocket subscriptions for live updates
3. **Serverless Functions** - Deploy ML models (YOLO, LLM)
4. **File Storage** - Image optimization, CDN
5. **Open Source** - Self-hostable
6. **SDKs** - Native support for React Native
7. **Security** - Permissions, encryption, HTTPS

---

## 🎯 Next Steps

1. **Test thoroughly** - All auth, menu, meal flows
2. **Monitor** - Function executions, storage usage
3. **Optimize** - Query performance, image sizes
4. **Scale** - Consider Pro plan for production
5. **Backup** - Regular database exports
6. **Real-time** - Implement for premium features (optional)

---

**Created:** 2026-02-12
**Author:** Claude (Anthropic)
**Version:** 1.0.0 (Appwrite Migration)