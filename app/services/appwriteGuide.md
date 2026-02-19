# 🚀 APPWRITE COMPLETE SETUP GUIDE v2.1

## 📋 OVERVIEW

Panduan lengkap setup Appwrite backend untuk aplikasi Nutrition Tracking.
**Updated v2.1** - Includes Photo Analysis with OpenRouter GPT-4 Vision integration.

---

## STEP 1: Create Appwrite Project

1. **Sign up/Login** ke https://cloud.appwrite.io
2. **Create New Project**
   - Name: "NutriTrack" (atau nama pilihan Anda)
   - Click "Create"
3. **Copy Project ID** (akan dipakai di `.env`)
   - Contoh: `67a1b2c3d4e5f6g7h8i9`

---

## STEP 2: Add Platform

1. Klik **"Add Platform"**
2. Pilih **"React Native"**
3. Isi:
   - **Name**: "NutriTrack Mobile"
   - **Package Name (Android)**: `com.yourcompany.nutritrack`
   - **Bundle ID (iOS)**: `com.yourcompany.nutritrack`
4. Klik **"Register"**

---

## STEP 3: Install SDK
```bash
npm install appwrite
# atau
yarn add appwrite
```

---

## STEP 4: Environment Variables

Buat file `.env`:
```env
# Appwrite Configuration
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
EXPO_PUBLIC_APPWRITE_DATABASE_ID=main

# OpenRouter API (for Photo Analysis)
EXPO_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key-here
```

