-- Add onboarding_completed column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to show they haven't completed onboarding yet
-- This will trigger onboarding for existing users as well
UPDATE users 
SET onboarding_completed = FALSE 
WHERE onboarding_completed IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN users.onboarding_completed IS 'Tracks whether the user has completed the initial onboarding guide'; 