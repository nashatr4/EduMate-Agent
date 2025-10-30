const mongoose = require('mongoose');
const User = require('../src/models/User'); 
const memory = require('../src/memory'); 


beforeAll(async () => {
  // Hubungkan ke database TEST sebelum semua tes dimulai
  const uri = process.env.MONGODB_URI;
  // Cek apakah .env.test sudah di-load
  if (!uri || !uri.includes('_TEST')) {
    throw new Error('Database tes tidak dikonfigurasi! Cek .env.test DAN jest.config.js');
  }
  await mongoose.connect(uri);
});

afterAll(async () => {
  // Putuskan koneksi setelah semua tes selesai
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Bersihkan koleksi User sebelum SETIAP tes
  await User.deleteMany({});
});

// --- Mulai Tes ---

describe('Modul Memory (Database)', () => {

  const testUserId = 'test-user-123';

  // [KASUS UJI 1]
  test('harus bisa menyimpan dan mengambil riwayat pesan', async () => {
    await memory.saveMessage(testUserId, 'user', 'Halo');
    await memory.saveMessage(testUserId, 'assistant', 'Hai juga');
    const history = await memory.getHistory(testUserId);

    expect(history).toBeDefined();
    expect(history.length).toBe(2);
    expect(history[0].role).toBe('user');
  });

  // [KASUS UJI 2]
  test('harus bisa menyimpan dan mengambil teks PDF', async () => {
    const pdfText = "Ini adalah isi dari PDF.";
    await memory.savePdfText(testUserId, pdfText);
    const retrievedText = await memory.getPdfText(testUserId);
    expect(retrievedText).toBe(pdfText);
  });

  // [KASUS UJI 3]
  test('harus bisa mereset riwayat dan PDF', async () => {
    await memory.saveMessage(testUserId, 'user', 'Pesan lama');
    await memory.savePdfText(testUserId, 'PDF lama');
    await memory.resetHistory(testUserId);

    const history = await memory.getHistory(testUserId);
    const pdfText = await memory.getPdfText(testUserId);

    expect(history.length).toBe(0);
    // Perbaikan dari error sebelumnya
    expect(pdfText).toBeNull(); 
  });

  // [KASUS UJI 4]
  test('getHistory harus mengembalikan array kosong jika user tidak ada', async () => {
    const history = await memory.getHistory('user-yang-tidak-ada');
    expect(history).toEqual([]);
  });

});