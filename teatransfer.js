require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { ethers } = require("ethers");

// === Konfigurasi ===
const RPC_URL = process.env.RPC_URL;
if (!RPC_URL || !process.env.PRIVATE_KEY_1) {
    console.error("❌ ERROR: Pastikan file .env dikonfigurasi dengan benar.");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL, {
    chainId: 10218,
    name: "tea-sepolia",
});

const PRIVATE_KEYS = [
    process.env.PRIVATE_KEY_1,
    process.env.PRIVATE_KEY_2,
    process.env.PRIVATE_KEY_3,
];

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// === Logging ===
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFile = path.join(logDir, `log-${new Date().toISOString().split("T")[0]}.txt`);
const logStream = fs.createWriteStream(logFile, { flags: "a" });

function logMessage(level, message) {
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    logStream.write(line);
    console.log(line);
}

function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown"
    }).catch(err => console.error("Gagal kirim ke Telegram:", err.message));
}

function logInfo(message) {
    logMessage("INFO", message);
    if (/Transaksi/.test(message)) sendTelegramMessage(message);
}

function logError(message) {
    logMessage("ERROR", message);
    sendTelegramMessage(`❌ *Error:* ${message}`);
}

// === File Address Utilities ===
function readAddressesFromFile(file) {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, "utf8")
        .split("\n")
        .map(x => x.trim().toLowerCase())
        .filter(Boolean);
}

function writeAddressesToFile(file, addresses) {
    fs.writeFileSync(file, [...new Set(addresses)].join("\n"), "utf8");
}

// === Fetch KYC ===
async function fetchKYCAddresses() {
    try {
        logInfo("⬇️ Mengunduh daftar alamat KYC...");
        const res = await axios.get("https://raw.githubusercontent.com/clwkevin/LayerOS/main/addressteasepoliakyc.txt");
        return res.data.split("\n").map(x => x.trim().toLowerCase()).filter(Boolean);
    } catch (err) {
        logError("❌ Gagal ambil data KYC: " + err.message);
        return [];
    }
}

// === Wallet Only ===
function getWallet(privateKey) {
    return new ethers.Wallet(privateKey, provider);
}

// === Delay Tools ===
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTEAAmount() {
    const min = 0.07;
    const max = 0.12;
    const random = Math.random() * (max - min) + min;
    return ethers.parseEther(random.toFixed(5));
}

// === Distribusi Token Native ===
async function distributeTokens() {
    try {
        const allAddresses = await fetchKYCAddresses();
        if (allAddresses.length === 0) return;

        let sent = readAddressesFromFile("kyc_addresses_sent.txt");
        let pendingPrev = readAddressesFromFile("kyc_addresses_pending.txt");

        let recipients = allAddresses.filter(addr => !sent.includes(addr) || pendingPrev.includes(addr));
        writeAddressesToFile("kyc_addresses_pending.txt", []);

        if (recipients.length === 0) {
            logInfo("✅ Semua alamat KYC sudah menerima TEA native.");
            return;
        }

        const txLimit = Math.min(recipients.length, Math.floor(303 + Math.random() * 13)); // ≈ 303 - 315 transaksi
        logInfo(`🎯 Akan kirim ${txLimit} transaksi hari ini.`);

        const toSend = recipients.slice(0, txLimit).sort(() => 0.5 - Math.random());
        const failed = [];
        let txCount = 1;

        for (const recipient of toSend) {
            const delayMs = randomDelay(60000, 180000); // 60s - 180s delay antar wallet
            logInfo(`⌛ Delay ${Math.floor(delayMs / 1000)}s sebelum kirim ke ${recipient}`);
            await delay(delayMs);

            try {
                for (let i = 0; i < 3; i++) {
                    const wallet = getWallet(PRIVATE_KEYS[i]);
                    const amount = randomTEAAmount();

                    logInfo(`🚀 TX #${txCount} - Kirim TEA ke ${recipient} dari ${wallet.address}`);
                    const tx = await wallet.sendTransaction({
                        to: recipient,
                        value: amount,
                        gasLimit: 21000
                    });
                    await tx.wait(2);

                    const successMsg = `✅ *[TX #${txCount}]* Berhasil\n*Dari:* \`${wallet.address}\`\n*Ke:* \`${recipient}\`\n*Jumlah:* ${ethers.formatEther(amount)} TEA\n[🔗 TX Hash](https://sepolia.tea.xyz/tx/${tx.hash})`;
                    logInfo(successMsg);
                    sendTelegramMessage(successMsg);

                    sent.push(recipient);
                    writeAddressesToFile("kyc_addresses_sent.txt", sent);

                    await delay(randomDelay(30000, 70000)); // 30s - 70s delay antar TX dari wallet berbeda
                    txCount++;
                }
            } catch (err) {
                const failMsg = `❌ *[TX #${txCount}]* GAGAL\n*Ke:* \`${recipient}\`\n*Error:* \`${err.message}\``;
                logError(failMsg);
                failed.push(recipient);
                txCount++;
            }
        }

        writeAddressesToFile("kyc_addresses_pending.txt", failed);
        logInfo(`📦 Distribusi selesai. Sukses: ${txLimit - failed.length}, Gagal: ${failed.length}`);
    } catch (err) {
        logError("❌ Error distribusi utama: " + err.message);
    }
}

// === Loop Harian ===
async function startDailyLoop() {
    while (true) {
        await distributeTokens();
        const now = new Date();
        const next = new Date();
        next.setUTCHours(0, 0, 0, 0);
        next.setUTCDate(now.getUTCDate() + 1);
        const waitTime = next - now;

        logInfo(`✅ Selesai untuk hari ini. Menunggu hingga ${next.toISOString()}...\n`);
        await delay(waitTime + Math.floor(180000 * Math.random()));
    }
}

// === Mulai ===
startDailyLoop();
