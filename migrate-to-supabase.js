#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const MIGRATION_CONFIG = {
  // Files to update
  filesToUpdate: [
    'App.js',
    'src/screens/AuthScreen.js',
    'src/screens/ChatsScreen.js',
    'src/screens/DiscoverScreen.js',
    'src/screens/HomeScreen.js',
    'src/screens/ProfileScreen.js',
    'src/screens/StoriesScreen.js',
    'src/screens/StoryViewScreen.js',
    'src/screens/CameraScreen.js',
    'src/screens/ChatScreen.js',
  ],
  
  // Store import replacements
  replacements: [
    {
      from: "import { useMockAuthStore as useAuthStore } from './src/stores/mockAuthStore';",
      to: "import { useSupabaseAuthStore as useAuthStore } from './src/stores/supabaseAuthStore';"
    },
    {
      from: "import { useMockAuthStore as useAuthStore } from '../stores/mockAuthStore';",
      to: "import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';"
    },
    {
      from: "import { useAuthStore } from '../stores/authStore';",
      to: "import { useSupabaseAuthStore as useAuthStore } from '../stores/supabaseAuthStore';"
    },
    {
      from: "import { useFriendStore } from '../stores/friendStore';",
      to: "import { useSupabaseFriendStore as useFriendStore } from '../stores/supabaseFriendStore';"
    },
    {
      from: "import { useSnapStore } from '../stores/snapStore';",
      to: "import { useSupabaseSnapStore as useSnapStore } from '../stores/supabaseSnapStore';"
    }
  ],

  // Backup directory
  backupDir: './backup-before-supabase-migration'
};

// Helper functions
function createBackup() {
  console.log('📁 Creating backup of current files...');
  
  if (!fs.existsSync(MIGRATION_CONFIG.backupDir)) {
    fs.mkdirSync(MIGRATION_CONFIG.backupDir, { recursive: true });
  }

  MIGRATION_CONFIG.filesToUpdate.forEach(file => {
    if (fs.existsSync(file)) {
      const backupPath = path.join(MIGRATION_CONFIG.backupDir, file);
      const backupDirPath = path.dirname(backupPath);
      
      if (!fs.existsSync(backupDirPath)) {
        fs.mkdirSync(backupDirPath, { recursive: true });
      }
      
      fs.copyFileSync(file, backupPath);
      console.log(`  ✅ Backed up: ${file}`);
    }
  });
}

function updateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  MIGRATION_CONFIG.replacements.forEach(replacement => {
    if (content.includes(replacement.from)) {
      content = content.replace(replacement.from, replacement.to);
      modified = true;
      console.log(`  ✅ Updated import in: ${filePath}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function updatePackageJson() {
  console.log('📦 Checking package.json for Supabase dependency...');
  
  const packageJsonPath = './package.json';
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.dependencies['@supabase/supabase-js']) {
      console.log('  ⚠️  @supabase/supabase-js not found in dependencies');
      console.log('  💡 Run: npm install @supabase/supabase-js');
    } else {
      console.log('  ✅ @supabase/supabase-js found in dependencies');
    }
  }
}

function checkSupabaseConfig() {
  console.log('⚙️  Checking Supabase configuration...');
  
  const configPath = './supabase.config.js';
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    
    if (content.includes('YOUR_SUPABASE_URL') || content.includes('YOUR_SUPABASE_ANON_KEY')) {
      console.log('  ⚠️  Supabase configuration contains placeholder values');
      console.log('  💡 Update supabase.config.js with your actual Supabase credentials');
    } else {
      console.log('  ✅ Supabase configuration appears to be set up');
    }
  } else {
    console.log('  ❌ supabase.config.js not found');
  }
}

function showMigrationSummary() {
  console.log('\n📋 MIGRATION SUMMARY');
  console.log('====================');
  console.log('✅ Files backed up to:', MIGRATION_CONFIG.backupDir);
  console.log('✅ Store imports updated to use Supabase');
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Update supabase.config.js with your Supabase credentials');
  console.log('2. Run the supabase-schema.sql in your Supabase dashboard');
  console.log('3. Create a "media" storage bucket in Supabase');
  console.log('4. Test your app: npm start');
  console.log('\n📚 Documentation: See SUPABASE_SETUP.md');
}

// Main migration function
function migrateToSupabase() {
  console.log('🚀 Starting Supabase Migration for SnapConnect');
  console.log('===============================================\n');

  // Step 1: Create backup
  createBackup();

  // Step 2: Update files
  console.log('\n🔄 Updating store imports...');
  let updatedFiles = 0;
  
  MIGRATION_CONFIG.filesToUpdate.forEach(file => {
    if (updateFile(file)) {
      updatedFiles++;
    }
  });

  console.log(`\n📊 Updated ${updatedFiles} files`);

  // Step 3: Check dependencies
  updatePackageJson();

  // Step 4: Check config
  checkSupabaseConfig();

  // Step 5: Show summary
  showMigrationSummary();
}

// Run migration if called directly
if (require.main === module) {
  migrateToSupabase();
}

module.exports = { migrateToSupabase }; 