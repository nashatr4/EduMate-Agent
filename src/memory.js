// src/memory.js
const conversationHistory = new Map();
const MAX_HISTORY_PER_USER = 5; // Menyimpan 5 pasang percakapan

function saveMessage(userId, role, content) {
  let userHistory = conversationHistory.get(userId) || [];
  userHistory.push({ role, content });

  while (userHistory.length > MAX_HISTORY_PER_USER) {
    userHistory.shift(); // Hapus pesan paling lama
  }
  conversationHistory.set(userId, userHistory);
}

function getHistory(userId) {
  return conversationHistory.get(userId) || [];
}

function resetHistory(userId) {
  conversationHistory.delete(userId);
}

module.exports = { saveMessage, getHistory, resetHistory };