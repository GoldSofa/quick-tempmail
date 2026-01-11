
import { type NextRequest, NextResponse } from 'next/server';
import { desc, eq, and } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { emailHistory } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({ headers: req.headers });

        if (!session?.user) {
            return NextResponse.json({ code: 401, message: 'Unauthorized' }, { status: 401 });
        }

        const history = await db()
            .select()
            .from(emailHistory)
            .where(eq(emailHistory.userId, session.user.id))
            .orderBy(desc(emailHistory.createdAt))
            .limit(50); // Fetch more to allow for local deduplication if needed

        // Deduplicate in memory (keep latest) and include JWT
        const uniqueEmails = new Set<string>();
        const cleanedHistory: { email: string; jwt: string | null }[] = [];

        for (const item of history) {
            if (!uniqueEmails.has(item.email)) {
                uniqueEmails.add(item.email);
                cleanedHistory.push({ email: item.email, jwt: item.jwt });
            }
            if (cleanedHistory.length >= 10) break;
        }

        return NextResponse.json({
            code: 0,
            data: cleanedHistory,
        });
    } catch (error) {
        console.error('Failed to fetch email history:', error);
        return NextResponse.json({ code: 500, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({ headers: req.headers });

        if (!session?.user) {
            return NextResponse.json({ code: 401, message: 'Unauthorized' }, { status: 401 });
        }

        const { email, jwt } = await req.json();

        if (!email) {
            return NextResponse.json({ code: 400, message: 'Email is required' }, { status: 400 });
        }

        // Ensure uniqueness: Delete existing entry for this email before inserting
        await db()
            .delete(emailHistory)
            .where(
                and(
                    eq(emailHistory.userId, session.user.id),
                    eq(emailHistory.email, email)
                )
            );

        // Insert new email with JWT
        await db().insert(emailHistory).values({
            id: getUuid(),
            userId: session.user.id,
            email,
            jwt: jwt || null, // Store the JWT token
        });

        // Prune old history if > 10 (Fetch all unique, delete extra)
        // Since we just ensured the new one is latest and unique, we just need to keep latest 10.
        const userHistory = await db()
            .select({ id: emailHistory.id })
            .from(emailHistory)
            .where(eq(emailHistory.userId, session.user.id))
            .orderBy(desc(emailHistory.createdAt));

        if (userHistory.length > 10) {
            const idsToDelete = userHistory.slice(10).map((h) => h.id);
            if (idsToDelete.length > 0) {
                // Use a loop or 'inArray' if available (drizzle usually supports inArray)
                // For safety and compatibility with standard Drizzle operators:
                const { inArray } = await import('drizzle-orm');
                await db().delete(emailHistory).where(inArray(emailHistory.id, idsToDelete));
            }
        }

        return NextResponse.json({ code: 0, message: 'Success' });
    } catch (error) {
        console.error('Failed to save email history:', error);
        return NextResponse.json({ code: 500, message: 'Internal Server Error' }, { status: 500 });
    }
}
