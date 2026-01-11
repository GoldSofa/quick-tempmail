/**
 * Manual migration script to add jwt column to email_history table
 * Run with: npx tsx scripts/add-jwt-column.ts
 */

import postgres from 'postgres';

async function migrate() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is not set');
        process.exit(1);
    }

    const sql = postgres(databaseUrl);

    try {
        console.log('Checking if jwt column exists...');

        // Check if column exists
        const columnExists = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'email_history' 
            AND column_name = 'jwt'
        `;

        if (columnExists.length > 0) {
            console.log('jwt column already exists, skipping migration.');
        } else {
            console.log('Adding jwt column to email_history table...');
            await sql`
                ALTER TABLE email_history
                ADD COLUMN jwt TEXT
            `;
            console.log('jwt column added successfully!');
        }

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }

    console.log('Migration completed!');
}

migrate();
