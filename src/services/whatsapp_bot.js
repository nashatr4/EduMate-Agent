// src/services/whatsapp_bot.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('../coreAgent'); 

const client = new Client({
    authStrategy: new LocalAuth({
        // Tentukan folder untuk menyimpan cache sesi
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
            // Abaikan pesan dari status atau grup (jika tidak diinginkan)
            if (msg.from === 'status@broadcast' || msg.isStatus) {
                return;
            }

            // 'handleMessage' akan mengembalikan balasan (string) atau undefined (jika PDF)
            const replyText = await handleMessage(msg); 

            // 2. Kirim balasan JIKA 'replyText' ada isinya
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