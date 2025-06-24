// Test Users Creation Script
// Use this to create multiple test accounts for testing messaging functionality

const testUsers = [
  {
    email: 'alice@test.com',
    password: 'password123',
    username: 'alice_test',
    displayName: 'Alice Test'
  },
  {
    email: 'bob@test.com', 
    password: 'password123',
    username: 'bob_test',
    displayName: 'Bob Test'
  },
  {
    email: 'charlie@test.com',
    password: 'password123', 
    username: 'charlie_test',
    displayName: 'Charlie Test'
  }
];

console.log('🧪 Test Users for SnapConnect:');
console.log('================================');

testUsers.forEach((user, index) => {
  console.log(`\n${index + 1}. ${user.displayName}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Password: ${user.password}`);
  console.log(`   Username: ${user.username}`);
});

console.log('\n📝 Instructions:');
console.log('1. Use these credentials to sign up for different test accounts');
console.log('2. Sign out and sign in with different accounts to test messaging');
console.log('3. Add each other as friends to test the friend system');
console.log('4. Send snaps between accounts to test messaging functionality');

module.exports = testUsers; 