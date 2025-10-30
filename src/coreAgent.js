// src/coreAgent.js
const { OpenAI } = require('openai');
const memory = require('./memory'); // Versi Mongoose (async)
const pdf = require('pdf-parse'); // Versi 1.1.1 (CJS)
const axios = require('axios'); // Untuk memanggil API eksternal

// Inisialisasi OpenAI (mengambil dari .env)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// SYSTEM_PROMPT kamu
const SYSTEM_PROMPT = `Kamu adalah "EduMate", asisten belajar mahasiswa yang cerdas dan ramah. 
Tugasmu adalah:
1. Menjelaskan konsep kuliah yang sulit dengan bahasa sederhana dan analogi.
2. Memberikan contoh soal dan jawaban jika diminta.
3. Jaga jawaban agar tetap ringkas dan fokus pada materi akademik.
4. Jika pengguna memberikanmu file (dokumen atau gambar), jawab pertanyaan HANYA berdasarkan file itu.
5. Kamu punya alat "cari_jurnal_akademik" untuk mencari paper/jurnal sungguhan dari internet. Saat menyajikan hasil, format dengan jelas: Judul, Penulis, Tahun, dan Link.
6. PENTING: Jika kamu memberikan link jurnal, prioritas utamamu adalah link PDF (jika tersedia), baru link halaman web jika PDF tidak ada.`;


// --- FUNGSI PENCARIAN JURNAL (DIPERBAIKI UNTUK LINK PDF) ---
async function runJournalSearch(query) {
    console.log(`[Tool] Menjalankan pencarian jurnal untuk: "${query}"`);
    
    // Nanti, aktifkan ini lagi jika API key sudah dapat
    // const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    // if (!apiKey) { ... }

    try {
        const response = await axios.get('https://api.semanticscholar.org/graph/v1/paper/search', {
            params: {
                query: query,
                limit: 5, // Ambil 5 jurnal teratas
                // --- ⬇️ PERUBAHAN DI SINI ⬇️ ---
                fields: 'title,authors,abstract,url,year,openAccessPdf' // Minta field PDF
            }
            // Hapus komen 'headers' ini jika API key sudah ada
            // headers: { 'x-api-key': apiKey } 
        });
        
        const papers = response.data.data || [];

        // --- ⬇️ PROSES HASILNYA AGAR LEBIH BERSIH ⬇️ ---
        const cleanResults = papers.map(paper => {
            // Logika baru untuk memilih link:
            // 1. Coba cari 'openAccessPdf.url' (link PDF langsung)
            // 2. Jika tidak ada, baru pakai 'url' (link halaman detail)
            const link = (paper.openAccessPdf && paper.openAccessPdf.url) 
                         ? paper.openAccessPdf.url 
                         : paper.url;

            return {
                title: paper.title,
                authors: paper.authors ? paper.authors.map(a => a.name).join(', ') : 'No authors listed',
                year: paper.year,
                abstract: paper.abstract ? paper.abstract.substring(0, 200) + '...' : 'No abstract available.', // Ringkas abstrak
                link: link // Gunakan link yang sudah kita pilih
            };
        });
        // --- ⬆️ AKHIR PERUBAHAN ⬆️ ---

        console.log('[Tool] Berhasil mengambil & memproses data dari Semantic Scholar.');
        // Kembalikan data yang sudah bersih
        return JSON.stringify(cleanResults); 

    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.warn('[Tool Error] Kena Rate Limit (429)! Coba lagi lebih pelan.');
            return JSON.stringify({ error: "Server pencarian sedang sibuk, coba lagi dalam beberapa detik." });
        }
        console.error(`[Tool Error] Gagal memanggil Semantic Scholar: ${error.message}`);
        return JSON.stringify({ error: `Gagal mengambil data: ${error.message}` });
    }
}
// --- AKHIR FUNGSI PENCARIAN JURNAL ---


// --- DEFINISI ALAT (TOOLS) UNTUK OPENAI ---
const tools = [
    {
        type: "function",
        function: {
            name: "cari_jurnal_akademik",
            description: "Mencari jurnal atau paper akademik dari internet berdasarkan kata kunci.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Kata kunci pencarian, misal 'manajemen industri' atau 'dampak AI pada manufaktur'",
                    },
                },
                required: ["query"],
            },
        },
    }
];
// --- AKHIR DEFINISI ALAT ---


