# SnapConnect

**Share Moments. Connect with Friends.**

A modern social messaging app built with React Native and Expo, powered by Supabase. It features real-time messaging, ephemeral content, and a user-friendly interface for connecting with friends.

## 🚀 Core Features

- **Real-Time Chat**: Instant one-on-one and group messaging.
- **Ephemeral Messages**: Send disappearing messages with customizable timers for privacy.
- **User Authentication**: Secure sign-up and login using Supabase Auth.
- **Friend System**: Easily find, add, and manage friends.
- **User Profiles**: Manage your profile information and view friends' profiles.
- **Story Sharing**: Share 24-hour stories with your friends.
- **Discover**: Find new friends to connect with.
- **Group Chat**: Create and manage group conversations.
- **Theming**: Switch between light and dark modes.

## 🌟 User Stories

As a user of SnapConnect, I want to:

- **Create an account** so I can start connecting with friends.
- **Log in securely** to access my conversations and profile.
- **Find and add friends** by searching for their username.
- **Accept friend requests** to start new conversations.
- **Send and receive messages in real-time** for seamless communication.
- **Send ephemeral messages** that disappear after a set time for added privacy.
- **Create group chats** to talk with multiple friends at once.
- **Share daily moments** through 24-hour stories.
- **Customize my profile** with a display name and bio.
- **Switch between light and dark themes** for comfortable viewing.

## 🛠 Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Media**: Expo Camera, Expo AV

## 🏗 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI
- Supabase Project

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd SnapConnect
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Supabase:**
    - Create a new Supabase project.
    - Set up your database schema using the SQL files in the `supabase/migrations` directory.
    - Add your Supabase URL and Anon Key to a `supabase.config.js` file.

4.  **Start the development server:**
    ```bash
    npx expo start --dev-client
    ```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a Pull Request.

---

**Built with ❤️ for connecting friends through intelligent, ephemeral moments.**