// src/memory.js
const User = require('./models/user');
const MAX_HISTORY_PER_USER = 5; // Menyimpan 5 pasang percakapan

async function findOrCreateUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = await User.create({ userId });
    }
    return user;
}

async function saveMessage(userId, role, content) {
    try {
        const newMessage = { role, content };

        await User.updateOne(
            { userId },
            {
                $push: {
                    history: {
                        $each: [newMessage],
                        // $slice: -N akan menyimpan N pesan TERAKHIR.
                        $slice: -MAX_HISTORY_PER_USER 
                    }
                }
            },
            { upsert: true } // Buat pengguna baru jika belum ada
        );
        
        console.log(`[Memory] Riwayat percakapan untuk ${userId} disimpan di DB.`);
    } catch (error) {
        console.error(`[Memory] Gagal saveMessage untuk ${userId}: ${error.message}`);
    }
}

async function getHistory(userId) {
    try {
        const user = await User.findOne({ userId });
        if (user) {
            return user.history;
        }
        return []; // Kembalikan array kosong jika user tidak ada
    } catch (error) {
        console.error(`[Memory] Gagal getHistory untuk ${userId}: ${error.message}`);
        return [];
    }
}

async function savePdfText(userId, text) {
    try {
        await User.updateOne(
            { userId },
            { $set: { pdfText: text } },
            { upsert: true } // Buat pengguna baru jika belum ada
        );
        console.log(`[Memory] Teks PDF disimpan di DB untuk ${userId}`);
    } catch (error) {
        console.error(`[Memory] Gagal savePdfText untuk ${userId}: ${error.message}`);
    }
}


// --- LOGIKA PDF DITAMBAHKAN (UNTUK MENYIMPAN TEKS PDF) ---
const userPdfSessions = new Map();


async function getPdfText(userId) {
    try {
        const user = await User.findOne({ userId });
        if (user && user.pdfText) {
            console.log(`[Memory] Teks PDF diambil dari DB untuk ${userId}`);
            return user.pdfText;
        }
        return undefined; // Kembalikan undefined (seperti Map.get) jika tidak ada
    } catch (error) {
        console.error(`[Memory] Gagal getPdfText untuk ${userId}: ${error.message}`);
        return undefined;
    }
}
// --- AKHIR LOGIKA PDF ---


// --- FUNGSI RESET DIGABUNGKAN ---
async function resetHistory(userId) {
    try {
        await User.updateOne(
            { userId },
            { $set: { history: [], pdfText: '' } }
            // Kita tidak pakai upsert, karena tidak ada gunanya mereset user yg tidak ada
        );
        console.log(`[Memory] Memori (percakapan & PDF) direset di DB untuk ${userId}`);
    } catch (error) {
        console.error(`[Memory] Gagal resetHistory untuk ${userId}: ${error.message}`);
    }
}

// Ekspor semua fungsi
module.exports = { 
    saveMessage, 
    getHistory, 
    resetHistory,
    savePdfText,
    getPdfText
};