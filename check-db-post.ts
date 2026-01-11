import { db } from './src/core/db';
import { post } from './src/config/db/schema';
import { eq } from 'drizzle-orm';

async function checkPost() {
    try {
        const results = await db().select().from(post).where(eq(post.slug, 'what-is-xxx'));
        console.log('Database Posts for slug "what-is-xxx":');
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error('Error querying database:', e);
    }
}

checkPost();
