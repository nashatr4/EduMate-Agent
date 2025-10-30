// Memberitahu Jest untuk menggunakan mock kita
jest.mock('openai');

const { handleMessage } = require('../src/coreAgent'); // Path ke agent
const memory = require('../src/memory'); // Path ke memory
const { OpenAI, __mockCreate } = require('openai'); // Impor mock

// Mock modul 'memory' agar kita tidak perlu DB di tes ini
jest.mock('../src/memory', () => ({
  getPdfText: jest.fn(),
  getHistory: jest.fn(),
  saveMessage: jest.fn(),
  savePdfText: jest.fn(),
  resetHistory: jest.fn(),
}));

// Reset semua mock sebelum tiap tes
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset mock OpenAI
  __mockCreate.mockClear();

  // Reset mock Memory
  memory.getPdfText.mockClear();
  memory.getHistory.mockClear();
  memory.saveMessage.mockClear();
  memory.resetHistory.mockClear();
});

// --- Mulai Tes ---

describe('Modul Core Agent (Logika)', () => {

  const testUserId = 'cli-user';

  // [KASUS UJI 5]
  test('harus menangani pesan biasa dan memanggil OpenAI', async () => {
    // Setup Mock:
    // 1. Tidak ada riwayat
    memory.getHistory.mockResolvedValue([]);
    // 2. Tidak ada PDF
    memory.getPdfText.mockReturnValue(undefined);
    // 3. Respon palsu dari OpenAI
    const mockAIReply = 'Saya adalah AI palsu.';
    __mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockAIReply } }]
    });

    // Panggil fungsi
    const userMessage = 'Halo EduMate!';
    const reply = await handleMessage(testUserId, userMessage);

    // Verifikasi:
    // 1. Apakah balasan AI benar?
    expect(reply).toBe(mockAIReply);
    
    // 2. Apakah OpenAI dipanggil dengan prompt yang benar?
    expect(__mockCreate).toHaveBeenCalledTimes(1);
    expect(__mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: 'system', content: expect.any(String) }, // Cek ada system prompt
          { role: 'user', content: userMessage } // Cek ada pesan user
        ])
      })
    );

    // 3. Apakah percakapan disimpan?
    expect(memory.saveMessage).toHaveBeenCalledTimes(2);
    expect(memory.saveMessage).toHaveBeenCalledWith(testUserId, 'user', userMessage);
    expect(memory.saveMessage).toHaveBeenCalledWith(testUserId, 'assistant', mockAIReply);
  });

  // [KASUS UJI 6]
  test('harus menangani perintah /reset', async () => {
    const userMessage = '/reset';
    const reply = await handleMessage(testUserId, userMessage);

    // Verifikasi:
    // 1. Apakah balasannya benar?
    expect(reply).toContain('Memori percakapan dan PDF telah direset');
    
    // 2. Apakah fungsi reset di memory dipanggil?
    expect(memory.resetHistory).toHaveBeenCalledTimes(1);
    expect(memory.resetHistory).toHaveBeenCalledWith(testUserId);
    
    // 3. Apakah OpenAI TIDAK dipanggil?
    expect(__mockCreate).not.toHaveBeenCalled();
  });

  // [KASUS UJI 7]
  test('harus menggunakan konteks PDF jika ada', async () => {
    const mockPdfText = 'Ini adalah isi PDF tentang Biologi.';
    const userMessage = 'Jelaskan isinya';
    const mockAIReply = 'Tentu, isinya tentang Biologi.';

    // Setup Mock:
    // 1. Ada PDF
    memory.getPdfText.mockReturnValue(mockPdfText);
    // 2. Tidak ada riwayat
    memory.getHistory.mockResolvedValue([]);
    // 3. Respon palsu
    __mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockAIReply } }]
    });

    // Panggil fungsi
    await handleMessage(testUserId, userMessage);

    // Verifikasi:
    // 1. Apakah OpenAI dipanggil dengan prompt yang berisi PDF?
    expect(__mockCreate).toHaveBeenCalledTimes(1);
    const calls = __mockCreate.mock.calls; // [0][0] adalah argumen pertama
    const messages = calls[0][0].messages;
    const userPrompt = messages.find(m => m.role === 'user').content;

    expect(userPrompt).toContain('[ AWAL DOKUMEN ]');
    expect(userPrompt).toContain(mockPdfText);
    expect(userPrompt).toContain(userMessage);
  });
});
