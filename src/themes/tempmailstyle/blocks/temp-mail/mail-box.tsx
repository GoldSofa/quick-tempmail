'use client';

import { useEffect, useState } from 'react';
import { Mail as MailIcon, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/components/ui/card';
import { tempMailClient, Mail } from '@/core/temp-mail-api/client';

export function MailBox({ refreshTrigger, onMailsUpdate }: { refreshTrigger: number; onMailsUpdate: (count: number) => void }) {
    const t = useTranslations('landing.temp-mail.mail_box');
    const [mails, setMails] = useState<Mail[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMail, setSelectedMail] = useState<Mail | null>(null);

    const fetchMails = async () => {
        setLoading(true);
        // 清空当前邮件列表和选中的邮件，避免切换邮箱时显示旧邮件内容
        setSelectedMail(null);
        setMails([]);
        onMailsUpdate(0);
        try {
            const { results } = await tempMailClient.getMails();
            setMails(results);
            onMailsUpdate(results.length);
            // 如果有邮件，自动选中第一封
            if (results.length > 0) {
                setSelectedMail(results[0]);
            }
        } catch (error) {
            console.error('Failed to fetch mails:', error);
            toast.error(t('fetch_error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMails();
    }, [refreshTrigger]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await tempMailClient.deleteMail(id);
            const newMails = mails.filter((m) => m.id !== id);
            setMails(newMails);
            onMailsUpdate(newMails.length);
            if (selectedMail?.id === id) {
                setSelectedMail(newMails.length > 0 ? newMails[0] : null);
            }
            toast.success(t('delete_success'));
        } catch (error) {
            console.error('Failed to delete mail:', error);
            toast.error(t('delete_error') || 'Failed to delete mail');
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-20rem)] mt-4">
            {/* Mail List */}
            <Card className="md:col-span-1 flex flex-col h-full min-h-0">
                <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
                    <CardTitle className="text-lg">{t('inbox_title')}</CardTitle>
                    {loading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
                    <div className="h-full overflow-y-auto">
                        {mails.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                                {/* 监控动画 */}
                                <div className="relative mb-4">
                                    <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                </div>
                                <p className="text-sm font-medium" suppressHydrationWarning>{t('waiting_title')}</p>
                                <p className="text-xs mt-1 opacity-70" suppressHydrationWarning>{t('waiting_desc')}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y">
                                {mails.map((mail) => (
                                    <div
                                        key={mail.id}
                                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedMail?.id === mail.id ? 'bg-muted' : ''
                                            }`}
                                        onClick={() => setSelectedMail(mail)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium truncate max-w-[250px]">
                                                {mail.source}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(mail.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium truncate mb-1">
                                            {mail.subject}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {mail.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Mail Content */}
            <Card className="md:col-span-2 flex flex-col h-full min-h-0">
                <CardHeader className="py-4 border-b flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg" suppressHydrationWarning>
                            {selectedMail ? selectedMail.subject : t('select_mail')}
                        </CardTitle>
                        {selectedMail && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDelete(e, selectedMail.id)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        )}
                    </div>
                    {selectedMail && (
                        <CardDescription>
                            {t('from')}: {selectedMail.source} <br />
                            {t('to')}: {selectedMail.address} <br />
                            {t('date')}: {new Date(selectedMail.created_at).toLocaleString()}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
                    <div className="h-full overflow-y-auto p-4">
                        {selectedMail ? (
                            <div
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: selectedMail.message || selectedMail.text || '' }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <MailIcon className="h-12 w-12 mb-4 opacity-20" />
                                <p suppressHydrationWarning>{t('select_mail_desc')}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
