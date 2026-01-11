'use client';

import { useState, useEffect } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/core/i18n/navigation';
import { Post as PostType } from '@/shared/types/blocks/blog';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';

export function RecentPosts() {
    const locale = useLocale();
    const t = useTranslations('blog.page');
    const tLanding = useTranslations('landing.temp-mail.recent_posts');
    const [posts, setPosts] = useState<PostType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentPosts = async () => {
            try {
                const response = await fetch(`/api/blog/recent?locale=${locale}`);
                const result = await response.json();
                if (result.success) {
                    setPosts(result.data);
                }
            } catch (error) {
                console.error('Failed to fetch recent posts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentPosts();
    }, [locale]);

    if (loading) {
        return (
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-48 animate-pulse rounded-xl bg-muted/50" />
                ))}
            </div>
        );
    }

    if (posts.length === 0) return null;

    return (
        <div className="mt-16">
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                    {tLanding('title')}
                </h2>
                <Link
                    href="/blog"
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                    {tLanding('view_all')} <ArrowRight className="size-4" />
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {posts.map((post, idx) => (
                    <Link key={idx} href={post.url || '#'}>
                        <Card className="group h-full overflow-hidden border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
                            <CardContent className="flex h-full p-0">
                                {post.image && (
                                    <div className="hidden w-1/3 shrink-0 sm:block">
                                        <img
                                            src={post.image}
                                            alt={post.title || ''}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-1 flex-col p-5">
                                    <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight transition-colors group-hover:text-primary">
                                        {post.title}
                                    </h3>
                                    <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
                                        {post.description}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="size-3.5" />
                                            {post.created_at}
                                        </div>
                                        {(post.author_name || post.author_image) && (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="size-5">
                                                    <AvatarImage src={post.author_image || ''} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {post.author_name?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="hidden sm:inline">{post.author_name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
