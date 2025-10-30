// tests/coreAgent.test.js

// --- 1. MOCK (PEMALSUAN) SEMUA DEPENDENSI ---
const mockOpenAICreate = jest.fn();
jest.mock('openai', () => ({
    OpenAI: jest.fn(() => ({
        chat: { completions: { create: mockOpenAICreate } }
    })),
}));

const mockAxiosGet = jest.fn();
jest.mock('axios', () => ({ get: mockAxiosGet }));

jest.mock('pdf-parse', () => 
    jest.fn().mockResolvedValue({ text: 'Ini adalah teks PDF palsu.' })
);

let fakeDb = {};
const mockMemory = {
    saveMessage: jest.fn(async (userId, role, content) => {
        if (!fakeDb[userId]) fakeDb[userId] = { history: [], files: {} };
        fakeDb[userId].history.push({ role, content });
    }),
    getHistory: jest.fn(async (userId) => {
        return fakeDb[userId] ? fakeDb[userId].history : [];
    }),
    savePdfText: jest.fn(async (userId, text) => {
        if (!fakeDb[userId]) fakeDb[userId] = { history: [], files: {} };
        fakeDb[userId].files = { pdfText: text, image: null };
    }),
    saveImage: jest.fn(async (userId, mimetype, data) => {
        if (!fakeDb[userId]) fakeDb[userId] = { history: [], files: {} };
        fakeDb[userId].files = { pdfText: null, image: { mimetype, data } };
    }),
    getPdfText: jest.fn(async (userId) => {
        return fakeDb[userId] && fakeDb[userId].files ? fakeDb[userId].files.pdfText : null;
    }),
    getImage: jest.fn(async (userId) => {
        return fakeDb[userId] && fakeDb[userId].files ? fakeDb[userId].files.image : null;
    }),
    clearImage: jest.fn(async (userId) => {
        if (fakeDb[userId] && fakeDb[userId].files) fakeDb[userId].files.image = null;
    }),
    resetHistory: jest.fn(async (userId) => {
        if (fakeDb[userId]) fakeDb[userId] = { history: [], files: {} };
    }),
};
jest.mock('../src/memory.js', () => mockMemory);

const mockUserUpdateOne = jest.fn().mockResolvedValue({ nModified: 1 });
jest.mock('../src/models/User', () => ({
    updateOne: mockUserUpdateOne,
}));

const { handleMessage } = require('../src/coreAgent'); 

// --- 2. MULAI TES ---

