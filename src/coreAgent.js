const { OpenAI } = require('openai');
const memory = require('./memory'); 
const pdfReader = require('./pdfReader'); 

// Inisialisasi OpenAI (mengambil dari .env)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// SYSTEM_PROMPT kamu
const SYSTEM_PROMPT = `Kamu adalah "EduMate", asisten belajar mahasiswa yang cerdas dan ramah. 
Tugasmu adalah:
1. Menjelaskan konsep kuliah yang sulit dengan bahasa sederhana dan analogi.
2. Memberikan contoh soal dan jawaban jika diminta.
3. Jika pengguna bilang "jelaskan lagi" atau "lebih mudah", gunakan analogi yang berbeda.
4. Jaga jawaban agar tetap ringkas dan fokus pada materi akademik. Tolak membahas topik di luar edukasi dengan sopan.
5. Jika pengguna memberikanmu teks dari sebuah dokumen (biasanya ditandai dengan [AWAL DOKUMEN]), tugas utamamu adalah menjawab pertanyaan pengguna HANYA berdasarkan informasi dari dokumen tersebut. Jelaskan, ringkas, atau terjemahkan sesuai permintaan.`;


async function handleMessage(msgOrUserId, userMessageString) {
    
    let userId = '';
    let userMessage = '';
    let isWhatsApp = false;
    let whatsAppMsgObject = null;
    let storedPdfText = ''; 

    if (typeof msgOrUserId === 'object' && msgOrUserId !== null && msgOrUserId.from) {
        // --- FORMAT 1: INPUT DARI WHATSAPP ---
        isWhatsApp = true;
        whatsAppMsgObject = msgOrUserId; 
        userId = whatsAppMsgObject.from;
        userMessage = whatsAppMsgObject.body || ''; 
        storedPdfText = memory.getPdfText(userId); 

        // // Cetak log debug (bisa kamu hapus nanti jika sudah normal)
        // console.log('[Agent Debug] MENERIMA OBJEK PESAN MENTAH DARI WA:');
        // console.log(JSON.stringify(whatsAppMsgObject, null, 2));


        // --- LOGIKA PDF DIPERBAIKI ---
        // Kita cek '._data.mimetype' bukan 'mimetype'
        if (whatsAppMsgObject.hasMedia && 
            whatsAppMsgObject.type === 'document' && 
            whatsAppMsgObject._data.mimetype === 'application/pdf') {
            
            console.log(`[Agent] PDF DITEMUKAN! (Caption: "${userMessage}") dari ${userId}...`);
            try {
                await whatsAppMsgObject.reply('📄 PDF diterima. Sedang memproses isinya...');
                
                const newPdfText = await handlePdfUpload(whatsAppMsgObject, userId);
                storedPdfText = newPdfText; // Simpan teks PDF untuk giliran ini
                
                await whatsAppMsgObject.reply('✅ Dokumen berhasil dibaca!');
            
            } catch (pdfError) {
                console.error(`❌ [Agent] Gagal memproses PDF: ${pdfError.message}`);
                await whatsAppMsgObject.reply('Maaf, saya gagal membaca file PDF itu. Coba kirim ulang.');
                return; // Hentikan jika PDF gagal dibaca
            }
            // Lanjut ke pemrosesan teks (untuk caption)
        }

    } else if (typeof msgOrUserId === 'string' && typeof userMessageString === 'string') {
        // --- FORMAT 2: INPUT DARI CLI ---
        isWhatsApp = false;
        userId = msgOrUserId;
        userMessage = userMessageString;
        storedPdfText = memory.getPdfText(userId); 
    } else {
        console.error('Format handleMessage tidak dikenal:', msgOrUserId);
        return "Error: Format input tidak dikenal.";
    }

    // Cek perintah /reset
    if (userMessage.toLowerCase().trim() === '/reset') {
        memory.resetHistory(userId);
        console.log(`[Agent] Memori untuk ${userId} telah direset.`);
        return 'Memori percakapan dan PDF telah direset. Kita mulai dari awal ya!';
    }
    
    // Jika pesan teks kosong (misal user HANYA kirim PDF tanpa caption),
    // jangan panggil OpenAI.
    if (userMessage.trim() === '') {
        console.log(`[Agent] Pesan teks kosong. Tidak ada balasan.`);
        return; // Mengembalikan 'undefined'
    }

    // === PROSES PESAN TEKS ===
    console.log(`[Agent] Memproses teks dari ${userId}: "${userMessage}"`);

    try {
        // if (isWhatsApp) whatsAppMsgObject.react('⏳'); // <-- BARIS INI DIMATIKAN (Penyebab Crash)

        const chatHistory = memory.getHistory(userId);

        let messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistory 
        ];

        let userPromptForThisTurn = '';
        if (storedPdfText) {
            // Jika ada PDF (baik dari memori atau yg baru diupload)
            console.log(`[Agent] Menjawab ${userId} dengan konteks PDF.`);
            userPromptForThisTurn = `
            Berikut adalah isi dokumen yang saya berikan:
            ---[ AWAL DOKUMEN ]---
            ${storedPdfText}
            ---[ AKHIR DOKUMEN ]---

            Berdasarkan dokumen di atas, tolong jawab pertanyaan saya: 
            "${userMessage}"
            `;
        } else {
            // PDF tidak ada, user cuma tanya
            console.log(`[Agent] Menjawab ${userId} tanpa konteks PDF.`);
            userPromptForThisTurn = userMessage;
        }
        
        messages.push({ role: 'user', content: userPromptForThisTurn });
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 1500
        });

        const aiResponse = completion.choices[0].message.content;
        
        memory.saveMessage(userId, 'user', userMessage); 
        memory.saveMessage(userId, 'assistant', aiResponse);

        // if (isWhatsApp) whatsAppMsgObject.react(''); // <-- BARIS INI DIMATIKAN

        return aiResponse; 

    } catch (apiError) {
        console.error(`❌ [Agent] Error dari OpenAI API: ${apiError.message}`);
        
        // if (isWhatsApp) whatsAppMsgObject.react('❌'); // <-- BARIS INI DIMATIKAN
        
        if (apiError.code === 'missing_key') {
             return 'Error: API Key OpenAI tidak ditemukan. Cek file .env kamu.';
        }
        return 'Maaf, saya sedang mengalami masalah koneksi ke server AI. Coba lagi nanti.';
    }
}

