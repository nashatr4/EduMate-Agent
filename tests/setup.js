// Beri nama file ini 'setup.js' dan letakkan di folder 'tests/'

const path = require('path');

console.log('--- [JEST SETUP] Memulai pemuatan .env.test ---');

// 1. Muat library dotenv
const result = require('dotenv').config({
  // 2. Tentukan path ke file .env.test di folder root
  path: path.resolve(process.cwd(), '.env.test')
});

// 3. Beri log debug untuk tahu berhasil atau tidak
if (result.error) {
  console.error('--- [JEST SETUP] GAGAL memuat .env.test:', result.error.message);
} else {
  console.log('--- [JEST SETUP] SUKSES memuat .env.test.');
  // Debug: Cek apakah URI-nya benar-benar terbaca
  console.log(`--- [JEST SETUP] MONGODB_URI: ${process.env.MONGODB_URI}`);
}