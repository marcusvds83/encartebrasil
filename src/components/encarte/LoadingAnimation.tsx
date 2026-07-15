'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, GitCompareArrows, Sparkles, Package } from 'lucide-react'

// Icons de produtos para o carrossel de loading
const PRODUCT_ICONS = ['🛒', '🥩', '🥛', '🍞', '🧴', '🍎', '🧀', '☕', '🍗', '🌾', '🥚', '🧃']

export function HomeLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <ShoppingBag className="h-5 w-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-700">
            Estamos procurando as melhores ofertas de hoje pra você!
          </h3>
        </div>
        <p className="text-xs text-gray-400">Aguarde um instante...</p>
      </motion.div>

      {/* Carrossel de ícones de produtos */}
      <div className="flex gap-3 overflow-hidden max-w-xs">
        {PRODUCT_ICONS.map((icon, i) => (
          <motion.div
            key={i}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: -80, opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'linear',
            }}
            className="text-3xl flex-shrink-0"
          >
            {icon}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-6 flex gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-red-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  )
}

export function CompareLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <GitCompareArrows className="h-5 w-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-700">
            Estamos Comparando os melhores preços nos melhores Lugares pra você
          </h3>
        </div>
        <p className="text-xs text-gray-400">Analizando preços entre mercados...</p>
      </motion.div>

      {/* Ícone de comparativo animado */}
      <div className="relative flex items-center justify-center h-16 w-16">
        <motion.div
          className="absolute inset-0 rounded-full bg-red-100"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full bg-red-200"
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.div
          animate={{ rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <GitCompareArrows className="h-8 w-8 text-red-600" />
        </motion.div>
      </div>

      <motion.div
        className="mt-6 flex gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-red-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  )
}

export function UploadLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Seu .pdf está sendo carregado, por favor aguarde alguns instantes enquanto fazemos a mágica acontecer!
          </h3>
        </div>
      </motion.div>

      {/* Animação de mágica */}
      <div className="relative flex items-center justify-center h-20 w-20">
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-orange-400"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${i * 60}deg) translateY(-30px)`,
              }}
              animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Package className="h-8 w-8 text-orange-600" />
        </motion.div>
      </div>
    </div>
  )
}