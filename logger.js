
// Logger centralisé pour l'application
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.logFile = path.join(__dirname, 'logs', 'app.log');
        this.ensureLogDirectory();
    }
    
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    
    log(level, message, error = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            error: error ? {
                message: error.message,
                stack: error.stack,
                code: error.code
            } : null
        };
        
        // En production, écrire dans le fichier
        if (this.isProduction) {
            this.writeToFile(logEntry);
        } else {
            // En développement, console.log avec formatage
            this.writeToConsole(logEntry);
        }
    }
    
    writeToFile(entry) {
        const logLine = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.logFile, logLine);
    }
    
    writeToConsole(entry) {
        const colors = {
            error: '\x1b[31m',   // rouge
            warn: '\x1b[33m',    // jaune
            info: '\x1b[36m',    // cyan
            debug: '\x1b[37m',   // blanc
            reset: '\x1b[0m'     // reset
        };
        
        const color = colors[entry.level] || colors.info;
        const reset = colors.reset;
        
        console.log(`${color}[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${reset}`);
        
        if (entry.error) {
            console.log(`${color}Error: ${entry.error.message}${reset}`);
            if (entry.error.stack) {
                console.log(`${color}Stack: ${entry.error.stack}${reset}`);
            }
        }
    }
    
    // Méthodes pratiques
    error(message, error = null) {
        this.log('error', message, error);
    }
    
    warn(message, error = null) {
        this.log('warn', message, error);
    }
    
    info(message) {
        this.log('info', message);
    }
    
    debug(message) {
        if (!this.isProduction) {
            this.log('debug', message);
        }
    }
}

module.exports = new Logger();
