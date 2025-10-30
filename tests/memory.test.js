const mongoose = require('mongoose');
const User = require('../src/models/user'); // Sesuaikan path
const memory = require('../src/memory');   // Sesuaikan path


beforeAll(async () => {
  // Hubungkan ke database TEST sebelum semua tes dimulai
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.includes('_TEST')) {
    throw new Error('Database tes tidak dikonfigurasi! Cek .env.test');
  }
  await mongoose.connect(uri);
});

afterAll(async () => {
  // Putuskan koneksi setelah semua tes selesai
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Bersihkan koleksi User sebelum SETIAP tes
  // Ini penting agar tes tidak saling mengganggu
  await User.deleteMany({});
});

// --- Mulai Tes ---

describe('Modul Memory (Database)', () => {

  const testUserId = 'test-user-123';

  // [KASUS UJI 1]
  test('harus bisa menyimpan dan mengambil riwayat pesan', async () => {
    // Simpan pesan
    await memory.saveMessage(testUserId, 'user', 'Halo');
    await memory.saveMessage(testUserId, 'assistant', 'Hai juga');

    // Ambil riwayat
    const history = await memory.getHistory(testUserId);

    // Verifikasi
    expect(history).toBeDefined();
    expect(history.length).toBe(2);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe('Halo');
    expect(history[1].role).toBe('assistant');
  });

  // [KASUS UJI 2]
  test('harus bisa menyimpan dan mengambil teks PDF', async () => {
    const pdfText = "Ini adalah isi dari PDF.";
    
    // Simpan teks PDF
    await memory.savePdfText(testUserId, pdfText);

    // Ambil teks PDF
    const retrievedText = await memory.getPdfText(testUserId);

    // Verifikasi
    expect(retrievedText).toBe(pdfText);
  });

  // [KASUS UJI 3]
  test('harus bisa mereset riwayat dan PDF', async () => {
    // Setup: simpan data dulu
    await memory.saveMessage(testUserId, 'user', 'Pesan lama');
    await memory.savePdfText(testUserId, 'PDF lama');

    // Panggil fungsi reset
    await memory.resetHistory(testUserId);

    // Ambil data yang sudah di-reset
    const history = await memory.getHistory(testUserId);
    const pdfText = await memory.getPdfText(testUserId);

    // Verifikasi
    expect(history.length).toBe(0);
    expect(pdfText).toBeUndefined();
  });

  // [KASUS UJI 4]
  test('getHistory harus mengembalikan array kosong jika user tidak ada', async () => {
    const history = await memory.getHistory('user-yang-tidak-ada');
    expect(history).toEqual([]);
  });

});