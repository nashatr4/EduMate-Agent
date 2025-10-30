// src/app.js (Versi Gabungan)

// 1. PANGGIL env.js PERTAMA KALI
// Ini akan memuat .env dan pesan debug dari file src/env.js
require('./services/env'); 
const { connectDB } = require('./database');

// 2. Cek apakah pengguna meminta mode CLI
// process.argv adalah array dari apa yang kamu ketik di terminal
// Contoh: ['node', 'src/app.js', '--cli']
const isCliMode = process.argv.includes('--cli');


async function startApp() {
    // Tunggu koneksi DB selesai
    await connectDB();

    // 4. Baru jalankan logikanya
    if (isCliMode) {
        // ===================================
        // === JALANKAN MODE TES CLI ===
        // ===================================
        console.log('🚀 [App] Memulai EduMate (Mode Tes CLI)...');
        
        const readline = require('readline');
        // ... (sisa kode CLI kamu) ...
        
        // ... (chatLoop(), dll)
        
    } else {
        // ===================================
        // === JALANKAN MODE WHATSAPP (DEFAULT) ===
        // ===================================
        console.log('🚀 [App] Memulai EduMate (Mode WhatsApp)...');
        
        // Impor bot WhatsApp
        const bot = require('./services/whatsapp_bot'); // <-- Pastikan path ini juga benar!
        
        // Jalankan bot
        bot.initialize();
    }
}

startApp();