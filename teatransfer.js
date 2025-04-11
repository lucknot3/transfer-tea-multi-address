require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const axios = require("axios");

// === Konfigurasi Dasar ===
const RPC_URL = process.env.RPC_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Memuat private key dan token address
const PRIVATE_KEYS = [
    process.env.PRIVATE_KEY_1,
    process.env.PRIVATE_KEY_2,
    process.env.PRIVATE_KEY_3
];

const TOKEN_ADDRESSES = [
    process.env.TOKEN_ADDRESS_1,
    process.env.TOKEN_ADDRESS_2,
    process.env.TOKEN_ADDRESS_3
];

if (!RPC_URL || !PRIVATE_KEYS || !TOKEN_ADDRESSES) {
    console.error("? ERROR: Pastikan file .env sudah dikonfigurasi dengan benar.");
    process.exit(1);
}

// === Konfigurasi Provider ===
const provider = new ethers.JsonRpcProvider(RPC_URL, {
    chainId: 10218, // Chain ID untuk Tea Sepolia
    name: "tea-sepolia"
});

// Fungsi untuk membuat wallet dan token contract
function getWalletAndTokenContract(privateKey, tokenAddress) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenContract = new ethers.Contract(tokenAddress, [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() view returns (uint8)"
    ], wallet);
    return { wallet, tokenContract };
}

// === Fungsi Logging ke File ===
function getLogFilename() {
    const today = new Date().toISOString().split("T")[0];
    return `log-${today}.txt`;
}
const logStream = fs.createWriteStream(getLogFilename(), { flags: 'a' });

function logMessage(level, message) {
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] [${level}] ${message}\n`;
    logStream.write(fullMessage);
    console.log(fullMessage);
}

function logError(message) {
    logMessage("ERROR", message);
    sendTelegramMessage(`?? *Error:* ${message}`);
}

function logInfo(message) {
    logMessage("INFO", message);
    if (/Transaksi/.test(message)) sendTelegramMessage(message);
}

// === Fungsi Notifikasi Telegram ===
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        });
    } catch (err) {
        console.error("Gagal mengirim notifikasi Telegram:", err.message);
    }
}

// === Fungsi untuk Membaca & Menulis Alamat ===
function readAddressesFromFile(filename) {
    if (!fs.existsSync(filename)) return [];
    return fs.readFileSync(filename, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
}

function writeAddressesToFile(filename, addresses) {
    fs.writeFileSync(filename, addresses.join('\n'), 'utf8');
}

// === Fungsi Fetch Data KYC ===
async function fetchKYCAddresses() {
    try {
        logInfo("Mengunduh daftar alamat KYC...");
        const response = await axios.get("https://raw.githubusercontent.com/clwkevin/LayerOS/main/addressteasepoliakyc.txt");
        return response.data.split('\n').map(addr => addr.trim().toLowerCase());
    } catch (error) {
        logError("Gagal mengunduh daftar KYC: " + error.message);
        return [];
    }
}

// === Fungsi Delay dengan Rentang Tertentu ===
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === Fungsi Distribusi Token ===
async function distributeTokens() {
    try {
        let kycAddresses = await fetchKYCAddresses();
        if (kycAddresses.length === 0) {
            logError("Tidak ada alamat KYC yang ditemukan.");
            return;
        }

        let sentRecipients = readAddressesFromFile('kyc_addresses_sent.txt').map(addr => addr.toLowerCase());
        let failedRecipientsPrev = readAddressesFromFile('kyc_addresses_pending.txt').map(addr => addr.toLowerCase());

        let recipients = kycAddresses.filter(addr =>
            !sentRecipients.includes(addr) || failedRecipientsPrev.includes(addr)
        );

        writeAddressesToFile('kyc_addresses_pending.txt', []);

        if (recipients.length === 0) {
            logInfo(" Semua alamat KYC sudah menerima token.");
            return;
        }

        logInfo(`?? Ada ${recipients.length} alamat yang belum menerima token.`);

        let transactionLimit = Math.min(recipients.length, Math.floor(Math.random() * (110 - 101 + 1) + 101));
        logInfo(`?? Akan mengirim ${transactionLimit} transaksi hari ini.`);

        let failedRecipients = [];
        let selectedRecipients = recipients.slice(0, transactionLimit).sort(() => 0.5 - Math.random());

        for (let i = 0; i < selectedRecipients.length; i++) {
            const recipient = selectedRecipients[i];
            const amountToSend = ethers.parseUnits("1000.0", 18);  // 1000 Token untuk tiap transaksi

            // Tentukan delay sebelum transaksi
            const delayMs = Math.floor(Math.random() * (3 * 60 * 1000 - 2 * 60 * 1000) + 1 * 60 * 1000);
            logInfo(`? Menunggu ${Math.floor(delayMs / 1000)} detik sebelum mengirim ke ${recipient}...`);

            await delay(delayMs);

            try {
                // Gunakan wallet dan token contract secara bergantian
                for (let i = 0; i < 3; i++) {
                    const { wallet, tokenContract } = getWalletAndTokenContract(PRIVATE_KEYS[i], TOKEN_ADDRESSES[i]);
                    logInfo(`? Mengirim transaksi ke ${recipient} dengan wallet ${wallet.address}...`);

                    const tx = await tokenContract.transfer(recipient, amountToSend);
                    const receipt = await tx.wait(3);
                    logInfo(`? ${i + 1}. Transaksi Berhasil (${recipient}) - TX Hash: ${tx.hash}`);

                    sentRecipients.push(recipient);
                    sentRecipients = [...new Set(sentRecipients)];
                    writeAddressesToFile('kyc_addresses_sent.txt', sentRecipients);

                    const postTxDelay = Math.floor(Math.random() * (70 * 1000 - 20 * 1000) + 30 * 1000);
                    await delay(postTxDelay);
                }
            } catch (error) {
                logError(`? ${i + 1}. Transaksi Gagal (${recipient}) - ${error.message}`);
                failedRecipients.push(recipient);
            }
        }

        writeAddressesToFile('kyc_addresses_pending.txt', failedRecipients);

        logInfo(` Transaksi hari ini selesai. Berhasil: ${transactionLimit - failedRecipients.length}, Gagal: ${failedRecipients.length}`);
    } catch (error) {
        logError(error.message);
    }
}

// === Loop Harian Otomatis ===
async function startDailyLoop() {
    while (true) {
        await distributeTokens();

        let now = new Date();
        let tomorrow = new Date();
        tomorrow.setUTCHours(0, 0, 0, 0);
        tomorrow.setDate(now.getUTCDate() + 1);

        let waitTime = tomorrow - now;
        logInfo(`? Selesai untuk hari ini. Menunggu hingga ${tomorrow.toISOString()}...\n`);
        sendTelegramMessage("Transaksi hari ini selesai. Menunggu hingga besok.");

        await delay(waitTime + Math.floor(Math.random() * 3 * 60 * 1000));
    }
}

// === Mulai Loop ===
startDailyLoop();
