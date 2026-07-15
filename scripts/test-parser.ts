import { extrairProdutosDoPDF } from '../src/lib/pdf-parser';
import fs from 'fs';

async function test(file: string) {
  const buf = fs.readFileSync(file);
  const r = await extrairProdutosDoPDF(buf);
  console.log('=== ' + file.split('/').pop() + ' ===');
  console.log('Paginas:', r.totalPaginas);
  console.log('Produtos encontrados:', r.produtos.length);
  if (r.produtos.length > 0) {
    console.log('Primeiros 5 produtos:');
    r.produtos.slice(0, 5).forEach((p, i) => console.log(`  ${i+1}. ${p.nome} - ${p.preco} ${p.unidade || ''}`));
  }
  console.log('\nTexto bruto (primeiros 3000 chars):');
  console.log(r.textoBruto.substring(0, 3000));
  console.log('\n=== FIM ===\n');
}

async function main() {
  await test('/home/z/my-project/upload/encarte_mercado_uniao.pdf');
  await test('/home/z/my-project/upload/encarte_mercado_exemplo.pdf');
}

main().catch(console.error);