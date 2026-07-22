# RifaGo

Sistema de rifas online: os participantes escolhem números (ou fazem uma doação sem número) e pagam via Pix; o organizador confirma o pagamento manualmente por um painel admin. Sem gateway de pagamento — o código Pix (copia e cola / QR) é gerado dinamicamente pelo próprio servidor.

Construído com Next.js (App Router) + Firebase, pensado para rodar inteiramente nos planos gratuitos (Vercel Hobby + Firebase Spark).

## Funcionalidades

- Compra de números ou doação livre, com geração de Pix dinâmico (BR Code / EMV, com checksum CRC16)
- Reserva de números sem risco de venda duplicada (transações do Firestore — dois compradores nunca conseguem o mesmo número)
- Expiração automática de reservas não pagas (padrão: 30 min)
- Painel admin: login por senha única, confirmar/cancelar pedidos pendentes, editar ou excluir pagamentos já confirmados, lançar manualmente um pagamento recebido fora do site
- `/admin/configuracoes`: chave Pix, total de números da rifa, e todo o conteúdo da página inicial (título, fotos, prêmio, regulamento, seção de dúvidas) — tudo editável sem precisar de redeploy
- Página do comprador: código Pix + QR, contagem regressiva, marcar "já paguei", cancelar ou editar os próprios dados
- Leituras no banco otimizadas por design: contadores agregados e documentos-resumo denormalizados em vez de ler a coleção inteira a cada visita

## Stack

Next.js (App Router, Server Actions) · TypeScript · Firebase Firestore (Admin SDK) · Tailwind CSS · Vercel

## Como rodar

### 1. Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com) e ative o Firestore.
2. Gere uma Web App (Configurações do projeto → Seus apps → Web) para pegar as chaves `NEXT_PUBLIC_FIREBASE_*`.
3. Gere uma chave de conta de serviço (Configurações do projeto → Contas de serviço → Gerar nova chave privada) e converta pra base64:
   ```bash
   base64 -w0 service-account.json   # Linux
   base64 -i service-account.json    # Mac
   ```
4. Publique as regras de segurança (`firestore.rules`) no console do Firebase — elas bloqueiam leitura/escrita direta do cliente em quase tudo, deixando só o Admin SDK (server-side) mexer no banco.

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Veja os comentários de cada variável no próprio arquivo — atenção especial ao hash da senha do admin (precisa escapar os `$` do bcrypt).

### 3. Popular o banco

```bash
npm install
npm run seed
```

Isso cria a configuração inicial da rifa (edite as constantes no topo de `scripts/seed.ts` antes de rodar) e os documentos de cada número.

### 4. Rodar localmente

```bash
npm run dev
```

### 5. Configurar Pix e conteúdo

Depois do primeiro deploy, faça login em `/admin/login` e configure a chave Pix, o número de WhatsApp e o conteúdo da página em `/admin/configuracoes` — nada disso fica em variável de ambiente, é tudo editável pelo painel.

### 6. Deploy

Feito para o [Vercel](https://vercel.com). Configure as mesmas variáveis de ambiente no painel do projeto e publique.

## Arquitetura (resumo)

- Um documento por número da rifa (`tickets/{numero}`), não um array num doc só — permite que o Firestore paralelize reservas de números diferentes, e só há conflito real quando duas pessoas tentam o **mesmo** número.
- Toda mudança de estado de reserva roda dentro de uma transação do Firestore, que sempre revalida a disponibilidade real antes de confirmar — impossível vender o mesmo número duas vezes.
- Dois documentos denormalizados (`ticketsState/summary` e `raffleState/stats`) são atualizados como efeito colateral (fora da transação principal) para que a grade de disponibilidade e o total arrecadado/ranking sejam lidos com 1-2 leituras, não uma por documento.

## Licença

MIT — veja [LICENSE](LICENSE).
