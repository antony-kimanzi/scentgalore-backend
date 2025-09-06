import runMigrations from './initTables.js';
import pool from '../db/index.js';

async function executeMigrations() {
    try {
        await runMigrations();
        console.log("Database setup complete");
    }
    catch(error) {
        console.log("Failed to run migrations: ", error);
    }
    finally {
        pool.end();
        process.exit(0);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigrations();
}

export {executeMigrations};