console.log('[Mock] Menggunakan library OpenAI dummy!');
const mockCreate = jest.fn();

class MockOpenAI {
  constructor(options) {
    // kita bisa cek api_key di sini jika mau
    console.log('[Mock] MockOpenAI diinisialisasi');
    this.apiKey = options.apiKey;
  }

  chat = {
    completions: {
      create: mockCreate
    }
  }
}

// Ekspor class palsu dan fungsi mock-nya
module.exports = {
  OpenAI: MockOpenAI,
  __mockCreate: mockCreate 
};