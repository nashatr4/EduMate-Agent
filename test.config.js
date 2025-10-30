module.exports = {
// Menjalankan file setup ini terlebih dahulu
setupFiles: ['<rootDir>/tests/setup.js'],
      
// Mengatur lingkungan tes ke 'node'
testEnvironment: 'node',
      
// Memberi tahu Jest di mana menemukan file tes
testMatch: [
  '<rootDir>/tests/**/*.test.js'
],

// Hapus mock di antara tes
clearMocks: true,
};