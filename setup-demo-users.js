// setup-demo-users.js
// Run this script ONCE to create demo users in Supabase
// Usage: node setup-demo-users.js

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual credentials
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key-here';

// Initialize Supabase Admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Define demo users
const demoUsers = [
  {
    email: 'manager.dummy@loganfreights.co.za',
    password: 'Demo123!',
    email_confirm: true,
    user_metadata: { 
      full_name: 'Sarah Manager',
      role: 'manager' 
    }
  },
  {
    email: 'employee.dummy@loganfreights.co.za',
    password: 'Demo123!',
    email_confirm: true,
    user_metadata: { 
      full_name: 'John Driver',
      role: 'employee' 
    }
  },
  {
    email: 'hr.dummy@loganfreights.co.za',
    password: 'Demo123!',
    email_confirm: true,
    user_metadata: { 
      full_name: 'Jane HR',
      role: 'hr' 
    }
  },
  {
    email: 'admin.dummy@loganfreights.co.za',
    password: 'Demo123!',
    email_confirm: true,
    user_metadata: { 
      full_name: 'System Admin',
      role: 'admin' 
    }
  }
];

// Create users function
async function createDemoUsers() {
  console.log('🚀 Starting demo user creation...\n');

  for (const user of demoUsers) {
    try {
      console.log(`Creating user: ${user.email}`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: user.email_confirm,
        user_metadata: user.user_metadata
      });

      if (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      } else {
        console.log(`✅ Successfully created ${user.email}`);
        console.log(`   User ID: ${data.user.id}`);
        console.log(`   Role: ${user.user_metadata.role}\n`);
      }
    } catch (err) {
      console.error(`❌ Exception for ${user.email}:`, err.message);
    }
  }

  console.log('✨ Demo user creation completed!');
  console.log('\n📋 Demo Credentials:');
  console.log('All users have password: Demo123!');
  console.log('-----------------------------------');
  demoUsers.forEach(user => {
    console.log(`${user.user_metadata.role.toUpperCase()}: ${user.email}`);
  });
}

// Run the script
createDemoUsers()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
