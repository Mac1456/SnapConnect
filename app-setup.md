# SnapConnect - Quick Setup Guide

## Prerequisites
- Node.js (v16+)
- Expo CLI: `npm install -g @expo/cli`
- Firebase Account
- Phone with Expo Go app OR iOS/Android simulator

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: "SnapConnect" (or your preferred name)
3. Enable the following services:
   - **Authentication** (Email/Password)
   - **Firestore Database** (Start in test mode)
   - **Storage** (Start in test mode)
   - **Realtime Database** (Start in test mode)

### 3. Configure Firebase
1. In Firebase Console, go to Project Settings
2. Add a new Web app
3. Copy the config object
4. Update `firebase.config.js` with your actual values:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4. Set Up Firestore Security Rules
In Firestore Rules tab, replace with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read friends' basic info
    match /users/{userId} {
      allow read: if request.auth != null;
    }
    
    // Snaps - only sender and recipient can access
    match /snaps/{snapId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.senderId || 
         request.auth.uid == resource.data.recipientId);
    }
    
    // Stories - authenticated users can read, only owner can write
    match /stories/{storyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 5. Set Up Storage Rules
In Storage Rules tab:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 6. Start Development Server
```bash
npx expo start
```

### 7. Test on Device
- Download Expo Go app on your phone
- Scan the QR code from your terminal
- OR use iOS/Android simulator

## First Run Checklist

1. ✅ App loads without errors
2. ✅ Can create account (sign up)
3. ✅ Can sign in/out
4. ✅ Camera opens and can take photos
5. ✅ Can add friends by username search
6. ✅ Can send snaps to friends
7. ✅ Can create and view stories

## Troubleshooting

### Common Issues:

**"Firebase not configured"**
- Double-check your `firebase.config.js` file
- Ensure all Firebase services are enabled

**"Camera permission denied"**
- Make sure you're testing on a real device
- Allow camera permissions when prompted

**"Network error"**
- Check internet connection
- Verify Firebase project is active

**"User not found in search"**
- Make sure you're signed up with a username
- Try exact username match

### Testing With Friends
1. Share the Expo link with friends
2. All users need to create accounts
3. Search for each other by username
4. Send friend requests and accept them
5. Start sharing snaps and stories!

## Next Steps for RAG Implementation
This MVP is ready for RAG features. The app structure supports:
- User behavior tracking
- Content analysis
- Friendship graph data
- Engagement patterns
- Context-aware recommendations

## Support
- Check console logs for detailed error messages
- Common issues are usually Firebase configuration
- Ensure all required permissions are granted 