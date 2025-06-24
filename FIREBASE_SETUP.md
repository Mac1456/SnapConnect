# Firebase Setup for Expo Go

## ✅ What's Been Fixed

Your app has been converted back to use the **web Firebase SDK** which is compatible with Expo Go. Here's what was changed:

1. **Removed native Firebase dependencies** (`@react-native-firebase/app`, `@react-native-firebase/auth`)
2. **Added web Firebase SDK** (`firebase@9.6.11`)
3. **Updated authStore.js** to use web Firebase functions
4. **Cleaned up app.json** - removed native Firebase plugins and configurations
5. **Removed native config files** (GoogleService-Info.plist, google-services.json)

## 🔧 What You Need to Do

### Step 1: Get Your Firebase Web Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your SnapConnect project
3. Click the gear icon ⚙️ → Project Settings
4. Scroll down to "Your apps" section
5. If you don't have a web app, click "Add app" → Web (</>) icon
6. Register your app with name "SnapConnect Web"
7. Copy the `firebaseConfig` object

### Step 2: Update firebase.config.js

Replace the placeholder values in `firebase.config.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678"
};
```

### Step 3: Enable Authentication in Firebase

1. In Firebase Console, go to Authentication → Sign-in method
2. Enable "Email/Password" provider
3. Make sure Firestore Database is enabled (should already be from before)

### Step 4: Test Your App

```bash
npm start
```

Then scan the QR code with Expo Go - it should work now! 🎉

## 🚨 Important Notes

- **Expo Go Compatible**: Your app will now run in standard Expo Go
- **No Development Build Required**: You can share via QR code
- **Same Functionality**: All authentication features preserved
- **Web Firebase SDK**: Uses Firebase v9 modular SDK for better performance

## 🐛 If You Still Get Errors

1. **Clear Metro cache**: `npx expo start --clear`
2. **Clear npm cache**: `npm cache clean --force`
3. **Reinstall dependencies**: `rm -rf node_modules package-lock.json && npm install`
4. **Check Firebase config**: Make sure all values are correct and project exists

Your app should now work perfectly in Expo Go! 🚀 