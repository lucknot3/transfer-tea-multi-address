# 🪙 Token Distribution Bot (Auto Transfer Bot)

Bot ini digunakan untuk mendistribusikan token ERC-20 secara otomatis ke alamat-alamat wallet yang telah lolos KYC. Dibuat untuk digunakan di jaringan testnet seperti **Monad Testnet** atau **Sepolia**, dan mendukung **multi-wallet (3 private key)** serta **multi-token (3 token address)**.

---

## 🚀 Fitur Utama

- ✅ Kirim token otomatis ke alamat dari daftar GitHub
- ✅ Mendukung 3 wallet & 3 token address
- ✅ Penjadwalan otomatis setiap hari
- ✅ Logging ke file harian (`log-YYYY-MM-DD.txt`)
- ✅ Notifikasi Telegram (opsional)
- ✅ Retry otomatis jika transaksi gagal
- ✅ Delay acak agar tidak terlihat seperti bot

---

## 🔧 Cara Instalasi & Menjalankan

### 1. Clone Repository

```bash
Clone repositorynya
git clone https://github.com/lucknot3/transfer-tea-multi-address.git
cd transfer-tea-multi-address
Create screen ( Biar bisa running di background )
screen -Rd bulktransfer
Install NPM , dotenv sama axios dulu di Linux
sudo apt install npm
npm install dotenv
npm install axios
Install Dependencies
npm install ethers
Step by Step menggunakan botnya :

Pastikan kalian sudah menyelesaikan semua hal diatas
Buka file .env di editor text vps kalian
Cari bagian PRIVATE_KEY_KALIAN dan isi dengan private key kalian
Cari bagian CONTRACT_ADDRESS dan paste contract address token kalian
Cari bagian RPC_URL dan CHAIN_ID , pastikan sesuai dengan RPC dan Chain ID terbaru Tea Sepolia
( Opsional ) kalo kalian pengen dapetin notifikasi dari bot telegram, silahkan ikuti step berikut ( kalau tidak minat silahkan di skip dan langsung save saja file .envnya )

Bot Tokennya silahkan kalian buat botnya dan ambil bot tokennya disini : https://t.me/BotFather
Telegram Chat ID silahkan ambil disini : https://t.me/Check_Telegram_IDBot
Copy dua duanya dan paste dibagian Bot Token dan Telegram Chat ID
Save file .env nya
Jalankan scriptnya pake command ini :
  node teatransfer.js
Masukkan jumlah penerima dan Jumlah token yang akan dikirim
Selesai, selamat berbulking bulking ria~
Notes :

Kalo kalian pengen botnya jalan di background, pencet CTRL A + D .
Kalo kalian mau balikin lagi botnya , pakai command ini
screen -r bulktransfer
Kalo kalian mau matiin, tinggal klik CTRL + C
Join our telegram community here : https://t.me/ETRxCrypto

Thanks for the Source :

KYC Adresses : https://tea.daov.xyz/kyc-address
Original Script : https://github.com/ashev33/bulk-transfer-tea
GPT
