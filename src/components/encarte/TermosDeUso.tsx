'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, Loader2, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from './AppShell'

interface TermosDeUsoProps {
  tipo: 'consumidor' | 'empresa'
  onAceitar: () => void
  onRecusar: () => void
}

export default function TermosDeUso({ tipo, onAceitar, onRecusar }: TermosDeUsoProps) {
  const [loading, setLoading] = useState(false)
  const [recusado, setRecusado] = useState(false)
  const [scrollRef, setScrollRef] = useState<HTMLDivElement | null>(null)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  const handleScroll = () => {
    if (!scrollRef) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setScrolledToBottom(true)
    }
  }

  const handleAceitar = async () => {
    setLoading(true)
    try {
      await api('/api/auth/termos', {
        method: 'POST',
        body: JSON.stringify({ aceito: true }),
      })
      onAceitar()
    } catch {
      alert('Erro ao salvar aceite. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecusar = () => {
    setRecusado(true)
    setTimeout(() => onRecusar(), 3000)
  }

  // ── Tela de agradecimento após recusa ──
  if (recusado) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-md">
            <img src="/icon-192.png" alt="Panfletos Brasil" className="h-10 w-10 rounded-xl" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Obrigado pelo download!</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Para utilizar o Panfletos Brasil, é necessário aceitar os Termos de Uso.
            Você pode fechar esta página. Estaremos sempre disponíveis caso mude de ideia.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-white" />
            <div>
              <h2 className="text-white font-bold text-base leading-tight">
                {tipo === 'consumidor' ? 'Termos de Uso — Consumidor' : 'Termos de Uso — Empresa'}
              </h2>
              <p className="text-white/80 text-[11px] mt-0.5">Panfletos Brasil</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRecusar}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 60 dias grátis — apenas empresa */}
        {tipo === 'empresa' && (
          <div className="bg-green-50 border-b border-green-200 px-5 py-3 shrink-0">
            <p className="text-sm text-green-800 font-semibold flex items-center gap-1.5">
              <span className="text-lg">&#127881;</span>
              60 dias grátis para utilizar o App!
            </p>
            <p className="text-xs text-green-700/80 mt-0.5">
              Após o período gratuito, o próprio App gerará a opção de continuar com a assinatura mensal.
            </p>
          </div>
        )}

        {/* Scrollable content */}
        <div
          ref={setScrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm text-gray-700 leading-relaxed"
        >
          <div className="flex items-center gap-2 text-gray-900 font-semibold text-base">
            <ScrollText className="h-4 w-4 text-red-600" />
            Termos de Uso e Política de Privacidade
          </div>

          {/* ── Seção 1: Isenção de responsabilidade ── */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">1. Isenção de Responsabilidade</h3>
            <p>
              O aplicativo <strong>Panfletos Brasil</strong>, operado por <strong>Credmak Intermediações LTDA</strong> (CNPJ 49.163.634/0001-54),
              é uma plataforma de agregação e divulgação de encartes e panfletos promocionais. Todo o conteúdo publicado —
              incluindo preços, datas de validade, produtos, descrições, imagens e informações promocionais —
              é de <strong>inteira responsabilidade das empresas anunciantes</strong>.
            </p>
            <p className="mt-2">
              O Panfletos Brasil <strong>não se responsabiliza</strong> por:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
              <li>Erros de ortografia, preços, datas ou informações contidas nos encartes e panfletos;</li>
              <li>Imagens, fotos ou ilustrações que não correspondam aos produtos reais;</li>
              <li>Produtos esgotados, indisponíveis ou com condições diferentes das anunciadas;</li>
              <li>Alterações de preços ou promoções sem aviso prévio por parte das empresas;</li>
              <li>Qualquer dano, prejuízo ou inconveniência decorrente do uso das informações contidas na plataforma.</li>
            </ul>
          </div>

          {/* ── Seção 2: LGPD ── */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">2. Proteção de Dados (LGPD)</h3>
            <p>
              O Panfletos Brasil <strong>não compartilha, comercializa ou distribui</strong> os dados pessoais
              dos seus usuários com terceiros. Todos os dados coletados são tratados em conformidade com a
              <strong> Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>.
            </p>
            <p className="mt-2">
              Os dados fornecidos no cadastro (nome, e-mail e, no caso de empresas, CNPJ e dados complementares)
              são utilizados exclusivamente para o funcionamento da plataforma, autenticação, comunicação operacional
              e gestão de assinaturas. O usuário pode solicitar a exclusão dos seus dados a qualquer momento
              entrando em contato conosco.
            </p>
          </div>

          {/* ── Seção 3: Uso da plataforma ── */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">3. Uso da Plataforma</h3>
            <p>
              Ao aceitar estes termos, o usuário concorda em utilizar o Panfletos Brasil de forma responsável,
              sendo vedado qualquer uso indevido, fraudulento ou que viole direitos de terceiros. O Panfletos Brasil
              reserva-se o direito de suspender ou cancelar contas que violem estas condições.
            </p>
          </div>

          {/* ── Seções extras para EMPRESA ── */}
          {tipo === 'empresa' && (
            <>
              {/* ── Seção 4: Upload de PDF ── */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">4. Upload de Encartes</h3>
                <p>
                  Para utilização do App, é <strong>obrigatório</strong> fazer o upload do encarte/panfleto
                  em formato <strong>PDF com texto selecionável</strong> (não são aceitos PDFs compostos
                  exclusivamente por imagens/scans). Isso garante a correta leitura e extração automática
                  dos produtos, preços e informações pelo sistema.
                </p>
              </div>

              {/* ── Seção 5: Revisão obrigatória (VERMELHO) ── */}
              <div className="bg-red-50 border border-red-300 rounded-xl p-3.5">
                <h3 className="font-bold text-red-700 mb-1.5 text-base">
                  5. Revisão Obrigatória Antes da Publicação
                </h3>
                <p className="text-red-800 font-semibold leading-relaxed">
                  A inserção de produtos por meio da leitura de PDF pelo aplicativo pode conter erros de
                  interpretação, como preços incorretos, nomes de produtos equivocados, marcas trocadas
                  ou unidades de medida erradas.
                </p>
                <p className="text-red-800 font-semibold leading-relaxed mt-2">
                  É de <span className="underline decoration-2 decoration-red-500">EXTREMA IMPORTÂNCIA</span> que
                  a empresa revise minuciosamente TODOS os produtos extraídos antes de publicar a lista.
                  A responsabilidade sobre as informações publicadas é integralmente da empresa anunciante.
                </p>
              </div>

              {/* ── Seção 6: Funcionalidades da empresa ── */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">6. Funcionalidades para Empresas</h3>
                <p>Ao se cadastrar, a empresa terá acesso às seguintes funcionalidades:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 mt-1.5">
                  <li><strong>Rota via Maps:</strong> O cadastro da empresa gerará uma rota de localização no Google Maps, permitindo que os usuários encontrem o estabelecimento facilmente;</li>
                  <li><strong>Insights e BI:</strong> A plataforma oferece dashboards com métricas de desempenho, cliques, visualizações e dados analíticos dos encartes publicados;</li>
                  <li><strong>Formulário de Contato:</strong> Canal de comunicação direta com a plataforma para suporte técnico, sugestões e reclamações;</li>
                  <li><strong>Edição de Dados:</strong> A empresa pode editar seus dados cadastrais, horários de funcionamento e informações de contato diretamente pela plataforma;</li>
                  <li><strong>Gestão de Assinatura:</strong> Controle de pagamentos recorrentes e cancelamentos de plano, processados pela plataforma <strong>Asaas</strong>.</li>
                </ul>
              </div>

              {/* ── Seção 7: Pagamentos ── */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">7. Pagamentos e Assinatura</h3>
                <p>
                  Os pagamentos das assinaturas são processados pela plataforma <strong>Asaas</strong>, sendo
                  a empresa responsável pela aplicação a <strong>Credmak Intermediações LTDA</strong>
                  (CNPJ 49.163.634/0001-54). O período piloto de 60 (sessenta) dias é gratuito.
                  Após esse período, será gerada automaticamente a opção de continuidade da assinatura mensal.
                  A empresa poderá cancelar sua assinatura a qualquer momento pela própria plataforma,
                  mantendo o acesso até o final do período já pago.
                </p>
              </div>
            </>
          )}

          {/* ── Seção final: Empresa responsável ── */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">
              {tipo === 'empresa' ? '8.' : '4.'} Disposições Gerais
            </h3>
            <p>
              A empresa responsável pela aplicação Panfletos Brasil é a{' '}
              <strong>Credmak Intermediações LTDA</strong>, inscrita no CNPJ{' '}
              <strong>49.163.634/0001-54</strong>. Para dúvidas, solicitações ou requisições relacionadas
              à LGPD, entre em contato pelo formulário disponível na plataforma.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Última atualização: Julho de 2025.
            </p>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-200 px-5 py-4 bg-gray-50 shrink-0 space-y-2">
          {!scrolledToBottom && (
            <p className="text-[11px] text-gray-400 text-center">
              &#8595; Role até o final para habilitar o aceite
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm"
              onClick={handleRecusar}
            >
              Não aceito
            </Button>
            <Button
              className="flex-1 h-10 text-sm bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
              disabled={!scrolledToBottom || loading}
              onClick={handleAceitar}
            >
              {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {loading ? 'Salvando...' : 'Aceito os Termos'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}