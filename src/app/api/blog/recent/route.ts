import { NextResponse } from 'next/server';
import { getPostsAndCategories } from '@/shared/models/post';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const locale = searchParams.get('locale') || 'en';

        const { posts } = await getPostsAndCategories({
            locale,
            page: 1,
            limit: 4,
        });

        return NextResponse.json({
            success: true,
            data: posts,
        });
    } catch (error) {
        console.error('Failed to fetch recent posts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch recent posts' },
            { status: 500 }
        );
    }
}
