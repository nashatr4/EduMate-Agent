// Beri nama file ini 'jest.config.js' dan letakkan di root proyek

module.exports = {
  // Memberitahu Jest untuk menjalankan file setup ini SEBELUM tes
  setupFiles: ['<rootDir>/tests/setup.js'],
  
  // Mengatur lingkungan tes ke 'node'
  testEnvironment: 'node',
  
  // Memberi tahu Jest di mana menemukan file tes
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Hapus mock di antara tes
  clearMocks: true,
  
  // Opsi ini akan menghentikan tes pada kegagalan pertama,
  // bagus untuk debugging
  // bail: true, 
};