/**
 * Fungsi ini HANYA memproses PDF, menyimpannya, dan MENGEMBALIKAN teksnya.
 */
async function handlePdfUpload(msg, userId) {
    try {
        const media = await msg.downloadMedia();
        if (!media) throw new Error('Gagal mengunduh media.');
        
        // 'require' versi CJS yang stabil
        const pdf = require('pdf-parse'); 
        const pdfBuffer = Buffer.from(media.data, 'base64');
        const data = await pdf(pdfBuffer); // Seharusnya 'pdf' sudah menjadi fungsi

        if (!data || !data.text) {
             throw new Error('Gagal mengekstrak teks, file mungkin hanya berisi gambar.');
        }
        const pdfText = data.text;

        memory.savePdfText(userId, pdfText);
        console.log(`[Agent] PDF untuk ${userId} berhasil diproses (${pdfText.length} karakter).`);
        
        memory.resetHistory(userId); 
        console.log(`[Agent] Riwayat percakapan lama untuk ${userId} dihapus karena ada PDF baru.`);
        
        return pdfText;
        
    } catch (pdfError) {
        console.error(`[pdfReader] Gagal parse PDF: ${pdfError.message}`);
        throw new Error(`Gagal mengekstrak teks dari PDF. Error: ${pdfError.message}`);
    }
}

module.exports = { handleMessage };