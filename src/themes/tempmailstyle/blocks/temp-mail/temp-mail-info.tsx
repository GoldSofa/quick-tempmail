'use client';

import { useState } from 'react';
import { ChevronDown, Shield, Clock, Eye, Mail, TestTube, Gift, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export function TempMailInfo() {
    const t = useTranslations('landing.temp-mail.info');
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <Card className="mt-6">
            <CardHeader
                className="py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        {t('title')}
                    </CardTitle>
                    <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            }`}
                    />
                </div>
            </CardHeader>

            {/* 默认显示的简短介绍 */}
            <CardContent className="pt-0 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('short_desc')}
                </p>

                {/* 展开后显示的详细内容 */}
                {isExpanded && (
                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Key Features */}
                        <div>
                            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                {t('features_title')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <Clock className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                                    <span>{t('feature_expiry')}</span>
                                </div>
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <Eye className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                                    <span>{t('feature_anonymity')}</span>
                                </div>
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <Inbox className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                    <span>{t('feature_receive_only')}</span>
                                </div>
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <Shield className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                                    <span>{t('feature_security')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Common Use Cases */}
                        <div>
                            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                                <TestTube className="h-4 w-4 text-primary" />
                                {t('use_cases_title')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <span className="text-red-500 font-bold shrink-0">🚫</span>
                                    <span>{t('use_case_spam')}</span>
                                </div>
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <span className="text-blue-500 font-bold shrink-0">📖</span>
                                    <span>{t('use_case_gated')}</span>
                                </div>
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <TestTube className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                                    <span>{t('use_case_testing')}</span>
                                </div>
                                <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                                    <Gift className="h-4 w-4 mt-0.5 text-pink-500 shrink-0" />
                                    <span>{t('use_case_trials')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 展开/收起提示 */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
                >
                    {isExpanded ? t('show_less') : t('learn_more')}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </CardContent>
        </Card>
    );
}
