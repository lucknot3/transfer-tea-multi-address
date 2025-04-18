require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { ethers } = require("ethers");

// === Konfigurasi ===
const RPC_URL = process.env.RPC_URL;
if (!RPC_URL || !process.env.PRIVATE_KEY_1 || !process.env.TOKEN_ADDRESS_1) {
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

const TOKEN_ADDRESSES = [
    process.env.TOKEN_ADDRESS_1,
    process.env.TOKEN_ADDRESS_2,
    process.env.TOKEN_ADDRESS_3,
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

function getWalletAndTokenContract(privateKey, tokenAddress) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenContract = new ethers.Contract(tokenAddress, [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() view returns (uint8)",
    ], wallet);
    return { wallet, tokenContract };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount() {
    const min = 1000;
    const max = 3000;
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return ethers.parseUnits(value.toString(), 18);
}

async function waitWithRetry(tx, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            return await tx.wait(2);
        } catch (err) {
            if (err.code === 'UNKNOWN_ERROR' && err.error?.code === 429) {
                console.log(`🔁 Rate-limit Alchemy, retry dalam 5s...`);
                await delay(5000);
            } else {
                throw err;
            }
        }
    }
    throw new Error("❌ Gagal konfirmasi TX setelah beberapa kali retry.");
}

async function distributeTokens() {
    try {
        const allAddresses = await fetchKYCAddresses();
        if (allAddresses.length === 0) return;

        let sent = readAddressesFromFile("kyc_addresses_sent.txt");
        let pendingPrev = readAddressesFromFile("kyc_addresses_pending.txt");

        let recipients = allAddresses.filter(addr => !sent.includes(addr) || pendingPrev.includes(addr));
        writeAddressesToFile("kyc_addresses_pending.txt", []);

        if (recipients.length === 0) {
            logInfo("✅ Semua alamat KYC sudah menerima token.");
            return;
        }

        const txLimit = Math.min(recipients.length, Math.floor(300 + Math.random() * 30) + 1);
        logInfo(`🎯 Akan kirim ${txLimit} transaksi hari ini.`);

        const toSend = recipients.sort(() => 0.5 - Math.random());
        const failed = [];
        let txCount = 1;

        outerLoop:
        for (const recipient of toSend) {
            if (txCount > txLimit) break;

            const delayMs = randomDelay(50000, 100000);
            logInfo(`⌛ Delay ${Math.floor(delayMs / 1000)}s sebelum kirim ke ${recipient}`);
            await delay(delayMs);

            try {
                for (let i = 0; i < 3; i++) {
                    if (txCount > txLimit) break outerLoop;

                    const { wallet, tokenContract } = getWalletAndTokenContract(PRIVATE_KEYS[i], TOKEN_ADDRESSES[i]);

                    const amount = randomAmount();
                    logInfo(`🚀 TX #${txCount} - Kirim ${ethers.formatUnits(amount, 18)} token ke ${recipient} dari ${wallet.address}`);

                    const tx = await tokenContract.transfer(recipient, amount);
                    await waitWithRetry(tx);

                    const successMsg = `✅ *[TX #${txCount}]* Berhasil\n*Dari:* \`${wallet.address}\`\n*Ke:* \`${recipient}\`\n*Token:* \`${TOKEN_ADDRESSES[i]}\`\n*Jumlah:* \`${ethers.formatUnits(amount, 18)}\`\n[🔗 TX Hash](https://sepolia.tea.xyz/tx/${tx.hash})`;
                    logInfo(successMsg);
                    sendTelegramMessage(successMsg);

                    sent.push(recipient);
                    writeAddressesToFile("kyc_addresses_sent.txt", sent);

                    await delay(randomDelay(5000, 10000));
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
        logInfo(`📦 Distribusi selesai. Sukses: ${txCount - 1 - failed.length}, Gagal: ${failed.length}`);
    } catch (err) {
        logError("❌ Error distribusi utama: " + err.message);
    }
}

async function startDailyLoop() {
    while (true) {
        await distributeTokens();

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Target 07:00 WIB (UTC+7) besok pagi
        const targetWIB = new Date(tomorrow.getTime() + 7 * 60 * 60 * 1000);
        targetWIB.setHours(7, 0, 0, 0);
        const waitTime = targetWIB - now;

        logInfo(`✅ Selesai hari ini. Menunggu hingga ${targetWIB.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} (07:00 WIB)...`);
        await delay(waitTime + randomDelay(10000, 30000));
    }
}

startDailyLoop();
