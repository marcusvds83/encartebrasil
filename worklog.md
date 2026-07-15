---
Task ID: 1
Agent: main
Task: EncarteBrasil - Multiple feature implementations (PDF fix, review flow, delete, loading animations, contracts)

Work Log:
- Fixed PDF parser: rewrote parseProdutosDoTexto with "name-first" approach, strict dedup, noise filtering (removes "un.", "DE POR APENAS", standalone prices, duplicates)
- Changed upload API to NOT auto-save products; returns extracted products for review
- Created /api/mercado/encarte/[eid]/publicar/route.ts - POST to publish reviewed products
- Created /api/mercado/encarte/[eid]/route.ts - DELETE to remove encarte + products
- Created /api/mercado/produto/[pid]/route.ts - DELETE to remove individual product
- Updated demo-db.ts: enhanced deleteMany with encarteId/mercadoId filters, added encarte.delete cascade
- Added review modal to MarketPanel: after upload, market user sees extracted products, can remove wrong items, then publish
- Added delete encarte button (trash icon) on each encarte in Meus Encartes list
- Added delete individual product button (X icon) on expanded product list
- Created LoadingAnimation.tsx with 3 components: HomeLoading, CompareLoading, UploadLoading
- Updated HomeView to use HomeLoading (carrossel de produtos + "Estamos procurando as melhores ofertas de hoje pra você!")
- Updated CompareView to use CompareLoading ("Estamos Comparando os melhores preços nos melhores Lugares pra você")
- Updated MarketPanel upload section to show UploadLoading with magic animation during PDF processing
- Updated MarketAccountView with piloto contract section (shows days remaining, urgency warnings, contract button when expiring/expired)
- Updated /api/mercado/perfil to return pilotoInicio, pilotoFim, mensalidade
- Updated AdminPanel: changeStatus for ativo now shows confirm dialog about PJ contract; added "Contrato" button for piloto/ativo markets

Stage Summary:
- Build: Compiled successfully
- All 6 requested features implemented
- No new TypeScript errors introduced