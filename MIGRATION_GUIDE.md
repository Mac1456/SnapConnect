# 🚀 SnapConnect: Firebase to Supabase Migration Guide

## Overview

This guide will help you migrate your SnapConnect app from Firebase to Supabase in just a few steps. Supabase offers better performance, more predictable pricing, and a superior developer experience.

## 📋 What You'll Get

### ✅ **Better Performance**
- PostgreSQL database (faster than Firestore for complex queries)
- Built-in connection pooling
- Advanced indexing and query optimization

### ✅ **Cost Efficiency**
- More generous free tier (500MB database, 1GB storage, 50MB file uploads)
- Predictable pricing structure
- No surprise bills from Firebase

### ✅ **Superior Developer Experience**
- SQL-based queries (more familiar than Firestore rules)
- Built-in API documentation
- Real-time subscriptions out of the box
- Integrated authentication and storage

## 🎯 Migration Steps

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Fill in project details:
   - **Name**: `SnapConnect`
   - **Database Password**: Use a strong password
   - **Region**: Choose closest to your users
4. Wait 2-3 minutes for project initialization

### Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **Anon Key** (starts with `eyJ`)

### Step 3: Update Configuration

Open `supabase.config.js` and replace the placeholder values:

```javascript
const supabaseUrl = 'https://your-project-ref.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Step 4: Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the entire contents of `supabase-schema.sql`
3. Click **Run** to create all tables and policies

### Step 5: Set Up Storage

1. Go to **Storage** in your Supabase dashboard
2. Click **New Bucket**
3. Name it `media`
4. Set it to **Public**
5. Click **Create Bucket**

### Step 6: Run Migration Script

Run the automated migration script:

```bash
node migrate-to-supabase.js
```

This will:
- ✅ Backup your current files
- ✅ Update all store imports to use Supabase
- ✅ Check your configuration
- ✅ Provide next steps

### Step 7: Test Your App

```bash
npm start
```

Test these features:
- ✅ User registration and login
- ✅ Profile updates
- ✅ Friend search and requests
- ✅ Camera and photo/video capture
- ✅ Snap sending and receiving
- ✅ Story creation and viewing

## 📊 Database Schema

Your new Supabase database will have these tables:

### `users`
- User profiles and authentication data
- Username, display name, bio, profile picture
- Snapchat score and friends list

### `friendships`
- Bidirectional friend relationships
- Efficient friend lookups

### `friend_requests`
- Pending friend requests
- Real-time notifications

### `snaps`
- Ephemeral messages with media
- Timer-based expiration
- Read receipts

### `stories`
- 24-hour expiring content
- View tracking
- Media storage

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Friends can see each other's public profiles
- Snaps are only visible to sender and recipient

### Authentication
- Built-in email/password authentication
- Session management
- Secure token handling

### Storage Security
- Authenticated uploads only
- Public read access for media
- User-specific folder permissions

## 🚀 Advanced Features

### Real-time Subscriptions
All tables support real-time updates:
- Friend requests appear instantly
- New snaps trigger notifications
- Story updates in real-time

### Custom Functions
Pre-built database functions:
- `get_friends_with_activity()` - Get friends sorted by recent activity
- `cleanup_expired_stories()` - Automatic story cleanup

### Performance Optimizations
- Database indexes on all frequently queried columns
- Connection pooling for better performance
- Optimized queries for mobile apps

## 🔄 Rollback Plan

If you need to rollback to Firebase:

1. Your original files are backed up in `./backup-before-supabase-migration/`
2. Copy files back from backup:
   ```bash
   cp -r backup-before-supabase-migration/* .
   ```
3. Ensure your Firebase configuration is still valid

## 📈 Performance Comparison

| Feature | Firebase | Supabase | Winner |
|---------|----------|----------|---------|
| Query Performance | Good | Excellent | 🟢 Supabase |
| Real-time Updates | Good | Excellent | 🟢 Supabase |
| Free Tier | 1GB storage | 500MB DB + 1GB storage | 🟢 Supabase |
| Pricing Predictability | Variable | Fixed | 🟢 Supabase |
| SQL Support | No | Yes | 🟢 Supabase |
| Learning Curve | Medium | Easy | 🟢 Supabase |

## 🛠️ Troubleshooting

### Common Issues

**"Invalid JWT" Error**
- Check that your Supabase URL and anon key are correct
- Ensure no extra spaces in configuration

**"Table doesn't exist" Error**
- Make sure you ran the complete `supabase-schema.sql`
- Check that all tables were created in the Supabase dashboard

**Storage Upload Fails**
- Verify the `media` bucket exists and is public
- Check storage policies are properly configured

**Real-time Not Working**
- Ensure realtime is enabled for your tables
- Check that your subscription code is correct

### Getting Help

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Join the [Supabase Discord](https://discord.supabase.com)
3. Review the migration logs for specific errors

## 📝 Migration Checklist

- [ ] Supabase project created
- [ ] Credentials copied to `supabase.config.js`
- [ ] Database schema applied (`supabase-schema.sql`)
- [ ] Storage bucket `media` created and set to public
- [ ] Migration script executed (`node migrate-to-supabase.js`)
- [ ] App tested and working
- [ ] All features verified (auth, friends, snaps, stories)

## 🎉 You're Done!

Congratulations! Your SnapConnect app is now running on Supabase with:

- ✅ Better performance and reliability
- ✅ More predictable costs
- ✅ Superior developer experience
- ✅ Real-time features out of the box
- ✅ Robust security with RLS
- ✅ Scalable PostgreSQL database

Your app is now ready for production deployment with a much more robust and cost-effective backend! 