async function handleMessage(msgOrUserId, userMessageString) {
    
    let userId = '';
    let userMessage = '';
    let isWhatsApp = false;
    let whatsAppMsgObject = null;
    
    let storedPdfText = ''; 
    let storedImage = null;

    if (typeof msgOrUserId === 'object' && msgOrUserId !== null && msgOrUserId.from) {
        // --- FORMAT 1: INPUT DARI WHATSAPP ---
        isWhatsApp = true;
        whatsAppMsgObject = msgOrUserId; 
        userId = whatsAppMsgObject.from;
        userMessage = whatsAppMsgObject.body || ''; 
        
        storedPdfText = await memory.getPdfText(userId); 
        storedImage = await memory.getImage(userId);

        // --- LOGIKA DETEKSI FILE (PDF ATAU GAMBAR) ---
        if (whatsAppMsgObject.hasMedia && whatsAppMsgObject.type === 'document' && whatsAppMsgObject._data.mimetype === 'application/pdf') {
            console.log(`[Agent] PDF DITEMUKAN! (Caption: "${userMessage}") dari ${userId}...`);
            try {
                await whatsAppMsgObject.reply('📄 PDF diterima. Sedang memproses isinya...');
                const newPdfText = await handlePdfUpload(whatsAppMsgObject, userId);
                storedPdfText = newPdfText; 
                storedImage = null; 
                await whatsAppMsgObject.reply('✅ Dokumen PDF berhasil dibaca!');
            } catch (pdfError) {
                console.error(`❌ [Agent] Gagal memproses PDF: ${pdfError.message}`);
                await whatsAppMsgObject.reply('Maaf, saya gagal membaca file PDF itu. Coba kirim ulang.');
                return; 
            }
        
        } else if (whatsAppMsgObject.hasMedia && (whatsAppMsgObject._data.mimetype === 'image/jpeg' || whatsAppMsgObject._data.mimetype === 'image/png' || whatsAppMsgObject._data.mimetype === 'image/webp')) {
            console.log(`[Agent] GAMBAR DITEMUKAN! (Caption: "${userMessage}") dari ${userId}...`);
            try {
                await whatsAppMsgObject.reply('🖼️ Gambar diterima. Sedang memproses...');
                const media = await whatsAppMsgObject.downloadMedia();
                if (!media) throw new Error('Gagal mengunduh media.');
                
                await memory.saveImage(userId, media.mimetype, media.data);
                storedImage = await memory.getImage(userId); 
                storedPdfText = null; 
                await whatsAppMsgObject.reply('✅ Gambar berhasil diterima!');
            } catch (imgError) {
                console.error(`❌ [Agent] Gagal memproses Gambar: ${imgError.message}`);
                await whatsAppMsgObject.reply('Maaf, saya gagal memproses gambar itu. Coba kirim ulang.');
                return;
            }
        }

    } else if (typeof msgOrUserId === 'string' && typeof userMessageString === 'string') {
        // --- FORMAT 2: INPUT DARI CLI ---
        isWhatsApp = false;
        userId = msgOrUserId;
        userMessage = userMessageString;
        storedPdfText = await memory.getPdfText(userId);
        storedImage = await memory.getImage(userId); 
    } else {
        console.error('Format handleMessage tidak dikenal:', msgOrUserId);
        return "Error: Format input tidak dikenal.";
    }

    // Cek perintah /reset
    if (userMessage.toLowerCase().trim() === '/reset') {
        await memory.resetHistory(userId);
        console.log(`[Agent] Memori untuk ${userId} telah direset.`);
        return 'Memori percakapan dan sesi telah direset. Kita mulai dari awal ya!';
    }
    
    if (userMessage.trim() === '') {
        console.log(`[Agent] Pesan teks kosong. Tidak ada balasan.`);
        return; 
    }

    // === PROSES PESAN TEKS (DENGAN LOGIKA TOOLS & VISION) ===
    console.log(`[Agent] Memproses teks dari ${userId}: "${userMessage}"`);

    try {
        const chatHistory = await memory.getHistory(userId);

        let messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistory 
        ];

        let userPromptForThisTurn = userMessage; 

        if (storedPdfText) {
            console.log(`[Agent] Menjawab ${userId} dengan konteks PDF.`);
            userPromptForThisTurn = `
            Konteks Dokumen: ---[ ${storedPdfText.substring(0, 3000)}... ]---
            Pertanyaan: "${userMessage}"`;
            messages.push({ role: 'user', content: userPromptForThisTurn });

        } else if (storedImage) {
            console.log(`[Agent] Menjawab ${userId} dengan konteks GAMBAR.`);
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: userPromptForThisTurn },
                    {
                        type: 'image_url',
                        image_url: { "url": `data:${storedImage.mimetype};base64,${storedImage.data}` }
                    }
                ]
            });
            await memory.clearImage(userId);
        } else {
            console.log(`[Agent] Menjawab ${userId} tanpa konteks file.`);
            messages.push({ role: 'user', content: userPromptForThisTurn });
        }
        
        // --- PANGGILAN OPENAI KE-1 (Untuk Cek Tools) ---
        console.log('[Agent] Memanggil OpenAI (Panggilan ke-1)...');
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini', 
            messages: messages,
            tools: tools,
            tool_choice: "auto",
        });

        const responseMessage = completion.choices[0].message;
        const toolCalls = responseMessage.tool_calls;

        if (toolCalls) {
            console.log('[Agent] AI meminta pemanggilan alat...');
            messages.push(responseMessage); 

            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                
                let functionResponse = '';

                if (functionName === 'cari_jurnal_akademik') {
                    // Ini akan memanggil 'runJournalSearch' yang sudah diperbarui
                    functionResponse = await runJournalSearch(functionArgs.query);
                } else {
                    console.warn(`[Agent] Alat tidak dikenal: ${functionName}`);
                    functionResponse = JSON.stringify({ error: "Alat tidak dikenal." });
                }
                messages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: functionResponse,
                });
            }

            // --- PANGGILAN OPENAI KE-2 (Dengan Hasil Alat) ---
            console.log('[Agent] Memanggil OpenAI (Panggilan ke-2) dengan hasil alat...');
            const finalCompletion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
            });

            const finalResponse = finalCompletion.choices[0].message.content;
            
            await memory.saveMessage(userId, 'user', userMessage); 
            await memory.saveMessage(userId, 'assistant', finalResponse);
            return finalResponse;
        
        } else {
            // --- ALUR NORMAL (Tidak ada alat yang dipanggil) ---
            console.log('[Agent] AI merespons langsung.');
            const aiResponse = responseMessage.content;
            
            await memory.saveMessage(userId, 'user', userMessage); 
            await memory.saveMessage(userId, 'assistant', aiResponse);
            return aiResponse; 
        }

    } catch (apiError) {
        console.error(`❌ [Agent] Error dari OpenAI API: ${apiError.message}`);
        if (apiError.code === 'missing_key') {
             return 'Error: API Key OpenAI tidak ditemukan. Cek file .env kamu.';
        }
        return 'Maaf, saya sedang mengalami masalah koneksi ke server AI. Coba lagi nanti.';
    }
}


async function handlePdfUpload(msg, userId) {
    try {
        const media = await msg.downloadMedia();
        if (!media) throw new Error('Gagal mengunduh media.');
        
        const pdfBuffer = Buffer.from(media.data, 'base64');
        const data = await pdf(pdfBuffer); 

        if (!data || !data.text) {
             throw new Error('Gagal mengekstrak teks, file mungkin hanya berisi gambar.');
        }
        const pdfText = data.text;

        await memory.savePdfText(userId, pdfText);
        console.log(`[Agent] PDF untuk ${userId} berhasil diproses (${pdfText.length} karakter).`);
        
        // Hapus riwayat chat
        const User = require('./models/User');
        await User.updateOne({ userId: userId }, { $set: { history: [] } }); 
        
        console.log(`[Agent] Riwayat percakapan lama untuk ${userId} dihapus karena ada PDF baru.`);
        
        return pdfText;
        
    } catch (pdfError) {
        console.error(`[pdfReader] Gagal parse PDF: ${pdfError.message}`);
        throw new Error(`Gagal mengekstrak teks dari PDF. Error: ${pdfError.message}`);
    }
}

module.exports = { handleMessage };