-- Create Test Users for SnapConnect
-- Run this in your Supabase SQL Editor to create test users

-- First, create a function to properly create users with authentication
CREATE OR REPLACE FUNCTION public.create_test_user(
    email text,
    password text,
    username text,
    display_name text
) RETURNS uuid AS $$
DECLARE
    user_id uuid;
    encrypted_pw text;
BEGIN
    user_id := gen_random_uuid();
    encrypted_pw := crypt(password, gen_salt('bf'));
    
    -- Insert into auth.users
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, recovery_sent_at, last_sign_in_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', 
        email, encrypted_pw, NOW(), NOW(), NOW(), 
        '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), 
        '', '', '', ''
    );
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
        provider_id, user_id, identity_data, provider, 
        last_sign_in_at, created_at, updated_at
    ) VALUES (
        user_id, user_id, 
        format('{"sub":"%s","email":"%s"}', user_id::text, email)::jsonb, 
        'email', NOW(), NOW(), NOW()
    );
    
    -- Insert into users table (our app's user profile)
    INSERT INTO users (
        id, email, username, display_name, 
        profile_picture, bio, snapchat_score, friends, 
        created_at, updated_at
    ) VALUES (
        user_id, email, username, display_name,
        NULL, '', 0, '{}',
        NOW(), NOW()
    );
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the test users
DO $$
DECLARE
    alice_id uuid;
    bob_id uuid;
    charlie_id uuid;
BEGIN
    -- Create Alice Cooper
    alice_id := public.create_test_user(
        'alice.cooper@test.com', 
        'password123', 
        'alice_cooper', 
        'Alice Cooper'
    );
    
    -- Create Bob Wilson
    bob_id := public.create_test_user(
        'bob.wilson@test.com', 
        'password123', 
        'bob_wilson', 
        'Bob Wilson'
    );
    
    -- Create Charlie Brown
    charlie_id := public.create_test_user(
        'charlie.brown@test.com', 
        'password123', 
        'charlie_brown', 
        'Charlie Brown'
    );
    
    -- Create some friendships between test users
    INSERT INTO friendships (user_id, friend_id) VALUES
        (alice_id, bob_id),
        (bob_id, alice_id),
        (alice_id, charlie_id),
        (charlie_id, alice_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    RAISE NOTICE 'Test users created successfully!';
    RAISE NOTICE 'Alice Cooper ID: %', alice_id;
    RAISE NOTICE 'Bob Wilson ID: %', bob_id;
    RAISE NOTICE 'Charlie Brown ID: %', charlie_id;
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS public.create_test_user(text, text, text, text);

-- Verify the users were created
SELECT 
    au.email,
    u.username,
    u.display_name,
    u.id
FROM auth.users au
JOIN users u ON au.id = u.id
WHERE au.email LIKE '%@test.com'
ORDER BY au.email; 