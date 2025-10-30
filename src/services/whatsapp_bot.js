// src/services/whatsapp_bot.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('../coreAgent'); // Path ini sudah benar

// --- BATAS WAKTU PESAN (DALAM DETIK) ---
// Bot akan mengabaikan pesan yang lebih lama dari batas ini
const PESAN_MAKSIMAL_TUA_DETIK = 45; // 

const client = new Client({
    authStrategy: new LocalAuth({
        // Path '.wwebjs_cache' akan membuat folder cache di root proyekmu
        dataPath: '.wwebjs_cache' 
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

async function initialize() {
    console.log('[WhatsApp] Inisialisasi klien...');

    client.on('qr', (qr) => {
        console.log('[QR] Pindai kode QR ini dengan WhatsApp Anda:');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('✅ [WhatsApp] Klien terhubung dan siap!');
    });

    client.on('authenticated', () => {
        console.log('✅ [WhatsApp] Berhasil terautentikasi.');
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ [WhatsApp] Gagal autentikasi:', msg);
        process.exit(1); // Keluar dari aplikasi jika autentikasi gagal
    });

    // Event listener utama untuk pesan masuk
    client.on('message', async (msg) => {
        try {
            // Filter 1: Abaikan pesan dari status
            if (msg.from === 'status@broadcast' || msg.isStatus) {
                return;
            }

            // --- ⬇️ INI PERBAIKANNYA ⬇️ ---
            // Filter 2: Abaikan pesan lama (yang masuk saat bot offline)
            const nowInSeconds = Date.now() / 1000;
            const messageTimestamp = msg.timestamp; // msg.timestamp sudah dalam detik

            if (messageTimestamp && (nowInSeconds - messageTimestamp > PESAN_MAKSIMAL_TUA_DETIK)) {
                console.warn(`[WhatsApp] 💬 Mengabaikan pesan lama dari ${msg.from} (terkirim ${Math.floor(nowInSeconds - messageTimestamp)} detik lalu).`);
                return; // Berhenti di sini, jangan proses pesan ini
            }
            // --- ⬆️ AKHIR PERBAIKAN ⬆️ ---

            // 'handleMessage' akan mengembalikan balasan (string) atau undefined
            const replyText = await handleMessage(msg); 

            // Kirim balasan JIKA 'replyText' ada isinya
            if (replyText) {
                await msg.reply(replyText);
            }

        } catch (error) {
            console.error(`❌ [WhatsApp] Gagal memproses pesan: ${error.message}`);
            try {
                // Balas ke user jika terjadi error
                await msg.reply('Maaf, terjadi kesalahan internal saat memproses permintaan Anda.');
            } catch (replyError) {
                console.error(`❌ [WhatsApp] Gagal mengirim balasan error: ${replyError.message}`);
            }
        }
    });

    // Mulai koneksi
    try {
        await client.initialize();
    } catch (error) {
        console.error(`❌ [WhatsApp] Gagal inisialisasi: ${error.message}`);
    }
}

// Ekspor fungsi initialize agar bisa dipanggil oleh app.js
module.exports = { initialize };