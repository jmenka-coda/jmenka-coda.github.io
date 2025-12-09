/**
 * Configuration manager
 */
const fs = require('fs');
const path = require('path');

class Config {
    constructor() {
        this.config = {};
        this.loadConfig();
    }

    loadConfig() {
        const configPath = path.join(process.cwd(), 'config', 'default.json');

        try {
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                this.config = JSON.parse(configData);
            }
        } catch (error) {
            console.error('Error loading config:', error);
            // Use default config if loading fails
            this.config = {
                server: { port: 4000, host: 'localhost' },
                socket: { cors: { origin: '*', methods: ['GET', 'POST'] } },
                rooms: { maxNameLength: 50, minNameLength: 2, cleanupInterval: 300000 }
            };
        }

        // Override with environment variables
        this.config.server.port = process.env.PORT || this.config.server.port;
        this.config.server.host = process.env.HOST || this.config.server.host;
        this.config.server.env = process.env.NODE_ENV || 'development';
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
    }

    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!obj[k]) obj[k] = {};
            return obj[k];
        }, this.config);
        target[lastKey] = value;
    }

    getAll() {
        return { ...this.config };
    }
}

module.exports = new Config();
