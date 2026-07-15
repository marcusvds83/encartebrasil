/**
 * EncarteBrasil — Serviço de e-mail via SMTP (Firebase / Nodemailer)
 *
 * Usa as mesmas credenciais SMTP configuradas no Firebase Console:
 *   Host:     mail.3codenexus.com.br
 *   Porta:   465
 *   Segurança: SSL
 *   Remetente: contato@3codenexus.com.br
 */

import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'mail.3codenexus.com.br'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || 'contato@3codenexus.com.br'
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'EncarteBrasil <contato@3codenexus.com.br>'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  }
  return transporter
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

/**
 * Envia um e-mail via SMTP. Retorna true em sucesso.
 * Se SMTP_PASS não estiver configurado, loga aviso e retorna false.
 */
export async function enviarEmail(opts: EmailOptions): Promise<boolean> {
  if (!SMTP_PASS) {
    console.warn('[email] SMTP_PASS não configurada — e-mail NÃO enviado. Defina a env var SMTP_PASS no Render.')
    return false
  }
  try {
    const transport = getTransporter()
    await transport.sendMail({
      from: SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo || SMTP_FROM,
    })
    console.log(`[email] Enviado para ${opts.to}: "${opts.subject}"`)
    return true
  } catch (err: any) {
    console.error(`[email] Falha ao enviar para ${opts.to}:`, err?.message || err)
    return false
  }
}

/**
 * Envia e-mail de boas-vindas para novo mercado cadastrado.
 */
export async function emailBoasVindasMercado(nome: string, email: string): Promise<boolean> {
  return enviarEmail({
    to: email,
    subject: 'Bem-vindo ao EncarteBrasil! 🛒',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EncarteBrasil</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Compare preços, economize mais!</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-top: 0;">Olá, ${nome}! 👋</h2>
          <p style="color: #374151; line-height: 1.6;">Seu cadastro como <strong>mercado parceiro</strong> no EncarteBrasil foi realizado com sucesso!</p>
          <p style="color: #374151; line-height: 1.6;">Agora você pode:</p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>📤 Enviar seus encartes em PDF</li>
            <li>📊 Acompanhar cliques nos seus produtos</li>
            <li>🛒 Atrair mais clientes com preços competitivos</li>
          </ul>
          <p style="color: #374151; line-height: 1.6;">Faça login no painel e comece a publicar seus encartes!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.com'}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Acessar Painel</a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">Em caso de dúvidas, responda este e-mail.</p>
        </div>
      </div>
    `,
  })
}

/**
 * Envia e-mail de boas-vindas para novo consumidor (usuário PF).
 */
export async function emailBoasVindasConsumidor(nome: string, email: string): Promise<boolean> {
  return enviarEmail({
    to: email,
    subject: 'Bem-vindo ao EncarteBrasil! 🛒',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">EncarteBrasil</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Compare preços, economize mais!</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-top: 0;">Olá, ${nome || 'Consumidor'}! 👋</h2>
          <p style="color: #374151; line-height: 1.6;">Seu cadastro no EncarteBrasil foi realizado com sucesso!</p>
          <p style="color: #374151; line-height: 1.6;">Com o EncarteBrasil você pode:</p>
          <ul style="color: #374151; line-height: 1.8;">
            <li>🔍 Pesquisar produtos e comparar preços</li>
            <li>📋 Criar listas de compras</li>
            <li>📍 Encontrar as melhores ofertas perto de você</li>
          </ul>
          <p style="color: #374151; line-height: 1.6;">Comece a explorar os encartes dos mercados da sua região!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://encartebrasil.com'}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Encartes</a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">Em caso de dúvidas, responda este e-mail.</p>
        </div>
      </div>
    `,
  })
}

/**
 * Notifica o mercado quando um encarte é publicado com sucesso.
 */
export async function emailEncartePublicado(
  nomeMercado: string,
  emailMercado: string,
  tituloEncarte: string,
  totalProdutos: number,
): Promise<boolean> {
  return enviarEmail({
    to: emailMercado,
    subject: `Encarte publicado: ${tituloEncarte}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Encarte Publicado!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; line-height: 1.6;">Olá, <strong>${nomeMercado}</strong>!</p>
          <p style="color: #374151; line-height: 1.6;">Seu encarte <strong>"${tituloEncarte}"</strong> foi publicado com sucesso no EncarteBrasil.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">Total de produtos</p>
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #16a34a;">${totalProdutos}</p>
          </div>
          <p style="color: #374151; line-height: 1.6;">Seus produtos já estão visíveis para os consumidores!</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Em caso de dúvidas, responda este e-mail.</p>
        </div>
      </div>
    `,
  })
}