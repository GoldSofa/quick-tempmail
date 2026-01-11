'use client';

import { useState, useEffect, useCallback } from 'react';
import { AddressBar } from './address-bar';
import { MailBox } from './mail-box';
import { TempMailInfo } from './temp-mail-info';
import { RecentPosts } from './recent-posts';
import { Faq } from '../faq';
import { useTranslations } from 'next-intl';
import { Section } from '@/shared/types/blocks/landing';

const AUTO_REFRESH_INTERVAL = 180; // 180 seconds

export function TempMail() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);
    const [hasEmails, setHasEmails] = useState(false);
    const t = useTranslations('landing');
    const faqData = t.raw('faq') as Section;

    const handleRefresh = useCallback(() => {
        setRefreshTrigger((prev) => prev + 1);
        setCountdown(AUTO_REFRESH_INTERVAL); // Reset countdown after refresh
    }, []);

    // Countdown timer
    useEffect(() => {
        if (hasEmails) return; // Stop countdown if there are emails

        const intervalId = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    handleRefresh();
                    return AUTO_REFRESH_INTERVAL;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [handleRefresh, hasEmails]);

    const handleMailsUpdate = useCallback((count: number) => {
        setHasEmails(count > 0);
    }, []);

    return (
        <div className="container py-8 pt-32 pb-16">
            <AddressBar onRefresh={handleRefresh} countdown={hasEmails ? 0 : countdown} />
            <MailBox refreshTrigger={refreshTrigger} onMailsUpdate={handleMailsUpdate} />
            <TempMailInfo />
            {faqData && <Faq section={faqData} />}
            <RecentPosts />
        </div>
    );
}

