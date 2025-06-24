# SnapConnect

**Share Moments. Disappear. Discover More.**

A modern Snapchat clone built with React Native and Expo, featuring real-time messaging, ephemeral content, and designed for future AI-powered features.

## 🚀 Features

### Core MVP Features
- **User Authentication** - Sign up/login with Firebase Auth
- **Camera Integration** - Photo/video capture with filters
- **Ephemeral Messaging** - Disappearing snaps with customizable timers
- **Stories** - 24-hour story sharing and viewing
- **Friend System** - Add friends, manage connections
- **Real-time Chat** - Live messaging and snap delivery
- **Profile Management** - User profiles with stats and settings

### Coming Soon - AI Features
- **Smart Caption Suggestions** - AI-generated captions based on group dynamics
- **Activity Recommendations** - Personalized group activity suggestions
- **Memory Prompts** - Story ideas based on shared experiences
- **Event Reminders** - Intelligent notifications for friend milestones

## 🛠 Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Backend**: Firebase (Auth, Firestore, Storage, Realtime Database)
- **Media**: Expo Camera, AV
- **Animations**: React Native Reanimated

## 📱 Screenshots

[Screenshots will be added here]

## 🏗 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- Firebase Project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SnapConnect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a new Firebase project
   - Enable Authentication, Firestore, Storage, and Realtime Database
   - Copy your Firebase config to `firebase.config.js`
   - Update the configuration object with your project details

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - For iOS: Press `i` or scan QR code with Expo Go
   - For Android: Press `a` or scan QR code with Expo Go

## 🔧 Firebase Setup

### Required Firebase Services
1. **Authentication** - Email/Password provider
2. **Firestore Database** - Document storage for users, friends, etc.
3. **Storage** - Media file storage for snaps and stories
4. **Realtime Database** - Live messaging and presence

### Firestore Collections Structure
```
users/
  - userId/
    - username: string
    - displayName: string
    - email: string
    - friends: array
    - snapchatScore: number
    - profilePicture: string
    - bio: string
    - createdAt: timestamp

snaps/
  - snapId/
    - senderId: string
    - recipientId: string
    - mediaUrl: string
    - mediaType: 'image' | 'video'
    - caption: string
    - timer: number
    - opened: boolean
    - createdAt: timestamp

stories/
  - storyId/
    - userId: string
    - mediaUrl: string
    - mediaType: 'image' | 'video'
    - caption: string
    - views: array
    - expiresAt: timestamp
    - createdAt: timestamp
```

## 🎯 Target Audience

**Social Connectors** - Users focused on sharing moments and maintaining friendships, specifically friend groups who want:
- Fun, relevant captions for group photos
- Personalized story prompts about hangouts
- Activity recommendations based on shared interests
- Intelligent reminders for group events
- Content suggestions matching group humor and style

## 🔮 Future RAG Implementation

The app is architected to support RAG (Retrieval-Augmented Generation) features:

### User Stories for AI Features
1. **Smart Captions**: AI suggests fun, relevant captions for group photos based on shared memories and inside jokes
2. **Story Prompts**: Personalized story ideas about recent hangouts or upcoming plans
3. **Activity Suggestions**: Group activity recommendations based on past experiences and seasonal trends
4. **Content Intelligence**: AI-generated suggestions aligned with group's favorite topics and humor style
5. **Event Intelligence**: Smart reminders and post suggestions for friend group milestones
6. **Discovery**: Recommendations for new content/events matching group sharing patterns

### Technical Implementation Ready
- User behavior tracking hooks in place
- Content analysis preparation
- Friendship graph data collection
- Engagement pattern storage
- Context-aware data structures

## 📝 Development Status

### ✅ Completed (MVP)
- User authentication and profiles
- Camera functionality with basic filters
- Real-time snap sharing
- Ephemeral messaging system
- Stories with 24-hour expiration
- Friend management system
- Chat interface
- Profile management

### 🔄 In Progress
- Advanced camera filters
- Group messaging
- Push notifications
- Performance optimizations

### 🎯 Planned (RAG Phase)
- AI caption generation
- Personalized content recommendations
- Smart activity suggestions
- Memory-based story prompts
- Intelligent event reminders
- Advanced content discovery

## 🚀 Deployment

### Expo Deployment
```bash
# Build for production
npx expo build:android
npx expo build:ios

# Publish updates
npx expo publish
```

### Firebase Hosting (Web)
```bash
npx expo export:web
firebase deploy
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## 📊 Performance Considerations

- Image/video optimization for mobile
- Efficient Firebase queries with pagination
- Real-time listener management
- Memory management for media content
- Offline capability preparation

## 🔐 Security & Privacy

- Firebase Security Rules implemented
- User data encryption
- Media file access control
- Privacy-focused design
- GDPR compliance ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- Developer: [Your Name]
- Project Type: RAG-Enhanced Social Media Platform
- Target: Social Connectors focusing on friend group interactions

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact: [your-email@example.com]

---

**Built with ❤️ for connecting friends through intelligent, ephemeral moments.**