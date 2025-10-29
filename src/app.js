// src/app.js (Versi Gabungan)

// 1. PANGGIL env.js PERTAMA KALI
// Ini akan memuat .env dan pesan debug dari file src/env.js
require('./env'); 

// 2. Cek apakah pengguna meminta mode CLI
// process.argv adalah array dari apa yang kamu ketik di terminal
// Contoh: ['node', 'src/app.js', '--cli']
const isCliMode = process.argv.includes('--cli');


// 3. Gunakan IF/ELSE untuk memutuskan mode
if (isCliMode) {
    // ===================================
    // === JALANKAN MODE TES CLI ===
    // ===================================
    console.log('🚀 [App] Memulai EduMate (Mode Tes CLI)...');
    
    const readline = require('readline');
    const { handleMessage } = require('./coreAgent'); 

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const USER_ID = "terminal-user"; 

    console.log("===== EduMate CLI Agent =====");
    console.log("Ketik '/reset' untuk menghapus memori, atau '/exit' untuk keluar.\n");

    async function chatLoop() {
      rl.question('Anda: ', async (userMessage) => {
        
        if (userMessage.toLowerCase() === '/exit') {
          console.log("\nSampai jumpa!");
          rl.close();
          return; 
        }

        const botReply = await handleMessage(USER_ID, userMessage); 
        console.log(`EduMate: ${botReply}\n`);
        chatLoop();
      });
    }
    
    chatLoop();

} else {
    // ===================================
    // === JALANKAN MODE WHATSAPP (DEFAULT) ===
    // ===================================
    console.log('🚀 [App] Memulai EduMate (Mode WhatsApp)...');
    
    // Impor bot WhatsApp
    const bot = require('./whatsapp_bot');
    
    // Jalankan bot
    bot.initialize();
}