⚠️ **PENTING**: 
- Ganti `your-project-id-here` dengan Project ID Anda!
- Ganti `your-openrouter-api-key-here` dengan OpenRouter API key (dapatkan di https://openrouter.ai)

---

## STEP 5: Create Database

1. Sidebar → **"Databases"**
2. **"Create Database"**
3. **Database ID**: `main` (harus sama dengan `.env`)
4. **Name**: "Main Database"
5. Klik **"Create"**

---

## STEP 6: Create Collections

### ✅ COLLECTION 1: `users`

**Collection Settings:**
- **Collection ID**: `users` (exact!)
- **Name**: "Users"

**Attributes:**

| Key | Type | Size | Required | Default | Array |
|-----|------|------|----------|---------|-------|
| `email` | Email | - | ✅ Yes | - | No |
| `name` | String | 255 | ✅ Yes | - | No |
| `age` | Integer | - | ✅ Yes | `0` | No |
| `weight` | Float | - | ✅ Yes | `0` | No |
| `height` | Float | - | ✅ Yes | `0` | No |
| `gender` | String | 20 | ✅ Yes | `male` | No |
| `role` | String | 50 | ✅ Yes | `dewasa` | No |
| `phone` | String | 20 | ❌ No | - | No |
| `updatedAt` | DateTime | - | ✅ Yes | - | No |

**Indexes:**
1. **Key**: `email_unique`
   - **Type**: Unique
   - **Attributes**: `email`

**Permissions:**
```
✅ Read: User (document.userId == $userId)
✅ Create: Any
✅ Update: User (document.userId == $userId)
✅ Delete: User (document.userId == $userId)
```

---

### ✅ COLLECTION 2: `menu_items`

**Collection Settings:**
- **Collection ID**: `menu_items`
- **Name**: "Menu Items"

**Attributes:**

| Key | Type | Size | Required | Default | Array |
|-----|------|------|----------|---------|-------|
| `foodName` | String | 255 | ✅ Yes | - | No |
| `description` | String | 1000 | ✅ Yes | - | No |
| `imageUrl` | URL | 2000 | ✅ Yes | - | No |
| `category` | String | 100 | ✅ Yes | - | No |
| `protein` | Integer | - | ✅ Yes | `0` | No |
| `fat` | Integer | - | ✅ Yes | `0` | No |
| `carbs` | Integer | - | ✅ Yes | `0` | No |
| `calories` | Integer | - | ✅ Yes | `0` | No |
| `vitamins` | String | 50 | ❌ No | - | ✅ Yes |
| `recipe` | String | 5000 | ❌ No | - | No |

**Indexes:**
1. **Key**: `foodName_search`
   - **Type**: Fulltext
   - **Attributes**: `foodName`

2. **Key**: `category_index`
   - **Type**: Key
   - **Attributes**: `category`

3. **Key**: `updated_at_index`
   - **Type**: Key
   - **Attributes**: `$updatedAt`

**Permissions:**
```
✅ Read: Any
⛔ Create: Admin only
⛔ Update: Admin only
⛔ Delete: Admin only
```

---

### ✅ COLLECTION 3: `nutrition_scans`

**Collection Settings:**
- **Collection ID**: `nutrition_scans`
- **Name**: "Nutrition Scans"

**Attributes:**

| Key | Type | Size | Required | Default | Array |
|-----|------|------|----------|---------|-------|
| `userId` | String | 255 | ✅ Yes | - | No |
| `date` | DateTime | - | ✅ Yes | - | No |
| `mealType` | String | 50 | ❌ No | - | No |
| `items` | String | 10000 | ✅ Yes | `[]` | No |
| `ricePortion` | Integer | - | ✅ Yes | `1` | No |
| `totalCalories` | Integer | - | ✅ Yes | `0` | No |
| `totalProtein` | Integer | - | ✅ Yes | `0` | No |
| `totalCarbs` | Integer | - | ✅ Yes | `0` | No |
| `totalFats` | Integer | - | ✅ Yes | `0` | No |
| `notes` | String | 1000 | ❌ No | - | No |

⚠️ **IMPORTANT**: `items` adalah **JSON string**, bukan array! 
Format: `"[{\"id\":\"food1\",\"quantity\":2}]"`

**Indexes:**
1. **Key**: `userId_index`
   - **Type**: Key
   - **Attributes**: `userId`

2. **Key**: `date_index`
   - **Type**: Key
   - **Attributes**: `date`

3. **Key**: `userId_date_index`
   - **Type**: Key
   - **Attributes**: `userId`, `date`

**Permissions:**
```
✅ Read: User (document.userId == $userId)
✅ Create: User
✅ Update: User (document.userId == $userId)
✅ Delete: User (document.userId == $userId)
```

---

### ✅ COLLECTION 4: `nutrition_goals`

**Collection Settings:**
- **Collection ID**: `nutrition_goals`
- **Name**: "Nutrition Goals"

**Attributes:**

| Key | Type | Size | Required | Default | Array |
|-----|------|------|----------|---------|-------|
| `userId` | String | 255 | ✅ Yes | - | No |
| `calories` | String | 500 | ✅ Yes | `{}` | No |
| `protein` | String | 500 | ✅ Yes | `{}` | No |
| `carbs` | String | 500 | ✅ Yes | `{}` | No |
| `fats` | String | 500 | ✅ Yes | `{}` | No |

⚠️ **IMPORTANT**: Semua fields adalah **JSON strings**!
Format: 
- `calories`: `"{\"min\":1800,\"max\":2200}"`
- `protein`: `"{\"min\":50,\"max\":100,\"label\":\"Moderate\"}"`

**Indexes:**
1. **Key**: `userId_index`
   - **Type**: Unique
   - **Attributes**: `userId`

**Permissions:**
```
✅ Read: User (document.userId == $userId)
✅ Create: User
✅ Update: User (document.userId == $userId)
✅ Delete: User (document.userId == $userId)
```

---

### ✅ COLLECTION 5: `user_feedback`

**Collection Settings:**
- **Collection ID**: `user_feedback`
- **Name**: "User Feedback"

**Attributes:**

| Key | Type | Size | Required | Default | Array |
|-----|------|------|----------|---------|-------|
| `scanId` | String | 255 | ✅ Yes | - | No |
| `userId` | String | 255 | ✅ Yes | - | No |
| `rating` | Integer | - | ✅ Yes | `0` | No |
| `accuracyFeedback` | String | 5000 | ❌ No | `{}` | No |
| `corrections` | String | 5000 | ❌ No | `{}` | No |
| `comments` | String | 2000 | ❌ No | - | No |

**Indexes:**
1. **Key**: `scanId_index`
   - **Type**: Key
   - **Attributes**: `scanId`

2. **Key**: `userId_index`
   - **Type**: Key
   - **Attributes**: `userId`

**Permissions:**
```
⛔ Read: Admin only
✅ Create: User
✅ Update: User (document.userId == $userId)
✅ Delete: User (document.userId == $userId)
```

---

### ✅ COLLECTION 6: `weekly_insights`

**Collection Settings:**
- **Collection ID**: `weekly_insights`
- **Name**: "Weekly Insights"

**Attributes:**

| Key | Type | Size | Required | Default | Array |
|-----|------|------|----------|---------|-------|
| `userId` | String | 255 | ✅ Yes | - | No |
| `startDate` | DateTime | - | ✅ Yes | - | No |
| `endDate` | DateTime | - | ✅ Yes | - | No |
| `totalCalories` | Integer | - | ✅ Yes | `0` | No |
| `avgCalories` | Integer | - | ✅ Yes | `0` | No |
| `totalProtein` | Integer | - | ✅ Yes | `0` | No |
| `totalCarbs` | Integer | - | ✅ Yes | `0` | No |
| `totalFats` | Integer | - | ✅ Yes | `0` | No |
| `mealsCount` | Integer | - | ✅ Yes | `0` | No |

**Indexes:**
1. **Key**: `userId_index`
   - **Type**: Key
   - **Attributes**: `userId`

2. **Key**: `startDate_index`
   - **Type**: Key
   - **Attributes**: `startDate`

**Permissions:**
```
✅ Read: User (document.userId == $userId)
⛔ Create: Functions only
⛔ Update: Functions only
⛔ Delete: Admin only
```

---

### ✅ COLLECTION 7: `photo_analysis` 🆕 v2.1

**Collection Settings:**
- **Collection ID**: `photo_analysis`
- **Name**: "Photo Analysis"
- **Description**: Stores AI photo analysis results from GPT-4 Vision

**Attributes:**

| Key | Type | Size | Required | Default | Array |
|-----|------|------|----------|---------|-------|
| `userId` | String | 255 | ✅ Yes | - | No |
| `photoUrl` | URL | 2000 | ✅ Yes | - | No |
| `photoFileId` | String | 255 | ❌ No | - | No |
| `scanId` | String | 255 | ✅ Yes | - | No |
| `aiProvider` | String | 100 | ✅ Yes | `openrouter-gpt4v` | No |
| `aiResponse` | String | 10000 | ✅ Yes | `{}` | No |
| `extractedFoods` | String | 2000 | ✅ Yes | `[]` | No |
| `confidence` | Float | - | ✅ Yes | `0` | No |
| `processingTime` | Integer | - | ✅ Yes | `0` | No |
| `status` | String | 50 | ✅ Yes | `pending` | No |
| `error` | String | 1000 | ❌ No | - | No |
| `createdAt` | DateTime | - | ✅ Yes | - | No |

⚠️ **IMPORTANT**: 
- `aiResponse` adalah **JSON string** dari GPT-4 Vision response
- `extractedFoods` adalah **JSON string array** dari detected food names
- Format `aiResponse`: `"{\"foods\":[...],\"totalNutrition\":{...},\"confidence\":0.95}"`
- Format `extractedFoods`: `"[\"Nasi Goreng\",\"Ayam Goreng\",\"Telur\"]"`

**Indexes:**
1. **Key**: `userId_index`
   - **Type**: Key
   - **Attributes**: `userId`

2. **Key**: `scanId_index`
   - **Type**: Key
   - **Attributes**: `scanId`

3. **Key**: `createdAt_index`
   - **Type**: Key
   - **Attributes**: `createdAt`

4. **Key**: `status_index`
   - **Type**: Key
   - **Attributes**: `status`

**Permissions:**
```
✅ Read: User (document.userId == $userId)
✅ Create: User
✅ Update: User (document.userId == $userId)
✅ Delete: User (document.userId == $userId)
```

---

## STEP 7: Create Storage Buckets

### ✅ BUCKET 1: `profile-pictures`

1. Sidebar → **"Storage"**
2. **"Create Bucket"**

**Settings:**
- **Bucket ID**: `profile-pictures` (exact!)
- **Name**: "Profile Pictures"
- **Max file size**: 2097152 bytes (2MB)
- **Allowed extensions**: `jpg,jpeg,png,webp`
- **Compression**: Enabled
- **Encryption**: Enabled
- **Antivirus**: Enabled (if available)

**Permissions:**
```
✅ Read: Any
✅ Create: User
✅ Update: User
✅ Delete: User
```

---

### ✅ BUCKET 2: `food-images`

**Settings:**
- **Bucket ID**: `food-images`
- **Name**: "Food Images"
- **Max file size**: 5242880 bytes (5MB)
- **Allowed extensions**: `jpg,jpeg,png,webp`

**Permissions:**
```
✅ Read: Any
⛔ Create: Admin only
⛔ Update: Admin only
⛔ Delete: Admin only
```

---

### ✅ BUCKET 3: `meal-photos` 🆕 v2.1

**Settings:**
- **Bucket ID**: `meal-photos`
- **Name**: "Meal Photos"
- **Description**: User-uploaded meal photos for AI analysis
- **Max file size**: 10485760 bytes (10MB)
- **Allowed extensions**: `jpg,jpeg,png,heic`
- **Compression**: Enabled (recommended)
- **Encryption**: Enabled
- **Antivirus**: Enabled (if available)

**Permissions:**
```
✅ Read: User
✅ Create: User
✅ Update: User
✅ Delete: User
```

⚠️ **NOTE**: Photos are uploaded here first, then analyzed by GPT-4 Vision via OpenRouter API

---

## STEP 8: OpenRouter API Setup 🆕 v2.1

### Get OpenRouter API Key

1. **Sign up** di https://openrouter.ai
2. **Go to** Settings → API Keys
3. **Create New Key**
4. **Copy** API key ke `.env`:
   ```env
   EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-xxx...
   ```

### Verify API Key

Test dengan curl:
```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### Photo Analysis Flow (v2.1)

```
1. User takes photo
   ↓
2. Photo saved locally (instant, offline-capable)
   ↓
3. Photo queued for sync
   ↓
4. When online:
   a. Upload to Appwrite Storage (meal-photos bucket)
   b. Get photo URL
   c. Call OpenRouter GPT-4 Vision API
   d. Parse AI response (JSON)
   e. Save to photo_analysis collection
   f. Update nutrition_scans with AI results
   ↓
5. User sees updated nutrition data
```

---

## STEP 9: Test Connection

Buat file `test-appwrite.ts`:
```typescript
import { Client, Account, Databases, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('YOUR_PROJECT_ID'); // ⚠️ GANTI!

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

async function testConnection() {
  try {
    // Test 1: Health check
    console.log('Testing Appwrite connection...');
    
    // Test 2: List collections
    const collections = await databases.listCollections('main');
    console.log('✅ Collections found:', collections.total);
    
    // Test 3: Check photo_analysis collection
    const photoAnalysis = collections.collections.find(c => c.$id === 'photo_analysis');
    if (photoAnalysis) {
      console.log('✅ photo_analysis collection exists');
    }
    
    // Test 4: Check meal-photos bucket
    const buckets = await storage.listBuckets();
    const mealPhotos = buckets.buckets.find(b => b.$id === 'meal-photos');
    if (mealPhotos) {
      console.log('✅ meal-photos bucket exists');
    }
    
    console.log('✅ Appwrite connection successful!');
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();
```

Run:
```bash
npx ts-node test-appwrite.ts
```

---

## STEP 10: Test Photo Analysis 🆕 v2.1

Buat file `test-photo-analysis.ts`:
```typescript
import { photoSyncStrategy } from './photoSyncStrategy';

async function testPhotoAnalysis() {
  try {
    console.log('Testing photo analysis flow...');
    
    // Prepare test data
    const testData = {
      action: 'analyzePhoto' as const,
      photoUri: 'file:///path/to/test/image.jpg',
      localScanId: 'test_scan_123',
      metadata: {
        userId: 'test_user_id',
        mealType: 'lunch' as const,
        notes: 'Test meal',
      },
    };
    
    // Validate
    const isValid = photoSyncStrategy.validate(testData);
    console.log('✅ Validation:', isValid ? 'PASS' : 'FAIL');
    
    // Prepare
    const payload = await photoSyncStrategy.prepare(testData);
    console.log('✅ Payload prepared:', payload.id);
    
    // Note: Upload requires actual photo and OpenRouter API key
    console.log('⚠️  Upload test skipped (requires real photo)');
    
    console.log('✅ Photo analysis flow test complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPhotoAnalysis();
```

---

## ✅ VERIFICATION CHECKLIST v2.1

Setelah setup selesai, verify:

### Basic Setup
- [ ] Project created & Project ID copied
- [ ] Platform registered (React Native)
- [ ] SDK installed (`appwrite` package)
- [ ] `.env` file configured with Appwrite credentials
- [ ] `.env` file configured with OpenRouter API key 🆕

### Database & Collections
- [ ] Database `main` created
- [ ] 7 collections created:
  - [ ] `users`
  - [ ] `menu_items`
  - [ ] `nutrition_scans`
  - [ ] `nutrition_goals`
  - [ ] `user_feedback`
  - [ ] `weekly_insights`
  - [ ] `photo_analysis` 🆕 v2.1

### Storage Buckets
- [ ] 3 storage buckets created:
  - [ ] `profile-pictures`
  - [ ] `food-images`
  - [ ] `meal-photos` 🆕 v2.1

### Configuration
- [ ] All attributes configured correctly
- [ ] All indexes created
- [ ] All permissions set
- [ ] `photo_analysis` collection has proper JSON string fields 🆕
- [ ] `meal-photos` bucket allows jpg, jpeg, png, heic 🆕

### Testing
- [ ] Test connection successful
- [ ] Can create test user
- [ ] Can upload to meal-photos bucket 🆕
- [ ] OpenRouter API key working 🆕

---

## 🚨 COMMON ISSUES v2.1

### Issue 1: "Project not found"
**Solution**: Check `.env` → `EXPO_PUBLIC_APPWRITE_PROJECT_ID`

### Issue 2: "Collection not found"
**Solution**: 
- Check collection ID (must be exact: `photo_analysis`, not `photoAnalysis`)
- Check database ID (must be `main`)

### Issue 3: "Unauthorized"
**Solution**: Check permissions in Appwrite Console

### Issue 4: "Invalid document structure"
**Solution**: 
- For `aiResponse`: must be JSON string, not object
- For `extractedFoods`: must be JSON string array, not array
- For `items` in nutrition_scans: must be JSON string, not array

### Issue 5: "Network request failed"
**Solution**: 
- Check internet connection
- Check Appwrite endpoint URL
- Verify using correct Cloud/Self-hosted endpoint

### Issue 6: "OpenRouter API error" 🆕
**Solution**:
- Check API key in `.env`
- Verify API key is active at https://openrouter.ai
- Check API usage limits
- Ensure proper request format (see photoSyncStrategy.ts)

### Issue 7: "Photo upload failed" 🆕
**Solution**:
- Check file size (max 10MB)
- Check file extension (jpg, jpeg, png, heic only)
- Verify bucket permissions
- Check local file path exists

### Issue 8: "AI analysis timeout" 🆕
**Solution**:
- Reduce image size/quality before upload
- Check OpenRouter service status
- Increase timeout in fetch request
- Retry with exponential backoff

---

## 📚 NEXT STEPS

### 1. Seed Initial Data

**Option A: Via Appwrite Console**
- Go to `menu_items` collection
- Add sample food items manually

**Option B: Seed Script**
```typescript
import { databases, DATABASE_ID, COLLECTIONS } from './appwriteConfig';

async function seedMenuItems() {
  const sampleItems = [
    {
      foodName: 'Nasi Goreng',
      description: 'Indonesian fried rice',
      imageUrl: 'https://example.com/nasi-goreng.jpg',
      category: 'Main Course',
      calories: 450,
      protein: 15,
      carbs: 60,
      fat: 12,
    },
    // Add more items...
  ];

  for (const item of sampleItems) {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.MENU_ITEMS,
      'unique()',
      item
    );
  }
  
  console.log('✅ Seed complete');
}
```

### 2. Test Photo Analysis End-to-End 🆕

```typescript
import { CameraService } from './cameraService';

async function testE2E() {
  // 1. Take photo (in real app)
  const photo = await CameraService.takePhoto(cameraRef);
  
  // 2. Analyze food
  const result = await CameraService.analyzeFood(
    photo.uri,
    { mealType: 'lunch' }
  );
  
  // 3. Check result
  console.log('Analysis result:', result);
  
  // 4. Poll for completion (AI takes 10-30 seconds)
  const status = await CameraService.getAnalysisStatus(
    result.scan.id
  );
  
  console.log('Status:', status);
}
```

### 3. Monitor Usage

- Dashboard → "Usage"
- Watch request counts
- Watch storage usage
- Monitor OpenRouter API costs 🆕

### 4. Setup Error Monitoring

```typescript
// Add to app initialization
import { sendDashboardPing } from './appwriteConfig';

async function initApp() {
  const ping = await sendDashboardPing();
  console.log('Appwrite status:', ping.message);
  
  // Monitor photo analysis errors
  // Setup alerts for failed analyses
}
```

---

## 🎯 PRODUCTION CONSIDERATIONS v2.1

### Security
- [ ] Review all permissions
- [ ] Enable API key restrictions
- [ ] Setup rate limiting
- [ ] Enable 2FA for admin accounts
- [ ] Secure OpenRouter API key (never commit to git) 🆕
- [ ] Add request validation for photo uploads 🆕

### Performance
- [ ] Setup CDN for Storage
- [ ] Enable image compression for meal-photos 🆕
- [ ] Optimize AI analysis (batch if possible) 🆕
- [ ] Cache frequent menu_items queries
- [ ] Monitor slow queries

### Cost Management 🆕
- [ ] Monitor OpenRouter API usage
- [ ] Set usage alerts
- [ ] Implement rate limiting for photo analysis
- [ ] Consider caching AI results
- [ ] Optimize image quality vs. API cost

### Backup
- [ ] Setup automated backups
- [ ] Export data regularly
- [ ] Test restore procedures
- [ ] Backup meal-photos separately 🆕

### Scaling
- [ ] Monitor usage metrics
- [ ] Plan for Pro plan upgrade
- [ ] Consider self-hosting for large scale
- [ ] Implement queue for photo analysis 🆕
- [ ] Add worker threads for bulk operations 🆕

---

## 🔄 MIGRATION FROM v1 to v2.1

If upgrading from previous version:

### 1. Create New Collection
```sql
-- Add photo_analysis collection
-- See COLLECTION 7 above
```

### 2. Create New Bucket
```sql
-- Add meal-photos bucket
-- See BUCKET 3 above
```

### 3. Update Environment Variables
```env
# Add to .env
EXPO_PUBLIC_OPENROUTER_API_KEY=your-key-here
```

### 4. Update Code
- Replace old photo upload logic with `PhotoUploadService`
- Integrate `photoSyncStrategy` for AI analysis
- Update `cameraService.ts` with new flow

### 5. Test Migration
- [ ] Old scans still accessible
- [ ] New photo analysis working
- [ ] No data loss
- [ ] Sync queue functioning

---

## 📊 MONITORING DASHBOARD

### Key Metrics to Track

**Appwrite:**
- Total users
- Daily active users
- Storage usage (especially meal-photos)
- Database requests/day
- Failed requests

**Photo Analysis:** 🆕
- Total photos analyzed
- Average processing time
- Success rate
- Failed analyses
- OpenRouter API costs

**Sync Queue:** 🆕
- Pending photos
- Pending scans
- Failed sync attempts
- Retry success rate

### Sample Monitoring Query
```typescript
// Get photo analysis stats
const stats = await databases.listDocuments(
  DATABASE_ID,
  COLLECTIONS.PHOTO_ANALYSIS,
  [
    Query.equal('status', 'completed'),
    Query.greaterThan('createdAt', lastWeek),
  ]
);

console.log({
  total: stats.total,
  avgConfidence: stats.documents.reduce((sum, d) => 
    sum + d.confidence, 0) / stats.total,
  avgProcessingTime: stats.documents.reduce((sum, d) => 
    sum + d.processingTime, 0) / stats.total,
});
```

---

## 🎉 SETUP COMPLETE!

You're now ready to:
1. ✅ Run aplikasi dengan Appwrite backend
2. ✅ Upload & analyze meal photos with AI 🆕
3. ✅ Sync data offline-first with background queue 🆕
4. ✅ Test semua API functions
5. ✅ Deploy ke production

**New in v2.1:**
- Photo analysis dengan GPT-4 Vision
- Offline-first photo capture
- Background AI processing
- Detailed analysis logging

Good luck! 🚀

---

## 📖 ADDITIONAL RESOURCES

- [Appwrite Documentation](https://appwrite.io/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [GPT-4 Vision Guide](https://platform.openai.com/docs/guides/vision)
- [React Native Best Practices](https://reactnative.dev/docs/getting-started)

---

**Last Updated**: v2.1 - February 2026
**Changelog**:
- Added `photo_analysis` collection
- Added `meal-photos` storage bucket
- Added OpenRouter API integration
- Updated environment variables
- Added photo analysis testing guide