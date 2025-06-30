# SnapConnect

**Share Moments. Disappear. Discover More.**

A modern Snapchat clone built with React Native and Expo, featuring real-time messaging, ephemeral content, and AI-powered activity suggestions.

## 🚀 Features

### ✅ Currently Implemented
- **User Authentication** - Sign up/login with Supabase Auth
- **Camera Integration** - Photo capture with real-time camera functionality
- **Stories** - 24-hour story sharing and viewing with caption generation
- **Friend System** - Add friends, manage connections, friend requests
- **Real-time Chat** - One-on-one messaging with message history
- **Group Chat** - Multi-user group messaging with AI activity suggestions
- **Profile Management** - User profiles with photos, display names, and bio
- **AI Activity Suggestions** - RAG-powered activity recommendations for group chats
- **Onboarding System** - Guided tour for new users
- **Theme Support** - Light/dark mode with consistent styling
- **Responsive Design** - Optimized for various screen sizes

### 🎯 AI-Powered Features (Active)
- **Activity Recommendations** - AI suggests group activities based on:
  - User interests and past activities
  - Friend relationships and shared experiences
  - Recent messages and context
  - Mood and activity type preferences
- **RAG Integration** - Retrieval-Augmented Generation for personalized suggestions
- **Context-Aware Suggestions** - Activities tailored to group dynamics

## 🛠 Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI**: OpenAI GPT-4 with RAG implementation
- **Media**: Expo Camera, Image Picker
- **Real-time**: Supabase Realtime subscriptions

## 🏗 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- Supabase Project

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

3. **Configure Supabase**
   - Create a new Supabase project
   - Copy your Supabase URL and anon key to `supabase.config.js`
   - Run the database migrations from the `supabase-*.sql` files
   - Deploy the Edge Functions from `supabase/functions/`

4. **Start the development server**
   ```bash
   npx expo start --dev-client
   ```

5. **Run on device/simulator**
   - Scan QR code with Expo Go or development build

## 🗄 Database Schema

### Supabase Tables
```sql
users/
  - id: uuid (primary key)
  - email: string
  - username: string (unique)
  - display_name: string
  - profile_picture: string
  - bio: string
  - onboarding_completed: boolean
  - created_at: timestamp

friendships/
  - user_id: uuid (foreign key)
  - friend_id: uuid (foreign key)
  - status: enum ('pending', 'accepted', 'blocked')
  - created_at: timestamp

messages/
  - id: bigint (primary key)
  - sender_id: uuid (foreign key)
  - recipient_id: uuid (foreign key)
  - content: text
  - message_type: enum ('text', 'image', 'video')
  - created_at: timestamp
  - deleted_at: timestamp

group_chats/
  - id: uuid (primary key)
  - name: string
  - description: text
  - creator_id: uuid (foreign key)
  - member_ids: uuid[] (array)
  - created_at: timestamp

stories/
  - id: uuid (primary key)
  - user_id: uuid (foreign key)
  - media_url: string
  - media_type: enum ('image', 'video')
  - caption: text
  - views: uuid[] (array)
  - created_at: timestamp
```

## 🤖 AI Features Implementation

### RAG System Architecture
- **Edge Functions**: Supabase Edge Functions for AI processing
- **Vector Embeddings**: User interests and activity data
- **Context Retrieval**: Friend relationships, message history, past activities
- **OpenAI Integration**: GPT-4 for natural language generation
- **Fallback System**: Predefined suggestions when AI is unavailable

### Activity Suggestion Categories
- **Hangout** 🏠 - Casual indoor activities
- **Adventure** 🗺️ - Outdoor and exploration activities  
- **Creative** 🎨 - Arts, crafts, and creative projects
- **Food** 🍕 - Dining and culinary experiences
- **Entertainment** 🎬 - Movies, games, and entertainment

## 🎯 Target Audience

**Social Connectors** - Friend groups who want intelligent activity suggestions and ephemeral content sharing with features like:
- AI-powered activity recommendations for group hangouts
- Context-aware suggestions based on group dynamics
- Easy story sharing with smart caption generation
- Real-time group messaging with activity planning

## 📝 Development Status

### ✅ Completed Features
- User authentication and profile management
- Camera functionality and story creation
- Real-time one-on-one messaging
- Group chat with member management
- Friend system with requests
- AI activity suggestion system with RAG
- Onboarding flow for new users
- Theme system with accessibility improvements
- Profile picture upload and management

### 🔄 Current Limitations
- Camera only supports photos (video recording not implemented)
- Stories don't auto-expire after 24 hours
- Push notifications not implemented
- Advanced camera filters not available
- Message reactions not implemented

### 🎯 Future Enhancements
- Video recording and playback
- Advanced camera filters and effects
- Push notification system
- Message reactions and replies
- Story highlights and archives
- Enhanced AI features (smart captions, memory prompts)

## 🚀 Deployment

### Supabase Edge Functions
```bash
# Deploy AI functions
npx supabase functions deploy activity-generator
npx supabase functions deploy group-member-recommender
npx supabase functions deploy group-details-recommender
```

### Expo Deployment
```bash
# Build for production
npx expo build:android
npx expo build:ios

# Publish updates
npx expo publish
```

## 🧪 Testing

The app includes test users for development:
- **Alice Cooper**: `alice.cooper@test.com` / `password123`
- **Bob Wilson**: `bob.wilson@test.com` / `password123`
- **Charlie Brown**: `charlie.brown@test.com` / `password123`

## 📊 Performance Considerations

- Optimized image handling with Expo Image Picker
- Efficient Supabase queries with proper indexing
- Real-time subscription management
- Memory-conscious media handling
- Responsive UI with proper loading states

## 🔐 Security & Privacy

- Supabase Row Level Security (RLS) policies
- Secure file upload to Supabase Storage
- User data encryption at rest
- Privacy-focused ephemeral messaging
- Secure AI processing with Edge Functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- Developer: Mustafa Chaudheri
- Project Type: RAG-Enhanced Social Media Platform
- Focus: AI-powered social connections and activity recommendations

---

**Built with ❤️ for connecting friends through intelligent, ephemeral moments.**