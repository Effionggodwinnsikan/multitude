process.env.RUN_STARTUP_MIGRATIONS = 'false';

const { initDb, migrateDb } = await import('./db.js');

await initDb();
await migrateDb();

console.log('Database migration complete');