describe('EduMate Core Agent Logic (handleMessage)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        fakeDb = {}; 

        // --- ⬇️ PERBAIKAN LOGIKA MOCK DENGAN 'RETURN' ⬇️ ---
        mockOpenAICreate.mockImplementation(async (payload) => {
            const lastMessage = payload.messages[payload.messages.length - 1];
            
            // KASUS TOOL CALL (Panggilan ke-2)
            if (lastMessage.role === 'tool') {
                return { 
                    choices: [{ message: { role: 'assistant', content: 'Ini dia jurnal yang saya temukan tentang AI.' } }]
                };
            }

            const content = lastMessage.content;
            
            // KASUS TOOL CALL (Panggilan ke-1)
            if (payload.tools && typeof content === 'string' && content.includes('cari jurnal')) {
                return { // <-- 'RETURN' YANG HILANG SEBELUMNYA
                    choices: [{
                        message: {
                            role: 'assistant',
                            tool_calls: [{
                                id: 'call_123',
                                type: 'function',
                                function: { name: 'cari_jurnal_akademik', arguments: '{"query":"AI"}' }
                            }]
                        }
                    }]
                };
            }
            
            // KASUS LAINNYA
            if (typeof content === 'string') {
                if (content.includes('halo, nama saya Budi')) {
                    return { choices: [{ message: { role: 'assistant', content: 'Halo Budi, senang bertemu denganmu!' } }] };
                }
                if (content.includes('siapa nama saya?')) {
                    return { choices: [{ message: { role: 'assistant', content: 'Nama Anda Budi.' } }] };
                }
                if (content.includes('Konteks Dokumen')) {
                    return { choices: [{ message: { role: 'assistant', content: 'Tentu, ini ringkasan dari "teks PDF palsu" itu.' } }] };
                }
            }
            
            if (Array.isArray(content)) { // Deteksi pesan gambar
                return { choices: [{ message: { role: 'assistant', content: 'Ini adalah gambar.' } }] };
            }

            // Balasan default (Kasus 1)
            return {
                choices: [{ message: { role: 'assistant', content: 'Halo! Ada yang bisa saya bantu?' } }]
            };
        });
        // --- ⬆️ AKHIR PERBAIKAN LOGIKA MOCK ⬆️ ---

        mockAxiosGet.mockResolvedValue({
            data: {
                data: [{ title: 'Jurnal AI Keren', authors: [{name: 'Dr. Keren'}], year: 2024, abstract: '...', link: 'http://example.com/pdf' }]
            }
        });
    });

    // --- 6 KASUS TES ---

    test('Kasus 1: Harus merespons chat teks biasa', async () => {
        const userId = 'user-001';
        const message = 'halo';
        const reply = await handleMessage(userId, message);

        expect(reply).toBe('Halo! Ada yang bisa saya bantu?');
        expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
        expect(mockMemory.saveMessage).toHaveBeenCalledWith(userId, 'user', 'halo');
    });

    test('Kasus 2: Harus mengingat riwayat percakapan (Long-term Memory)', async () => {
        const userId = 'user-002';
        
        await handleMessage(userId, 'halo, nama saya Budi');
        const reply = await handleMessage(userId, 'siapa nama saya?');

        expect(reply).toBe('Nama Anda Budi.');
        expect(mockMemory.getHistory).toHaveBeenCalledWith(userId);
        expect(mockOpenAICreate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    { role: 'user', content: 'halo, nama saya Budi' },
                    { role: 'assistant', content: 'Halo Budi, senang bertemu denganmu!' },
                    { role: 'user', content: 'siapa nama saya?' } 
                ])
            })
        );
    });

    test('Kasus 3: Harus memproses PDF dan menggunakannya sebagai konteks', async () => {
        const userId = 'wa-user-001';
        const mockMsg = {
            from: userId,
            body: 'tolong ringkas dokumen ini',
            hasMedia: true,
            type: 'document',
            _data: { mimetype: 'application/pdf' },
            downloadMedia: jest.fn().mockResolvedValue({
                mimetype: 'application/pdf',
                data: 'data-pdf-base64'
            }),
            reply: jest.fn(),
        };

        const reply = await handleMessage(mockMsg);

        expect(require('pdf-parse')).toHaveBeenCalled();
        expect(mockMemory.savePdfText).toHaveBeenCalledWith(userId, 'Ini adalah teks PDF palsu.');
        expect(mockUserUpdateOne).toHaveBeenCalled(); 
        expect(mockOpenAICreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        content: expect.stringContaining('Konteks Dokumen: ---[ Ini adalah teks PDF palsu.')
                    })
                ])
            })
        );
        expect(reply).toBe('Tentu, ini ringkasan dari "teks PDF palsu" itu.');
    });

    test('Kasus 4: Harus memproses Gambar (Vision) dan mengirim data URL', async () => {
        const userId = 'wa-user-002';
        const mockMsg = {
            from: userId,
            body: 'jelaskan gambar ini',
            hasMedia: true,
            type: 'chat',
            _data: { mimetype: 'image/jpeg' },
            downloadMedia: jest.fn().mockResolvedValue({
                mimetype: 'image/jpeg',
                data: 'data-gambar-base64'
            }),
            reply: jest.fn(),
        };

        const reply = await handleMessage(mockMsg);

        expect(mockMemory.saveImage).toHaveBeenCalledWith(userId, 'image/jpeg', 'data-gambar-base64');
        expect(mockOpenAICreate).toHaveBeenCalledWith(
            expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        content: expect.arrayContaining([
                            expect.objectContaining({ type: 'text', text: 'jelaskan gambar ini' }),
                            expect.objectContaining({
                                type: 'image_url',
                                image_url: { url: 'data:image/jpeg;base64,data-gambar-base64' }
                            })
                        ])
                    })
                ])
            })
        );
        expect(reply).toBe('Ini adalah gambar.');
        expect(mockMemory.clearImage).toHaveBeenCalledWith(userId);
    });

    test('Kasus 5: Harus memanggil Tool (API Jurnal) jika diminta', async () => {
        const userId = 'user-003';
        const message = 'carikan saya jurnal tentang AI';

        const reply = await handleMessage(userId, message);

        // Tes ini sekarang akan LULUS
        expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
        expect(mockAxiosGet).toHaveBeenCalledTimes(1);
        expect(mockAxiosGet).toHaveBeenCalledWith(
            'https://api.semanticscholar.org/graph/v1/paper/search',
            expect.any(Object)
        );
        expect(reply).toBe('Ini dia jurnal yang saya temukan tentang AI.');
    });

    test('Kasus 6: Harus mereset memori saat perintah /reset', async () => {
        const userId = 'user-004';
        const message = '/reset';

        const reply = await handleMessage(userId, message);

        expect(mockMemory.resetHistory).toHaveBeenCalledWith(userId);
        expect(reply).toContain('Memori percakapan dan sesi telah direset');
        expect(mockOpenAICreate).not.toHaveBeenCalled();
    });
});