// src/services/env.js
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs'); // Tambahkan fs

console.log('--- 🚀 [Env] Memulai pemuatan .env ---');

const envPath = path.resolve(__dirname, '../../.env');
console.log(`ℹ️  [Env] Mencari .env di: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log('✅ [Env] File .env DITEMUKAN.');
} else {
  console.error('❌ [Env] File .env TIDAK DITEMUKAN di path itu!');
}

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ [Env] Gagal memuat dotenv! Error: ${result.error.message}`);
} else {
  console.log('✅ [Env] dotenv berhasil dimuat.');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    console.log('✅ [Env Debug] OPENAI_API_KEY DITEMUKAN.');
  } else {
    console.warn('⚠️ [Env Debug] "OPENAI_API_KEY" TIDAK DITEMUKAN di process.env!');
    console.warn('   (Cek ejaan di file .env)');
  }
}
if (result.error) {
  console.error(`❌ [Env] Gagal memuat dotenv! Error: ${result.error.message}`);
} else {
  console.log('✅ [Env] dotenv berhasil dimuat.');
  
  // Cek OpenAI Key
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    console.log('✅ [Env Debug] OPENAI_API_KEY DITEMUKAN.');
  } else {
    console.warn('⚠️ [Env Debug] "OPENAI_API_KEY" TIDAK DITEMUKAN di process.env!');
    console.warn('   (Cek ejaan di file .env)');
  }
  
  // Cek MongoDB key
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    console.log('✅ [Env Debug] MONGODB_URI DITEMUKAN.');
  } else {
    console.warn('⚠️ [Env Debug] "MONGODB_URI" TIDAK DITEMUKAN di process.env!');
  }
}
console.log('--- ⏹️  [Env] Selesai ---');