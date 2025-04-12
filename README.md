# 🧋 Tea Sepolia Bulk Token Transfer Bot

Bot ini digunakan untuk mengirim token TEA ke banyak alamat sekaligus secara otomatis, dengan delay acak, rotasi wallet/token, logging harian, dan notifikasi Telegram (opsional). Support testnet Tea Sepolia.

---

## 🚀 Fitur
- ✅ Kirim token otomatis ke alamat-alamat KYC
- ✅ Delay acak antar transaksi
- ✅ Rotasi wallet dan kontrak token
- ✅ Logging lengkap (harian)
- ✅ Notifikasi Telegram (opsional)
- ✅ Jalan otomatis harian (loop 24 jam)
  
---

## 🛠 Cara Pakai

### 1. Clone Repository
git clone https://github.com/lucknot3/transfer-tea-multi-address.git
cd transfer-tea-multi-address
2. Jalankan di Latar Belakang (Opsional)
screen -Rd bulktransfer
3. Install Dependensi
sudo apt install
npm install dotenv 
npm install axios
npm install ethers
⚙️ Konfigurasi .env
Buka file .env dan isi dengan konfigurasi berikut:
PRIVATE_KEY_1=0x...
PRIVATE_KEY_2=0x...
PRIVATE_KEY_3=0x...

# Token
TOKEN_ADDRESS_1=0x...
TOKEN_ADDRESS_2=0x...
TOKEN_ADDRESS_3=0x...

# RPC dan Chain
RPC_URL=https://rpc.testnet.tea.xyz
CHAIN_ID=10218

# Telegram (Opsional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
📌 Gunakan @BotFather untuk buat bot dan @Check_Telegram_IDBot untuk dapatkan Chat ID.

▶️ Menjalankan Bot
node teatransfer.js
Ikuti prompt:

Masukkan jumlah alamat penerima

Masukkan jumlah token yang akan dikirim (misal: 1000)

🧠 Tips & Catatan
CTRL + A lalu D → keluar dari screen (jalan di background)

screen -r bulktransfer → kembali ke screen

CTRL + C → hentikan bot

📂 Struktur Output
logs/ → berisi log transaksi harian (log-YYYY-MM-DD.txt)

kyc_addresses_sent.txt → daftar alamat yang sudah dikirim

kyc_addresses_pending.txt → alamat yang gagal dan akan dicoba ulang

🔗 Resource
📄 KYC Address: https://tea.daov.xyz/kyc-address

🧠 Original Script: github.com/ashev33/bulk-transfer-tea

👥 Komunitas Telegram: @https://t.me/tokocripic

🧠 Troubleshooting
Kalau error, cukup salin pesan error dan tanya ke ChatGPT atau komunitas. Contoh:
Error: invalid sender or insufficient gas
🤝 Kontribusi
Silakan fork dan pull request jika ingin menambahkan fitur, refactor, atau memperbaiki bug. Terima kasih 🙏

⚠️ Semua aktivitas adalah tanggung jawab pengguna. Gunakan hanya untuk tujuan testnet.
