import { envConfigs } from '@/config';
import PostalMime from 'postal-mime';

const API_BASE = typeof window !== 'undefined' ? '/api/temp-mail' : (process.env.NEXT_PUBLIC_API_BASE || '/api/temp-mail');

export interface Mail {
    id: string;
    source: string;
    address: string;
    subject: string;
    // `message` is the raw email content
    message: string;
    // Parsed content from `message`
    html?: string;
    plainText?: string; // Renamed from `text` for clarity after parsing
    text?: string; // Keep text for compatibility if needed, but populate it from parsed result
    attachments?: any[];
    created_at: string;
    metadata?: any;
    raw?: string; // Sometimes API might return raw in 'raw' field? Based on vue app it seems it's in 'raw' or 'message'
}

export interface Settings {
    address: string;
    auto_reply: boolean;
    send_balance: number;
}

class TempMailClient {
    private jwt: string = '';
    private userJwt: string = '';

    constructor() {
        if (typeof window !== 'undefined') {
            this.jwt = localStorage.getItem('jwt') || '';
            this.userJwt = localStorage.getItem('user_jwt') || '';
        }
    }

    private async fetch<T>(path: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        const { skipAuth, ...fetchOptions } = options;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string> || {}),
        };

        if (this.jwt && !skipAuth) {
            headers['Authorization'] = `Bearer ${this.jwt}`;
        }

        if (this.userJwt) {
            headers['x-user-token'] = this.userJwt;
        }

        const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        return response.json();
    }

    async getSettings(): Promise<Settings> {
        // If we don't have a JWT, try to create an address first
        if (!this.jwt) {
            await this.createAddress();
        }
        const res = await this.fetch<any>('/api/settings');
        return {
            address: res.address,
            auto_reply: res.auto_reply,
            send_balance: res.send_balance,
        };
    }

    async getMails(limit: number = 20, offset: number = 0): Promise<{ results: Mail[], count: number }> {
        if (!this.jwt) {
            // If no JWT, we can't fetch mails, return empty
            return { results: [], count: 0 };
        }
        const { results, count } = await this.fetch<{ results: Mail[], count: number }>(`/api/mails?limit=${limit}&offset=${offset}`);

        // Parse each mail to extract subject and snippet
        const parsedResults = await Promise.all(results.map(mail => this.parseMail(mail)));

        return { results: parsedResults, count };
    }

    async getMail(id: string): Promise<Mail> {
        const mail = await this.fetch<Mail>(`/api/mail/${id}`);
        return this.parseMail(mail);
    }

    private async parseMail(mail: Mail): Promise<Mail> {
        const rawContent = mail.raw || mail.message;

        if (!rawContent) return mail;

        try {
            const parser = new PostalMime();
            const parsedEmail = await parser.parse(rawContent);

            return {
                ...mail,
                raw: rawContent,
                source: parsedEmail.from?.address ? (parsedEmail.from.name ? `${parsedEmail.from.name} <${parsedEmail.from.address}>` : parsedEmail.from.address) : mail.source,
                subject: parsedEmail.subject || 'No Subject',
                message: parsedEmail.html || (parsedEmail.text ? parsedEmail.text.replace(/\n/g, '<br>') : '') || rawContent,
                html: parsedEmail.html || undefined,
                plainText: parsedEmail.text || undefined,
                text: parsedEmail.text || '',
                attachments: parsedEmail.attachments || [],
            };
        } catch (error) {
            console.error("Failed to parse email message with PostalMime:", error);
            return {
                ...mail,
                subject: mail.subject || 'Error parsing email',
                text: mail.text || 'Error parsing email',
            };
        }
    }

    async deleteMail(id: string): Promise<void> {
        return this.fetch(`/api/mails/${id}`, { method: 'DELETE' });
    }

    async createAddress(): Promise<void> {
        const name = Math.random().toString(36).substring(2, 10);
        const domain = 'nzsmcguide.com';

        try {
            const res = await this.fetch<any>('/api/new_address', {
                method: 'POST',
                skipAuth: true,
                body: JSON.stringify({
                    name,
                    domain,
                    cf_token: '',
                }),
                headers: {
                    'x-fingerprint': '35aab3391fc914ed8b2fe84f1be9da94',
                    'x-lang': 'zh',
                }
            });

            if (res.jwt) {
                this.setJwt(res.jwt);
            }
        } catch (error) {
            console.error("Failed to create address", error);
            throw error;
        }
    }

    async createCustomAddress(name: string, domain: string): Promise<{
        success: boolean;
        jwt?: string;
        address?: string;
        error?: string;
    }> {
        try {
            const response = await this.fetch<any>('/api/new_address', {
                method: 'POST',
                skipAuth: true,
                headers: {
                    'x-fingerprint': '35aab3391fc914ed8b2fe84f1be9da94',
                    'x-lang': 'zh',
                },
                body: JSON.stringify({
                    name,
                    domain,
                    cf_token: '',
                }),
            });

            if (response.jwt) {
                this.setJwt(response.jwt);
                return {
                    success: true,
                    jwt: response.jwt,
                    address: `${name}@${domain}`,
                };
            }

            return {
                success: false,
                error: 'No JWT token received',
            };
        } catch (error) {
            console.error("Failed to create custom address", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    generateRandomName(): string {
        return Math.random().toString(36).substring(2, 10);
    }

    setJwt(jwt: string) {
        this.jwt = jwt;
        if (typeof window !== 'undefined') {
            localStorage.setItem('jwt', jwt);
        }
    }

    getJwt() {
        return this.jwt;
    }

    saveAddressJwtMapping(address: string, jwt: string) {
        if (typeof window === 'undefined' || !address || !jwt) return;
        try {
            const mappingKey = 'tempmail_address_jwt_mapping';
            const mapping = JSON.parse(localStorage.getItem(mappingKey) || '{}');
            mapping[address] = jwt;
            localStorage.setItem(mappingKey, JSON.stringify(mapping));
        } catch (error) {
            console.error('Failed to save address-jwt mapping:', error);
        }
    }

    getJwtForAddress(address: string): string | null {
        if (typeof window === 'undefined' || !address) return null;
        try {
            const mappingKey = 'tempmail_address_jwt_mapping';
            const mapping = JSON.parse(localStorage.getItem(mappingKey) || '{}');
            return mapping[address] || null;
        } catch {
            return null;
        }
    }

    switchToAddress(address: string): boolean {
        const jwt = this.getJwtForAddress(address);
        if (jwt) {
            this.setJwt(jwt);
            return true;
        }
        return false;
    }
}

export const tempMailClient = new TempMailClient();
