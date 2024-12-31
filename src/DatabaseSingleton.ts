import sqlite3 from 'sqlite3';
import type { Database } from 'sqlite';
import { open } from 'sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

class DatabaseSingleton {
    private static instance: DatabaseSingleton;
    private db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

    private constructor() { }

    public static async getInstance(): Promise<DatabaseSingleton> {
        if (!DatabaseSingleton.instance) {
            DatabaseSingleton.instance = new DatabaseSingleton();
            await DatabaseSingleton.instance.initialize();
        }
        return DatabaseSingleton.instance;
    }

    private async initialize() {
        const dbDir = path.join(__dirname, '../db');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        try {
            this.db = await open({
                filename: path.join(dbDir, 'database.db'),
                driver: sqlite3.Database
            });

            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS trades (
                    "buyDate"	INTEGER NOT NULL,
                    "symbol"	TEXT NOT NULL,
                    "buyPrice"	REAL NOT NULL,
                    "sellPrice"	REAL,
                    "sellDate"	INTEGER,
                    "open"	INTEGER NOT NULL,
                    PRIMARY KEY("buyDate","symbol")
                )
            `);

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.db = null;
        }
    }

    public getDb(): Database<sqlite3.Database, sqlite3.Statement> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
}

export default DatabaseSingleton;
