// coreAgent.test.js
jest.mock('openai');

const { handleMessage } = require('../src/coreAgent'); 
const memory = require('../src/memory'); 
const { OpenAI, __mockCreate } = require('openai'); 

// Mock modul 'memory' agar kita tidak perlu DB di tes ini
jest.mock('../src/memory', () => ({
  getPdfText: jest.fn(),
  // --- PERBAIKAN 1: Tambahkan getImage ke mock ---
  getImage: jest.fn(), 
  getHistory: jest.fn(),
  saveMessage: jest.fn(),
  savePdfText: jest.fn(),
  resetHistory: jest.fn(),
}));

// Reset semua mock sebelum tiap tes
beforeEach(() => {
  jest.clearAllMocks();
  __mockCreate.mockClear();
  memory.getPdfText.mockClear();
  // --- PERBAIKAN 2: Tambahkan getImage ke reset ---
  memory.getImage.mockClear();
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
    memory.getHistory.mockResolvedValue([]);
    memory.getPdfText.mockReturnValue(undefined); 
    // --- PERBAIKAN 3: Beri nilai palsu untuk getImage ---
    memory.getImage.mockReturnValue(undefined); 
    const mockAIReply = 'Saya adalah AI palsu.';
    __mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockAIReply } }]
    });

    const userMessage = 'Halo EduMate!';
    const reply = await handleMessage(testUserId, userMessage);

    // Verifikasi:
    expect(reply).toBe(mockAIReply);
    expect(__mockCreate).toHaveBeenCalledTimes(1);
    expect(memory.saveMessage).toHaveBeenCalledTimes(2);
  });

  // [KASUS UJI 6]
  test('harus menangani perintah /reset', async () => {
    // --- PERBAIKAN 4: Beri nilai palsu untuk getImage (untuk /reset) ---
    memory.getImage.mockReturnValue(undefined); 

    const userMessage = '/reset';
    const reply = await handleMessage(testUserId, userMessage);

    // --- PERBAIKAN ERROR 1: Sesuaikan teks yang diharapkan ---
    expect(reply).toContain('Memori percakapan dan sesi telah direset');
    expect(memory.resetHistory).toHaveBeenCalledTimes(1);
    expect(__mockCreate).not.toHaveBeenCalled();
  });

  // [KASUS UJI 7]
  test('harus menggunakan konteks PDF jika ada', async () => {
    const mockPdfText = 'Ini adalah isi PDF tentang Biologi.';
    const userMessage = 'Jelaskan isinya';
    const mockAIReply = 'Tentu, isinya tentang Biologi.';

    // Setup Mock:
    memory.getPdfText.mockReturnValue(mockPdfText); 
    // --- PERBAIKAN 5: Beri nilai palsu untuk getImage (untuk PDF) ---
    memory.getImage.mockReturnValue(undefined); 
    memory.getHistory.mockResolvedValue([]);
    __mockCreate.mockResolvedValue({
      choices: [{ message: { content: mockAIReply } }]
    });

    await handleMessage(testUserId, userMessage);

    // Verifikasi:
    expect(__mockCreate).toHaveBeenCalledTimes(1);
    const calls = __mockCreate.mock.calls;
    const messages = calls[0][0].messages;
    const userPrompt = messages.find(m => m.role === 'user').content;

    // --- PERBAIKAN ERROR 2: Sesuaikan format prompt yang diharapkan ---
    expect(userPrompt).toContain('Konteks Dokumen: ---[');
    expect(userPrompt).toContain(mockPdfText);
  });
});