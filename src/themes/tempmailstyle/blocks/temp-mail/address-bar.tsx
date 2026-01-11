'use client';

import { useEffect, useState, useRef } from 'react';
import { Copy, RefreshCw, ChevronDown, Sparkles, X, AlertCircle, Shuffle, Zap } from 'lucide-react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { tempMailClient } from '@/core/temp-mail-api/client';

// localStorage key for storing email history
const EMAIL_HISTORY_KEY = 'tempmail_email_history';
const DEFAULT_MAX_HISTORY = 2;
const PREMIUM_MAX_HISTORY = 10;

// Available domains for selection
const AVAILABLE_DOMAINS = ['nzsmcguide.com'];

interface AddressBarProps {
    onRefresh: () => void;
    countdown: number;
}

export function AddressBar({ onRefresh, countdown }: AddressBarProps) {
    const t = useTranslations('landing.temp-mail.address_bar');
    const router = useRouter();
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [emailHistory, setEmailHistory] = useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Premium State
    const [isPremium, setIsPremium] = useState(false);
    const [isMembershipChecked, setIsMembershipChecked] = useState(false);

    // Change Email Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmailName, setNewEmailName] = useState('');
    const [selectedDomain, setSelectedDomain] = useState(AVAILABLE_DOMAINS[0]);
    const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
    const [modalError, setModalError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const domainDropdownRef = useRef<HTMLDivElement>(null);

    // Sync history from cloud - returns true if successfully loaded and switched to a cloud email
    const syncFromCloud = async (): Promise<boolean> => {
        try {
            const res = await fetch('/api/user/email-history');
            const data = await res.json();
            if (data.code === 0 && Array.isArray(data.data) && data.data.length > 0) {
                const cloudHistory: { email: string; jwt: string | null }[] = data.data;

                // Extract email addresses for display
                const emailList = cloudHistory.map(item => item.email);
                setEmailHistory(emailList);

                // Save all JWT mappings from cloud to local storage
                for (const item of cloudHistory) {
                    if (item.jwt) {
                        tempMailClient.saveAddressJwtMapping(item.email, item.jwt);
                    }
                }

                // Attempt to switch to the latest cloud email
                const latestItem = cloudHistory[0];
                if (latestItem.jwt) {
                    // We have the JWT from cloud, use it directly
                    tempMailClient.setJwt(latestItem.jwt);
                    tempMailClient.saveAddressJwtMapping(latestItem.email, latestItem.jwt);
                    setAddress(latestItem.email);
                    return true;
                } else {
                    // No JWT stored in cloud for this email (legacy data)
                    // Try local JWT first
                    const localJwt = tempMailClient.getJwtForAddress(latestItem.email);
                    if (localJwt) {
                        tempMailClient.setJwt(localJwt);
                        setAddress(latestItem.email);
                        return true;
                    }
                    // No JWT available - user will need to switch to another email or create new
                    // Still show the history for switching
                    setAddress(latestItem.email);
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error('Failed to sync history from cloud:', e);
            return false;
        }
    };

    // Check membership status - returns true if user is premium
    const checkMembership = async (): Promise<boolean> => {
        try {
            const response = await fetch('/api/user/get-subscription-status');
            const res = await response.json();
            if (res.code === 0 && res.data) {
                setIsPremium(true);
                setIsMembershipChecked(true);
                return true;
            } else {
                setIsPremium(false);
                setIsMembershipChecked(true);
                return false;
            }
        } catch (error) {
            console.error('Failed to check membership:', error);
            setIsPremium(false);
            setIsMembershipChecked(true);
            return false;
        }
    };

    // 从 localStorage 加载邮箱历史记录
    const loadEmailHistory = (): string[] => {
        if (typeof window === 'undefined') return [];
        try {
            const history = localStorage.getItem(EMAIL_HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch {
            return [];
        }
    };

    // Switch to a local email from history - returns true if successful
    const switchToLocalEmail = (email: string): boolean => {
        const jwt = tempMailClient.getJwtForAddress(email);
        if (jwt) {
            tempMailClient.setJwt(jwt);
            setAddress(email);
            return true;
        }
        return false;
    };

    // 保存邮箱到历史记录 (only for non-premium users or explicit user actions)
    const saveToHistory = async (email: string, syncToCloud: boolean = false) => {
        if (typeof window === 'undefined' || !email) return;
        try {
            let history = loadEmailHistory();
            // 移除重复的邮箱
            history = history.filter((e) => e !== email);
            // 添加到开头
            history.unshift(email);
            // 保留最多 N 个
            const limit = isPremium ? PREMIUM_MAX_HISTORY : DEFAULT_MAX_HISTORY;
            history = history.slice(0, limit);
            localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(history));
            setEmailHistory(history);

            // Sync to cloud if premium and explicitly requested
            if (isPremium && syncToCloud) {
                // Get the JWT for this email to save to cloud
                const jwt = tempMailClient.getJwtForAddress(email);
                fetch('/api/user/email-history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, jwt: jwt || null }),
                }).catch(e => console.error('Cloud save failed:', e));
            }
        } catch (error) {
            console.error('Failed to save email history:', error);
        }
    };

    // Create a new temporary email (for non-premium or when explicitly requested)
    const createNewTemporaryEmail = async () => {
        setLoading(true);
        try {
            const settings = await tempMailClient.getSettings();
            setAddress(settings.address);
            // Save to local history for non-premium users
            if (!isPremium) {
                saveToHistory(settings.address, false);
            } else {
                // For premium, save to cloud
                saveToHistory(settings.address, true);
            }
            // Save JWT mapping
            const currentJwt = tempMailClient.getJwt();
            if (currentJwt) {
                tempMailClient.saveAddressJwtMapping(settings.address, currentJwt);
            }
        } catch (error) {
            console.error('Failed to create new email:', error);
            toast.error(t('loading_error') || 'Failed to load address');
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        const initialize = async () => {
            setLoading(true);

            // 1. Check if user is premium
            const userIsPremium = await checkMembership();

            if (userIsPremium) {
                // PREMIUM USER: Load from cloud ONLY - NO auto-generation
                const cloudLoaded = await syncFromCloud();
                if (!cloudLoaded) {
                    // Premium user but no cloud history
                    // Don't auto-create - they can use the "Change" button to create one
                    setAddress('');
                }
            } else {
                // NON-PREMIUM USER: Load from local storage
                const localHistory = loadEmailHistory();
                setEmailHistory(localHistory);

                if (localHistory.length > 0) {
                    // Try to switch to the first local email
                    const switched = switchToLocalEmail(localHistory[0]);
                    if (switched) {
                        setLoading(false);
                        return;
                    }
                }
                // No local history or couldn't switch - create a new temporary email
                await createNewTemporaryEmail();
            }

            setLoading(false);
        };

        initialize();
    }, []);

    // Prune history for NON-PREMIUM users only
    // Premium users' history is managed by the cloud, no local pruning needed
    useEffect(() => {
        // Skip if not checked yet
        if (!isMembershipChecked) return;

        // Skip for premium users - their data is cloud-managed
        if (isPremium) return;

        // For non-premium, enforce the 2-email limit on localStorage
        const history = loadEmailHistory();
        if (history.length > DEFAULT_MAX_HISTORY) {
            const trimmed = history.slice(0, DEFAULT_MAX_HISTORY);
            localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(trimmed));
            setEmailHistory(trimmed);
        }
    }, [isPremium, isMembershipChecked]);


    // 点击外部关闭下拉框
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target as Node)) {
                setIsDomainDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCopy = () => {
        toast.success(t('copy_success'));
    };

    // 选择历史邮箱
    const handleSelectEmail = async (email: string) => {
        // 如果选择的是当前邮箱，直接关闭下拉框
        if (email === address) {
            setIsDropdownOpen(false);
            return;
        }

        setIsDropdownOpen(false);

        // Try to switch using existing JWT
        const switched = tempMailClient.switchToAddress(email);
        if (switched) {
            setAddress(email);
            // For premium, sync to cloud to update order
            if (isPremium) {
                saveToHistory(email, true);
            } else {
                saveToHistory(email, false);
            }
            onRefresh();
            toast.success(t('switch_success', { email }));
            return;
        }

        // JWT not found locally - try to recover by re-creating the address
        try {
            const [name, domain] = email.split('@');
            if (name && domain) {
                setLoading(true);
                const result = await tempMailClient.createCustomAddress(name, domain);

                if (result.success && result.jwt) {
                    tempMailClient.saveAddressJwtMapping(email, result.jwt);
                    setAddress(email);
                    // For premium, sync to cloud to update order
                    if (isPremium) {
                        saveToHistory(email, true);
                    } else {
                        saveToHistory(email, false);
                    }
                    onRefresh();
                    toast.success(t('switch_success', { email }));
                    setLoading(false);
                    return;
                }

                // Check if it's an "already exists" error - in this case, the address is claimed by someone else
                // or there's an issue with the backend. Show a specific message.
                if (result.error?.toLowerCase().includes('already exists') ||
                    result.error?.includes('已存在')) {
                    setLoading(false);
                    // This address exists on the server but we can't get access
                    // This could happen if the address was created on another device and the JWT mapping was lost
                    toast.error(t('switch_error_exists') || '该邮箱已存在，无法切换。请尝试创建新邮箱。');
                    return;
                }

                console.error('Failed to recover email:', result.error);
            }
        } catch (err) {
            console.error('Failed to recover email access:', err);
        }

        setLoading(false);
        toast.error(t('switch_error'));
    };

    // 升级按钮点击
    const handleUpgrade = () => {
        router.push('/pricing');
        setIsDropdownOpen(false);
    };

    // 打开 Change 弹窗
    const handleOpenChangeModal = () => {
        // Non-premium limit check for manual creation?
        // Actually history limit implicitly limits concurrent *usage/switching*.
        // If they try to create a 3rd one while non-premium, saveToHistory will drop the oldest one.
        // This effectively limits them to 2 "active" in the list.
        // User asked: "Support user can add simultaneously use 10 temp emails".
        // So dropping the oldest one is the correct behavior for limiting "simultaneous usage".
        setIsModalOpen(true);
        setNewEmailName('');
        setModalError('');
        setSelectedDomain(AVAILABLE_DOMAINS[0]);
    };

    // 关闭弹窗
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewEmailName('');
        setModalError('');
    };

    // 生成随机邮箱名
    const handleRandomName = () => {
        const randomName = tempMailClient.generateRandomName();
        setNewEmailName(randomName);
        setModalError('');
    };

    // 创建新邮箱
    const handleCreateEmail = async () => {
        // 验证输入
        if (!newEmailName.trim()) {
            setModalError(t('modal.error_empty_name'));
            return;
        }

        setIsCreating(true);
        setModalError('');

        try {
            const result = await tempMailClient.createCustomAddress(newEmailName.trim(), selectedDomain);

            if (result.success) {
                const newAddress = `${newEmailName.trim()}@${selectedDomain}`;
                setAddress(newAddress);
                // 保存新邮箱地址与JWT的映射关系 (需要先保存，saveToHistory会读取它)
                if (result.jwt) {
                    tempMailClient.saveAddressJwtMapping(newAddress, result.jwt);
                }
                // Premium用户同步到云端，非Premium用户只保存本地
                saveToHistory(newAddress, isPremium);
                toast.success(t('modal.success'));
                handleCloseModal();
                // 刷新邮箱列表
                onRefresh();
            } else {
                // 检查是否是地址已存在的错误
                if (result.error?.toLowerCase().includes('already exists') ||
                    result.error?.includes('已存在')) {
                    setModalError(t('modal.error_exists'));
                } else {
                    setModalError(result.error || t('modal.error_unexpected'));
                }
            }
        } catch (error) {
            console.error('Failed to create email:', error);
            setModalError(t('modal.error_unexpected'));
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border shadow-sm">
                {/* 邮箱地址选择器 - 单独一行居中 */}
                <div className="w-full relative" ref={dropdownRef}>
                    {/* 可点击的输入框区域 */}
                    <div
                        className="flex items-center justify-center w-full h-10 px-3 py-1 rounded-md border border-input bg-transparent shadow-xs cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span className="flex-1 text-center font-mono text-lg truncate" suppressHydrationWarning>
                            {loading ? t('loading') : (address || (isPremium ? t('no_email_premium') : t('loading')))}
                        </span>
                        <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''
                                }`}
                        />
                    </div>

                    {/* 下拉菜单 */}
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                            {/* 历史邮箱列表 */}
                            {emailHistory.length > 0 && (
                                <div className="py-1">
                                    {emailHistory.map((email, index) => (
                                        <div
                                            key={index}
                                            className={`px-4 py-2 text-center font-mono text-sm cursor-pointer transition-colors ${email === address
                                                ? 'bg-primary/10 text-primary'
                                                : 'hover:bg-muted/50'
                                                }`}
                                            onClick={() => handleSelectEmail(email)}
                                        >
                                            {email}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 分隔线 */}
                            <div className="border-t border-border"></div>

                            {/* 升级按钮 - 只在非会员时显示，或者显示不同文案 */}
                            {!isPremium && (
                                <div className="p-2">
                                    <button
                                        onClick={handleUpgrade}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        <span suppressHydrationWarning>{t('upgrade_tip')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 复制、修改和刷新按钮 - 另起一行居中 */}
                <div className="flex items-center justify-center gap-4">
                    <CopyToClipboard text={address} onCopy={handleCopy}>
                        <Button variant="outline" className="gap-2" title={t('copy')}>
                            <Copy className="h-4 w-4" />
                            <span suppressHydrationWarning>{t('copy')}</span>
                        </Button>
                    </CopyToClipboard>

                    {/* Change 按钮 */}
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleOpenChangeModal}
                        title={t('change')}
                    >
                        <Shuffle className="h-4 w-4" />
                        <span suppressHydrationWarning>{t('change')}</span>
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="gap-2" onClick={onRefresh} title={t('refresh')}>
                            <RefreshCw className="h-4 w-4" />
                            <span suppressHydrationWarning>{t('refresh')}</span>
                        </Button>
                        {countdown > 0 && (
                            <span className="text-sm text-muted-foreground min-w-[40px] text-center" title="Auto-refresh countdown">
                                {countdown}s
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Email Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleCloseModal}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-xl font-semibold">
                                {t('modal.title').split(' ')[0]} <span className="text-orange-500">{t('modal.title').split(' ')[1] || 'email'}</span>
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-1 rounded-md hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">
                            {/* Error Message */}
                            {modalError && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        {modalError}
                                    </p>
                                </div>
                            )}

                            {/* Name Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">{t('modal.name_label')}</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t('modal.name_placeholder')}
                                        value={newEmailName}
                                        onChange={(e) => {
                                            setNewEmailName(e.target.value);
                                            setModalError('');
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleRandomName}
                                        className="shrink-0"
                                    >
                                        {t('modal.random_btn')}
                                    </Button>
                                </div>
                            </div>

                            {/* Domain Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">{t('modal.domain_label')}</label>
                                <div className="relative" ref={domainDropdownRef}>
                                    <div
                                        className="flex items-center justify-between w-full h-10 px-3 py-1 rounded-md border border-input bg-transparent cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                                    >
                                        <span className="text-sm">{selectedDomain}</span>
                                        <ChevronDown
                                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isDomainDropdownOpen ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </div>

                                    {isDomainDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
                                            {AVAILABLE_DOMAINS.map((domain) => (
                                                <div
                                                    key={domain}
                                                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${domain === selectedDomain
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'hover:bg-muted/50'
                                                        }`}
                                                    onClick={() => {
                                                        setSelectedDomain(domain);
                                                        setIsDomainDropdownOpen(false);
                                                    }}
                                                >
                                                    {domain}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Warning Box */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    <span className="font-semibold text-orange-500">{t('modal.warning_title')}</span>{' '}
                                    {t('modal.warning_text')}
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    {t('modal.important_note')}
                                </p>
                                <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-900">
                                    <Zap className="h-5 w-5 text-blue-500" />
                                    <span className="font-medium text-sm">{t('modal.alias_email')}</span>
                                    <span className="text-xs text-muted-foreground">{t('modal.alias_desc')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border">
                            <Button
                                className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-medium py-2"
                                onClick={handleCreateEmail}
                                disabled={isCreating}
                            >
                                {isCreating ? t('modal.creating') : t('modal.submit_btn')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

