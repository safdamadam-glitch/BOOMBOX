require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const express = require("express");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || "";

const AUDIO_DIR = path.join(__dirname, "audio");

if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, {
        recursive: true
    });
}

app.use("/audio", express.static(AUDIO_DIR));

app.get("/", (req, res) => {
    res.send("Nexora Boombox Converter Online");
});

app.listen(PORT, () => {
    console.log(`Web server berjalan di port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", () => {
    console.log(`Bot online sebagai ${client.user.tag}`);
});

function isYouTubeURL(url) {
    return (
        url.includes("youtube.com/watch") ||
        url.includes("youtu.be/") ||
        url.includes("youtube.com/shorts/")
    );
}

function downloadAudio(url, output) {
    return new Promise((resolve, reject) => {

        execFile(
            "yt-dlp",
            [
                "--no-playlist",
                "-x",
                "--audio-format",
                "mp3",
                "--audio-quality",
                "128K",
                "-o",
                output,
                url
            ],
            {
                maxBuffer: 1024 * 1024 * 20
            },
            (error, stdout, stderr) => {

                if (error) {
                    console.log(stderr);
                    reject(error);
                    return;
                }

                resolve();
            }
        );

    });
}

client.on("messageCreate", async (message) => {

    if (message.author.bot) return;

    if (!message.content.startsWith("!convert")) return;

    const args = message.content.trim().split(/\s+/);
    const youtubeURL = args[1];

    if (!youtubeURL) {
        return message.reply(
            "❌ Masukkan link YouTube.\n\nContoh:\n`!convert https://youtu.be/xxxxx`"
        );
    }

    if (!isYouTubeURL(youtubeURL)) {
        return message.reply(
            "❌ Link yang kamu masukkan bukan link YouTube."
        );
    }

    const loading = await message.reply(
        "⏳ Sedang memproses audio..."
    );

    const filename =
        `audio-${Date.now()}-${Math.floor(Math.random() * 9999)}.mp3`;

    const output = path.join(
        AUDIO_DIR,
        filename
    );

    try {

        await downloadAudio(
            youtubeURL,
            output
        );

        if (!fs.existsSync(output)) {
            throw new Error("File MP3 tidak ditemukan.");
        }

        const directURL =
            `${BASE_URL}/audio/${filename}`;

        const embed = new EmbedBuilder()
            .setTitle("🎵 Boombox Converter")
            .setDescription(
                "Audio berhasil dikonversi menjadi MP3."
            )
            .addFields({
                name: "🔗 Link Boombox",
                value: `\`${directURL}\``
            })
            .setFooter({
                text: "Nexora Boombox"
            });

        await loading.edit({
            content: "✅ Berhasil!",
            embeds: [embed]
        });

    } catch (error) {

        console.log(error);

        await loading.edit(
            "❌ Gagal mengkonversi audio. Silakan coba link lain."
        );
    }
});

client.login(process.env.TOKEN);
