// src/services/openaiService.js
require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getLLMReply(messages) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error saat menghubungi OpenAI:", error.message);
    return "Maaf, sepertinya saya sedang ada gangguan. Coba lagi beberapa saat ya.";
  }
}

module.exports = { getLLMReply };