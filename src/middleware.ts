import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware global — adiciona CORS headers para requisições cross-origin.
 * Necessário quando o frontend estático (Alphimedia) consome a API (Render).
 * Não afeta o funcionamento normal (mesmo domínio).
 */
const ALLOWED_ORIGINS = [
  'https://encartesbrasil.3codenexus.com.br',
  'http://encartesbrasil.3codenexus.com.br',
  'https://www.encartesbrasil.3codenexus.com.br',
  'http://localhost:3000',
]

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const isApi = req.nextUrl.pathname.startsWith('/api')

  // Responde preflight OPTIONS
  if (req.method === 'OPTIONS' && isApi) {
    const allowed = origin ? ALLOWED_ORIGINS.includes(origin) : false
    if (!allowed) return NextResponse.next()

    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Adiciona CORS headers em todas as respostas de API cross-origin
  if (isApi && origin && ALLOWED_ORIGINS.includes(origin)) {
    const res = NextResponse.next()
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}