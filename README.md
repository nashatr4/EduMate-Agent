# EduMate-Agent 

**EduMate** adalah sebuah Agent yang berfungsi sebagai asisten belajar virtual untuk mahasiswa. Agent ini terintegrasi dengan WhatsApp, memungkinkannya untuk diakses dengan mudah kapan saja dan di mana saja.

---

## ✨ Fitur Utama

* **Memori Persisten:** Menggunakan **MongoDB** untuk menyimpan riwayat percakapan. Agent ini mampu mengingat konteks dari obrolan sebelumnya (`"siapa nama saya?"`).

* **Pemrosesan PDF (RAG):** Pengguna dapat mengunggah file PDF. Agent akan mem-parsing teksnya dan menggunakan konten tersebut sebagai konteks untuk menjawab pertanyaan berikutnya.

* **Manajemen Sesi:** Agent mengerti perintah khusus seperti `/reset` untuk menghapus memori percakapan dan sesi PDF saat ini.

* **Arsitektur Tervalidasi:** Kualitas kode dipastikan melalui **7 unit test** (`jest`) yang mencakup logika *database* dan *core agent*.

---

## 🚀 Demo

Berikut adalah contoh alur penggunaan bot, mulai dari proses login hingga percakapan.

1.  **Proses Login dengan Scan QR Code**
    Setelah bot dijalankan, sebuah kode QR akan muncul di terminal. Scan menggunakan aplikasi WhatsApp di HP untuk menghubungkan bot.
    <br><img width="200" height="226" alt="generated-qr" src="https://github.com/user-attachments/assets/1ffd7ae3-dd36-4327-b7b6-7e8d64017db3" />


3.  **Contoh Alur Percakapan**
    Contoh percakapan yang menunjukkan respons kontekstual, rekomendasi psikolog berdasarkan lokasi, dan *safety net* (nomor telepon darurat) ketika pengguna memasukkan kata kritis.
    <br> [video demo](https://drive.google.com/file/d/1Zk3pyYTgMhbE3CgHik4KuwdyZ3RP0woN/view?usp=sharing)
    | Respons Kontekstual | Menampilkan Psikolog Terdekat | *Safety net* |
    | :---: | :---: | :---: |
    | <img src="https://github.com/user-attachments/assets/2ee22113-4c32-424d-91c7-b9ef7eb02121" width="180"> | <img src="https://github.com/user-attachments/assets/ed44d13c-41bd-41ca-83b7-e981a26304a1" width="180"> | <img src="https://github.com/user-attachments/assets/82b6cfb5-2c29-4371-ad17-bcad46708289" width="180">
    

---

## 🛠️ Setup & Instalasi

Berikut adalah langkah-langkah untuk menjalankan bot ini di komputermu.

### **Prasyarat**

* **Node.js**: Pastikan kamu sudah menginstal Node.js (disarankan versi `18.x` atau lebih baru).
* **Nomor WhatsApp**: Siapkan satu nomor WhatsApp yang akan digunakan untuk bot.
* **MongoDB**: Siapkan database mongoDB untuk menyimpan riwayat percakapan
* **OpenAI API Key**: API Key untuk memanggil LLM model Open AI

### **Langkah-langkah Instalasi**

1.  **Clone Repositori**
    Buka terminal dan clone repositori ini ke komputermu.
    ```bash
    git clone [https://github.com/nashatr4/EduMate-Agent](https://github.com/nashatr4/EduMate-Agent)
    cd NLP_Project_1
    ```

2.  **Install Dependencies**
    Install semua paket yang dibutuhkan melalui npm.
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment**
    Pastikan file yang bersifat rahasia tidak diunggah ke Git. Pastikan `.gitignore` sudah berisi baris berikut:
    ```.gitignore
    #.gitignore
    node_modules/
    .env

    logs/
    *.log
    .wwebjs_auth
    .wwebjs_cache
    ```

## ▶️ Menjalankan Bot

1.  **Jalankan Perintah Start**
    Gunakan perintah berikut untuk memulai bot:
    ```bash
    npm start
    ```

2.  **Scan QR Code**
    Sebuah kode QR akan muncul di terminalmu. Buka WhatsApp di HP > **Setelan** > **Perangkat Tertaut** > **Tautkan Perangkat**, lalu scan kode tersebut.

3.  **LLM Agent Siap Digunakan!**
    Setelah berhasil, terminal akan menampilkan pesan "✅ Bot WhatsApp siap digunakan!". Kamu bisa mulai mengirim pesan ke nomor bot dari nomor WhatsApp lain.

---

## 🧪 Menjalankan Tes

Proyek ini dilengkapi dengan unit test menggunakan Jest untuk memastikan bot berjalan dengan benar.

Untuk menjalankan semua tes, gunakan perintah:
```bash
npm test
