// src/memory.js
const User = require('./models/User'); // Impor schema User barumu

const MAX_HISTORY_PER_USER = 5; // Batas riwayat percakapan

// --- SEMUA FUNGSI SEKARANG ASYNC & PAKAI SATU MODEL 'User' ---

/**
 * Mendapatkan data user, atau membuat user baru jika tidak ada.
 * Ini adalah fungsi helper internal yang efisien.
 */
async function getOrCreateUser(userId) {
    let user = await User.findOne({ userId: userId });
    if (!user) {
        user = await User.create({ userId: userId, history: [] });
    }
    return user;
}

async function saveMessage(userId, role, content) {
    try {
        // Gunakan $push untuk menambah pesan baru ke array 'history'
        // Gunakan $slice untuk memotong array, hanya simpan 5 terakhir
        await User.findOneAndUpdate(
            { userId: userId },
            {
                $push: {
                    history: {
                        $each: [{ role, content, timestamp: new Date() }],
                        $slice: -MAX_HISTORY_PER_USER // Simpan 5 elemen terakhir
                    }
                }
            },
            { upsert: true } // Buat user baru jika belum ada
        );
        console.log(`[DB-Mongo] Riwayat percakapan untuk ${userId} disimpan.`);
    } catch (error) {
        console.error(`[DB-Mongo] Gagal menyimpan pesan: ${error.message}`);
    }
}

async function getHistory(userId) {
    try {
        const user = await User.findOne({ userId: userId }).select('history -_id');
        if (user && user.history) {
            // 'history' sudah otomatis terpotong 5 terakhir berkat 'saveMessage'
            return user.history.map(msg => ({ role: msg.role, content: msg.content }));
        }
        return [];
    } catch (error) {
        console.error(`[DB-Mongo] Gagal mengambil riwayat: ${error.message}`);
        return [];
    }
}

// 'findOneAndUpdate' dengan 'upsert: true' sangat efisien
async function savePdfText(userId, text) {
    const sessionData = { 
        pdfText: text, 
        imageMime: '', // Hapus gambar lama
        imageData: ''
    };
    await User.findOneAndUpdate(
        { userId: userId }, // Kunci pencarian
        { $set: sessionData }, // Set data baru
        { upsert: true } // Buat baru jika tidak ditemukan
    );
    console.log(`[DB-Mongo] Teks PDF disimpan untuk ${userId}`);
}

async function saveImage(userId, mimetype, data) {
    const sessionData = { 
        pdfText: '', // Hapus PDF lama
        imageMime: mimetype, 
        imageData: data 
    };
    await User.findOneAndUpdate(
        { userId: userId }, 
        { $set: sessionData }, 
        { upsert: true }
    );
    console.log(`[DB-Mongo] Gambar disimpan untuk ${userId}`);
}

async function getPdfText(userId) {
    const user = await getOrCreateUser(userId);
    return user.pdfText || null;
}

async function getImage(userId) {
    const user = await getOrCreateUser(userId);
    if (user && user.imageMime && user.imageData) {
        return { mimetype: user.imageMime, data: user.imageData };
    }
    return null;
}

async function clearImage(userId) {
    await User.updateOne(
        { userId: userId }, 
        { $set: { imageMime: '', imageData: '' } }
    );
}

async function resetHistory(userId) {
    // Reset semua data, tapi jangan hapus user-nya
    await User.updateOne(
        { userId: userId },
        { $set: { history: [], pdfText: '', imageMime: '', imageData: '' } }
    );
    console.log(`[DB-Mongo] Memori (percakapan & sesi) dihapus untuk ${userId}`);
}

module.exports = { 
    saveMessage, 
    getHistory, 
    resetHistory,
    savePdfText,
    saveImage,
    getPdfText,
    getImage,
    clearImage
};