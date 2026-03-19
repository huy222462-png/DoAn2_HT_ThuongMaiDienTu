/**
 * Script tạo password hash cho admin và user
 * Chạy script này để lấy password hash thật
 */

const bcrypt = require('bcrypt');

async function generatePasswords() {
  console.log('Đang tạo password hash...\n');
  
  // Hash cho Admin@123
  const adminHash = await bcrypt.hash('Admin@123', 10);
  console.log('Admin Password Hash:');
  console.log('Password: Admin@123');
  console.log('Hash:', adminHash);
  console.log();
  
  // Hash cho User@123
  const userHash = await bcrypt.hash('User@123', 10);
  console.log('User Password Hash:');
  console.log('Password: User@123');
  console.log('Hash:', userHash);
  console.log();
  
  console.log('Copy các hash này và thay thế trong file database_script.sql');
}

generatePasswords();
