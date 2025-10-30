// src/models/User.js
const mongoose = require('mongoose');

// Ini adalah schema untuk satu pesan dalam riwayat
const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Ini adalah schema utama untuk setiap pengguna
const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true // Mempercepat pencarian berdasarkan userId
    },
    pdfText: {
        type: String,
        default: ''
    },
    // --- TAMBAHAN BARU UNTUK GAMBAR ---
    imageMime: {
        type: String,
        default: ''
    },
    imageData: {
        type: String, // Kita simpan sebagai string base64
        default: ''
    },
    // --- AKHIR TAMBAHAN BARU ---
    history: [messageSchema] // Menyimpan array dari pesan
});

// Membuat model dari schema dan mengekspornya
module.exports = mongoose.model('User', userSchema);