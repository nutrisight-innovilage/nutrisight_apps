# 🚀 APPWRITE COMPLETE SETUP GUIDE (UPDATED)

## 📋 OVERVIEW

Panduan lengkap setup Appwrite backend untuk aplikasi Nutrition Tracking.
Updated berdasarkan **actual types** dan **fixed code**.

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
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
EXPO_PUBLIC_APPWRITE_DATABASE_ID=main
```

⚠️ **PENTING**: Ganti `your-project-id-here` dengan Project ID Anda!

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
   - **Type**: Key
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

**Permissions:**
```
✅ Read: User (document.userId == $userId)
⛔ Create: Functions only
⛔ Update: Functions only
⛔ Delete: Admin only
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

### ✅ BUCKET 3: `meal-photos`

**Settings:**
- **Bucket ID**: `meal-photos`
- **Name**: "Meal Photos"
- **Max file size**: 10485760 bytes (10MB)
- **Allowed extensions**: `jpg,jpeg,png`

**Permissions:**
```
✅ Read: User
✅ Create: User
✅ Update: User
✅ Delete: User
```

---

## STEP 8: Functions (Optional)

⚠️ **NOTE**: Functions require **Pro plan** and advanced setup.
Untuk development, skip dulu atau implement di client-side.

Jika ingin setup:

1. Sidebar → **"Functions"**
2. **"Create Function"**

### Function 1: `yolo-food-detection`
- Runtime: Python 3.9 / Node.js 18
- Timeout: 30s
- Memory: 512MB

### Function 2: `nutrition-calculator`
- Runtime: Node.js 18
- Timeout: 15s
- Memory: 256MB

### Function 3: `llm-nutrition-advice`
- Runtime: Node.js 18
- Timeout: 30s
- Memory: 512MB

### Function 4: `personalized-thresholds`
- Runtime: Node.js 18
- Timeout: 10s
- Memory: 256MB

---

## STEP 9: Test Connection

Buat file `test-appwrite.ts`:
```typescript
import { Client, Account, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('YOUR_PROJECT_ID'); // ⚠️ GANTI!

const account = new Account(client);
const databases = new Databases(client);

async function testConnection() {
  try {
    // Test 1: Health check
    console.log('Testing Appwrite connection...');
    
    // Test 2: List collections
    const collections = await databases.listCollections('main');
    console.log('✅ Collections found:', collections.total);
    
    // Test 3: Register test user
    const testUser = await account.create(
      'test123',
      'test@example.com',
      'password123',
      'Test User'
    );
    console.log('✅ Test user created:', testUser.name);
    
    // Clean up
    await account.deleteSession('current');
    
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

## ✅ VERIFICATION CHECKLIST

Setelah setup selesai, verify:

- [ ] Project created & Project ID copied
- [ ] Platform registered (React Native)
- [ ] SDK installed (`appwrite` package)
- [ ] `.env` file configured
- [ ] Database `main` created
- [ ] 6 collections created:
  - [ ] `users`
  - [ ] `menu_items`
  - [ ] `nutrition_scans`
  - [ ] `nutrition_goals`
  - [ ] `user_feedback`
  - [ ] `weekly_insights`
- [ ] 3 storage buckets created:
  - [ ] `profile-pictures`
  - [ ] `food-images`
  - [ ] `meal-photos`
- [ ] All attributes configured correctly
- [ ] All indexes created
- [ ] All permissions set
- [ ] Test connection successful

---

## 🚨 COMMON ISSUES

### Issue 1: "Project not found"
**Solution**: Check `.env` → `EXPO_PUBLIC_APPWRITE_PROJECT_ID`

### Issue 2: "Collection not found"
**Solution**: 
- Check collection ID (must be exact: `users`, not `Users`)
- Check database ID (must be `main`)

### Issue 3: "Unauthorized"
**Solution**: Check permissions in Appwrite Console

### Issue 4: "Invalid document structure"
**Solution**: 
- Check attribute types match code
- For `items` field: must be JSON string, not array
- For `goals` fields: must be JSON strings, not objects

### Issue 5: "Network request failed"
**Solution**: 
- Check internet connection
- Check Appwrite endpoint URL
- Check if using correct Cloud/Self-hosted endpoint

---

## 📚 NEXT STEPS

1. **Seed Initial Data**
   - Add sample menu items via Appwrite Console
   - Or create seed script

2. **Test APIs**
   - Test `authOnlineAPI.register()`
   - Test `authOnlineAPI.login()`
   - Test `MealOnlineAPI.analyzeMeal()`

3. **Monitor Usage**
   - Dashboard → "Usage"
   - Watch request counts
   - Watch storage usage

4. **Setup Monitoring**
   - Enable error logging
   - Setup alerts for rate limits
   - Monitor function executions (if using)

---

## 🎯 PRODUCTION CONSIDERATIONS

Before going to production:

1. **Security**
   - [ ] Review all permissions
   - [ ] Enable API key restrictions
   - [ ] Setup rate limiting
   - [ ] Enable 2FA for admin accounts

2. **Performance**
   - [ ] Setup CDN for Storage
   - [ ] Enable caching
   - [ ] Optimize queries with proper indexes
   - [ ] Monitor slow queries

3. **Backup**
   - [ ] Setup automated backups
   - [ ] Export data regularly
   - [ ] Test restore procedures

4. **Scaling**
   - [ ] Monitor usage metrics
   - [ ] Plan for Pro plan upgrade
   - [ ] Consider self-hosting for large scale

---

**Setup Complete! 🎉**

Anda sekarang siap untuk:
1. Run aplikasi dengan Appwrite backend
2. Test semua API functions
3. Deploy ke production

Good luck! 🚀