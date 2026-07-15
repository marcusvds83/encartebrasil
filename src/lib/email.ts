/**
 * EncarteBrasil — Serviço de e-mail via SMTP (Nodemailer)
 *
 * Usa as credenciais SMTP do servidor mail.3codenexus.com.br
 * As env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 * devem estar configuradas no Render ou no .env local.
 *
 * IMPORTANTE: O SMTP configurado no Firebase Console é APENAS para os
 * e-mails internos do Firebase Auth (verificação, reset de senha).
 * Nosso app usa Nodemailer diretamente para e-mails transacionais.
 */

import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'mail.3codenexus.com.br'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || 'contato@3codenexus.com.br'
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'EncarteBrasil <contato@3codenexus.com.br>'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Cria um transporter novo a cada envio para evitar conexões stale.
 * O singleton pode falhar silenciosamente se a conexão cair.
 */
function createTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 15_000,
  })
}

/**
 * Envia um e-mail via SMTP. Retorna { ok, error? }.
 * Loga detalhes para depuração no Render.
 */
export async function enviarEmail(opts: EmailOptions): Promise<{ ok: boolean; error?: string }> {
  if (!SMTP_PASS) {
    const msg = '[email] SMTP_PASS nao configurada — defina a env var SMTP_PASS no Render.'
    console.warn(msg)
    return { ok: false, error: msg }
  }

  let transport: nodemailer.Transporter | null = null
  try {
    transport = createTransporter()

    // Verifica conectividade antes de enviar
    await transport.verify()
    console.log(`[email] SMTP conectado com sucesso a ${SMTP_HOST}:${SMTP_PORT}`)

    const info = await transport.sendMail({
      from: SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo || SMTP_FROM,
    })

    console.log(`[email] Enviado para ${opts.to}: "${opts.subject}" — messageId: ${info.messageId}`)
    return { ok: true }
  } catch (err: any) {
    const errMsg = err?.message || String(err)
    console.error(`[email] FALHA ao enviar para ${opts.to}: ${errMsg}`)
    // Tenta fechar o transporte em caso de erro
    if (transport) {
      try { transport.close() } catch { /* ignore */ }
    }
    return { ok: false, error: errMsg }
  }
}

/**
 * Envia e-mail de boas-vindas para novo mercado cadastrado.
 */
export async function emailBoasVindasMercado(nome: string, email: string): Promise<boolean> {
  const result = await enviarEmail({
    to: email,
    subject: 'Bem-vindo ao EncarteBrasil!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EncarteBrasil</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Compare precos, economize mais!</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-top: 0;">Ola, ${nome}!</h2>
          <p style="color: #374151; line-height: 1.6;">Seu cadastro como <strong>mercado parceiro</strong> no EncarteBrasil foi realizado com sucesso!</p>
          <p style="color: #374151; line-height: 1.6;">Agora voce pode:</p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Enviar seus encartes em PDF</li>
            <li>Acompanhar cliques nos seus produtos</li>
            <li>Atrair mais clientes com precos competitivos</li>
          </ul>
          <p style="color: #374151; line-height: 1.6;">Faca login no painel e comece a publicar seus encartes!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Acessar Painel</a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">Em caso de duvidas, responda este e-mail.</p>
        </div>
      </div>
    `,
  })
  return result.ok
}

/**
 * Envia e-mail de boas-vindas para novo consumidor (usuario PF).
 */
export async function emailBoasVindasConsumidor(nome: string, email: string): Promise<boolean> {
  const result = await enviarEmail({
    to: email,
    subject: 'Bem-vindo ao EncarteBrasil!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EncarteBrasil</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Compare precos, economize mais!</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-top: 0;">Ola, ${nome || 'Consumidor'}!</h2>
          <p style="color: #374151; line-height: 1.6;">Seu cadastro no EncarteBrasil foi realizado com sucesso!</p>
          <p style="color: #374151; line-height: 1.6;">Com o EncarteBrasil voce pode:</p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>Pesquisar produtos e comparar precos</li>
            <li>Criar listas de compras</li>
            <li>Encontrar as melhores ofertas perto de voce</li>
          </ul>
          <p style="color: #374151; line-height: 1.6;">Comece a explorar os encartes dos mercados da sua regiao!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.onrender.com'}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Encartes</a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">Em caso de duvidas, responda este e-mail.</p>
        </div>
      </div>
    `,
  })
  return result.ok
}

/**
 * Notifica o mercado quando um encarte e publicado com sucesso.
 */
export async function emailEncartePublicado(
  nomeMercado: string,
  emailMercado: string,
  tituloEncarte: string,
  totalProdutos: number,
): Promise<boolean> {
  const result = await enviarEmail({
    to: emailMercado,
    subject: `Encarte publicado: ${tituloEncarte}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Encarte Publicado!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; line-height: 1.6;">Ola, <strong>${nomeMercado}</strong>!</p>
          <p style="color: #374151; line-height: 1.6;">Seu encarte <strong>"${tituloEncarte}"</strong> foi publicado com sucesso no EncarteBrasil.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Total de produtos</p>
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #16a34a;">${totalProdutos}</p>
          </div>
          <p style="color: #374151; line-height: 1.6;">Seus produtos ja estao visiveis para os consumidores!</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Em caso de duvidas, responda este e-mail.</p>
        </div>
      </div>
    `,
  })
  return result.ok
}