// src/pdfReader.js

// 'require' sekarang akan 100% berfungsi karena kita pakai versi 1.1.1
const pdf = require('pdf-parse');

/**
 * Membaca Buffer dari file PDF dan mengembalikan teksnya.
 * @param {Buffer} buffer Data buffer dari file PDF
 * @returns {Promise<string>} Teks yang diekstrak dari PDF
 */
async function readPdfBuffer(buffer) {
    if (!buffer || buffer.length === 0) {
        throw new Error('Buffer PDF kosong atau tidak valid.');
    }
    
    try {
        // 'pdf' sekarang PASTI sebuah fungsi
        const data = await pdf(buffer);

        if (!data || !data.text) {
             throw new Error('Gagal mengekstrak teks, file mungkin hanya berisi gambar.');
        }
        return data.text;
        
    } catch (error) {
        console.error(`[pdfReader] Gagal parse PDF: ${error.message}`);
        // Melempar error baru agar bisa ditangkap oleh coreAgent
        throw new Error(`Gagal mengekstrak teks dari PDF. Error: ${error.message}`);
    }
}

module.exports = { readPdfBuffer };