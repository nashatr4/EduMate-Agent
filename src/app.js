// src/app.js
const readline = require('readline'); // Modul bawaan Node.js
const { handleMessage } = require('./coreAgent');

// Buat antarmuka untuk baca input dari terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const USER_ID = "terminal-user"; // ID pengguna tetap untuk sesi ini

console.log("===== EduMate CLI Agent =====");
console.log("Mulai mengobrol dengan bot Anda.");
console.log("Ketik '/reset' untuk menghapus memori, atau '/exit' untuk keluar.\n");

// Fungsi untuk loop percakapan
function chatLoop() {
  // 1. Ajukan pertanyaan ke pengguna
  rl.question('Anda: ', async (userMessage) => {
    
    // 2. Cek perintah keluar
    if (userMessage.toLowerCase() === '/exit') {
      console.log("\nSampai jumpa!");
      rl.close();
      return; // Hentikan loop
    }

    // 3. Proses pesan ke Core Agent
    const botReply = await handleMessage(USER_ID, userMessage);

    // 4. Tampilkan balasan bot
    console.log(`EduMate: ${botReply}\n`);
    
    // 5. Ulangi loop
    chatLoop();
  });
}

// Mulai percakapan
chatLoop();