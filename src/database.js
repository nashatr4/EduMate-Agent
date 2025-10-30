const mongoose = require('mongoose');

// Nonaktifkan 'strictQuery' untuk fleksibilitas (rekomendasi Mongoose 7+)
mongoose.set('strictQuery', false);


const connectDB = async () => {
    // 1. Ambil URI dari .env
    const uri = process.env.MONGODB_URI;
    
    // 2. Cek apakah URI ada. Jika tidak, aplikasi tidak bisa jalan.
    if (!uri) {
        console.error('❌ [Database] MONGODB_URI tidak ditemukan di file .env!');
        process.exit(1); // Keluar dari aplikasi
    }

    // 3. Coba hubungkan ke database
    try {
        console.log('🔄 [Database] Menghubungkan ke MongoDB...');
        await mongoose.connect(uri);
        console.log('✅ [Database] Berhasil terhubung ke MongoDB!');
    } catch (error) {
        // 4. Jika gagal, tampilkan error dan matikan server.
        console.error(`❌ [Database] Gagal terhubung: ${error.message}`);
        process.exit(1); // Keluar dari aplikasi
    }
};


module.exports = { connectDB };
