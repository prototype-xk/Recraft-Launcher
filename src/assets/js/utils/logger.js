/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails)
 * UPDATE : Sauvegarde des historiques dans un fichier local
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

let console_log = console.log;
let console_info = console.info;
let console_warn = console.warn;
let console_debug = console.debug;
let console_error = console.error;

// Définition du chemin des logs (.recraft-launcher dans AppData)
const logDir = process.env.APPDATA ? path.join(process.env.APPDATA, '.recraft-launcher') : path.join(os.homedir(), '.recraft-launcher');
const logFile = path.join(logDir, 'launcher.log');

// Création du dossier et fichier au lancement
try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    // On réinitialise le fichier à chaque lancement pour éviter qu'il ne pèse très lourd
    fs.writeFileSync(logFile, `=== Lancement du Launcher : ${new Date().toLocaleString()} ===\n`);
} catch (e) {
    console_error("Erreur de création du dossier de log :", e);
}

// Fonction d'écriture avec anti-crash
function writeToFile(level, name, value) {
    try {
        let text = typeof value === 'object' ? JSON.stringify(value, Object.getOwnPropertyNames(value), 2) : value;
        fs.appendFileSync(logFile, `[${new Date().toLocaleTimeString()}] [${name}] [${level}] ${text}\n`);
    } catch (err) { }
}

class logger {
    constructor(name, color) {
        this.Logger(name, color)
    }

    async Logger(name, color) {
        console.log = value => {
            console_log.call(console, `%c[${name}]:`, `color: ${color};`, value);
            writeToFile('INFO', name, value);
        };

        console.info = value => {
            console_info.call(console, `%c[${name}]:`, `color: ${color};`, value);
            writeToFile('INFO', name, value);
        };

        console.warn = value => {
            console_warn.call(console, `%c[${name}]:`, `color: ${color};`, value);
            writeToFile('WARN', name, value);
        };

        console.debug = value => {
            console_debug.call(console, `%c[${name}]:`, `color: ${color};`, value);
            writeToFile('DEBUG', name, value);
        };

        console.error = value => {
            console_error.call(console, `%c[${name}]:`, `color: ${color};`, value);
            writeToFile('ERROR', name, value);
        };
    }
}

export default logger;
