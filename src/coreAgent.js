// src/coreAgent.js
const memory = require('./memory');
const openaiService = require('./services/openaiService');

const SYSTEM_PROMPT = `Kamu adalah "EduMate", asisten belajar mahasiswa yang cerdas dan ramah. 
Tugasmu adalah:
1. Menjelaskan konsep kuliah yang sulit dengan bahasa sederhana dan analogi.
2. Memberikan contoh soal dan jawaban jika diminta.
3. Jika pengguna bilang "jelaskan lagi" atau "lebih mudah", gunakan analogi yang berbeda.
4. Jaga jawaban agar tetap ringkas dan fokus pada materi akademik. Tolak membahas topik di luar edukasi dengan sopan.`;

async function handleMessage(userId, userMessage) {
  // Cek perintah khusus, misal reset memori
  if (userMessage.toLowerCase() === '/reset') {
    memory.resetHistory(userId);
    return "Memori percakapan telah direset. Kita mulai dari awal ya!";
  }

  const history = memory.getHistory(userId);

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage }
  ];

  const botReply = await openaiService.getLLMReply(messages);

  // Simpan percakapan baru ke memori
  memory.saveMessage(userId, "user", userMessage);
  memory.saveMessage(userId, "assistant", botReply);

  return botReply;
}

module.exports = { handleMessage };