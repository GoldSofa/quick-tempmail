import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://mailapi.nzsmcguide.com';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return handleRequest(request, await params);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return handleRequest(request, await params);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return handleRequest(request, await params);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return handleRequest(request, await params);
}

async function handleRequest(
    request: NextRequest,
    { path }: { path: string[] }
) {
    const searchParams = request.nextUrl.search;
    // Construct the target URL. 
    // If the client calls /api/temp-mail/api/settings, path is ['api', 'settings'].
    // We want to forward to https://mailapi.nzsmcguide.com/api/settings.
    const targetUrl = `${API_BASE}/${path.join('/')}${searchParams}`;

    console.log(`[Proxy] Forwarding ${request.method} ${request.url} to ${targetUrl}`);

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('accept-encoding');

    try {
        let body: any = undefined;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                body = await request.blob();
            } catch (e) {
                // No body or failed to read body
            }
        }

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: body,
            cache: 'no-store',
        });

        const data = await response.blob();

        const responseHeaders = new Headers(response.headers);
        // Remove headers that might cause issues
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('transfer-encoding');
        responseHeaders.delete('content-length');

        return new NextResponse(data, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to proxy request' },
            { status: 500 }
        );
    }
}
