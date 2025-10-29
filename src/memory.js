// --- DARI KODE ANDA (UNTUK RIWAYAT PERCAKAPAN) ---
const conversationHistory = new Map();
const MAX_HISTORY_PER_USER = 5; // Menyimpan 5 pasang percakapan

function saveMessage(userId, role, content) {
  let userHistory = conversationHistory.get(userId) || [];
  userHistory.push({ role, content });

  // Logika Anda: 5 pesan (bukan 5 pasang)
  // Jika ingin 5 pasang (10 pesan), ganti ke MAX_HISTORY_PER_USER * 2
  while (userHistory.length > MAX_HISTORY_PER_USER) { 
    userHistory.shift(); // Hapus pesan paling lama
  }
  conversationHistory.set(userId, userHistory);
  console.log(`[Memory] Riwayat percakapan untuk ${userId} disimpan.`);
}

function getHistory(userId) {
  return conversationHistory.get(userId) || [];
}
// --- AKHIR DARI KODE ANDA ---


// --- LOGIKA PDF DITAMBAHKAN (UNTUK MENYIMPAN TEKS PDF) ---
const userPdfSessions = new Map();

function savePdfText(userId, text) {
    userPdfSessions.set(userId, text);
    console.log(`[Memory] Teks PDF disimpan untuk ${userId}`);
}

function getPdfText(userId) {
    const text = userPdfSessions.get(userId);
    if (text) {
        console.log(`[Memory] Teks PDF diambil untuk ${userId}`);
    }
    return text;
}
// --- AKHIR LOGIKA PDF ---


// --- FUNGSI RESET DIGABUNGKAN ---
function resetHistory(userId) {
  // Hapus riwayat percakapan
  conversationHistory.delete(userId);
  // Hapus juga PDF yang tersimpan
  userPdfSessions.delete(userId); 
  console.log(`[Memory] Memori (percakapan & PDF) dihapus untuk ${userId}`);
}

// Ekspor semua fungsi
module.exports = { 
    saveMessage, 
    getHistory, 
    resetHistory,
    savePdfText,  // <- Ditambahkan
    getPdfText    // <- Ditambahkan
};