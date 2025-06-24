// Test Users for SnapConnect
// Run this script to create test users in your Supabase database

import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUsers = [
  {
    email: 'alice.cooper@test.com',
    password: 'password123',
    username: 'alice_cooper',
    displayName: 'Alice Cooper'
  },
  {
    email: 'bob.wilson@test.com',
    password: 'password123',
    username: 'bob_wilson',
    displayName: 'Bob Wilson'
  },
  {
    email: 'charlie.brown@test.com',
    password: 'password123',
    username: 'charlie_brown',
    displayName: 'Charlie Brown'
  }
];

async function createTestUsers() {
  console.log('Creating test users...');
  
  for (const user of testUsers) {
    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (authError) {
        console.error(`Error creating auth for ${user.email}:`, authError.message);
        continue;
      }

      if (authData.user) {
        // Create user profile using the secure function
        const { error: profileError } = await supabase.rpc('create_user_profile', {
          user_id: authData.user.id,
          user_email: user.email,
          user_username: user.username,
          user_display_name: user.displayName
        });

        if (profileError) {
          console.error(`Error creating profile for ${user.email}:`, profileError.message);
        } else {
          console.log(`✅ Created user: ${user.displayName} (@${user.username})`);
        }
      }
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error.message);
    }
  }
  
  console.log('Test user creation complete!');
}

// Instructions for manual creation via Supabase Dashboard
console.log(`
=== MANUAL SETUP INSTRUCTIONS ===

If you prefer to create test users manually, follow these steps:

1. Go to your Supabase Dashboard > Authentication > Users
2. Click "Add user" for each test user
3. Create users with these credentials:

User 1:
- Email: alice.cooper@test.com
- Password: password123
- Confirm: Yes

User 2:
- Email: bob.wilson@test.com  
- Password: password123
- Confirm: Yes

User 3:
- Email: charlie.brown@test.com
- Password: password123
- Confirm: Yes

4. Then run this SQL in your Supabase SQL Editor to add their profiles:

INSERT INTO users (id, email, username, display_name, created_at) VALUES
((SELECT id FROM auth.users WHERE email = 'alice.cooper@test.com'), 'alice.cooper@test.com', 'alice_cooper', 'Alice Cooper', NOW()),
((SELECT id FROM auth.users WHERE email = 'bob.wilson@test.com'), 'bob.wilson@test.com', 'bob_wilson', 'Bob Wilson', NOW()),
((SELECT id FROM auth.users WHERE email = 'charlie.brown@test.com'), 'charlie.brown@test.com', 'charlie_brown', 'Charlie Brown', NOW())
ON CONFLICT (id) DO NOTHING;

=== END MANUAL SETUP ===
`);

// Uncomment the line below and add your Supabase credentials to run automatically
// createTestUsers(); 