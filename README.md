# RifaGo

Sistema de rifas online: os participantes escolhem números (ou fazem uma doação sem número) e pagam via Pix; o organizador confirma o pagamento manualmente por um painel admin. Sem gateway de pagamento — o código Pix (copia e cola / QR) é gerado dinamicamente pelo próprio servidor.

Construído com Next.js (App Router) + Firebase, pensado para rodar **inteiramente de graça** (Vercel Hobby + Firebase Spark, os planos gratuitos de cada um).

Este guia assume que você nunca configurou nada disso antes — vamos do zero absoluto até o site no ar.

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

---

## O que você vai precisar

- **Node.js** versão 20 ou mais recente instalado no seu computador ([nodejs.org](https://nodejs.org) — baixe a versão "LTS").
- Uma conta **Google** (pra criar o projeto no Firebase — pode ser seu Gmail normal).
- Uma conta no **[GitHub](https://github.com)** (pra guardar o código e conectar com a Vercel).
- Uma conta na **[Vercel](https://vercel.com)** (pode entrar direto com a conta do GitHub, é grátis).
- Um terminal (Prompt de Comando, PowerShell, Terminal do Mac/Linux — qualquer um serve).

Nada disso custa nada nos planos que vamos usar.

---

## Parte 1 — Banco de dados (Firebase)

O Firebase é o banco de dados do projeto: é lá que ficam guardados os números da rifa, os pedidos, e as configurações. Recomendamos o Firebase porque:
- O plano gratuito ("Spark") é bem generoso pra uma rifa comum;
- Não precisa de servidor próprio — o banco já vem pronto na nuvem;
- É o que este projeto já usa nativamente, sem precisar adaptar nada.

### 1.1. Criar o projeto no Firebase

1. Acesse **[console.firebase.google.com](https://console.firebase.google.com)** e faça login com sua conta Google.
2. Clique em **"Criar projeto"** (ou "Add project").
3. Dê um nome ao projeto (ex: "minha-rifa") e clique em continuar.
4. Na tela do Google Analytics, pode **desativar** (não é necessário para o projeto) e clicar em "Criar projeto".
5. Aguarde a criação (leva uns 30 segundos) e clique em "Continuar".

### 1.2. Ativar o Firestore (o banco de dados em si)

1. No menu à esquerda, clique em **"Firestore Database"** (embaixo de "Compilação"/"Build").
2. Clique em **"Criar banco de dados"**.
3. Escolha uma localização (ex: `southamerica-east1` se você é do Brasil — não dá pra mudar depois, então escolha uma região perto de você ou dos seus compradores).
4. Escolha o modo **"produção"** (production mode) — as regras de segurança corretas serão coladas mais adiante.
5. Clique em "Ativar"/"Enable".

### 1.3. Pegar as chaves públicas (Web App config)

Essas chaves identificam seu projeto pro navegador do comprador — não são secretas.

1. Clique na engrenagem ⚙️ ao lado de "Visão geral do projeto" (topo do menu esquerdo) → **"Configurações do projeto"**.
2. Role até "Seus apps" e clique no ícone **`</>`** (Web).
3. Dê um apelido ao app (ex: "rifago-web") e clique em "Registrar app" — **não** marque a opção de Firebase Hosting.
4. Vai aparecer um bloco de código com um objeto `firebaseConfig = {...}`. Guarde esses valores — você vai usá-los daqui a pouco (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`).

### 1.4. Gerar a chave do Admin SDK (acesso privado ao banco)

Essa chave é secreta — é o que permite ao servidor (não ao navegador do comprador) ler e escrever no banco com privilégios totais.

1. Ainda em "Configurações do projeto", clique na aba **"Contas de serviço"** ("Service accounts").
2. Clique em **"Gerar nova chave privada"** ("Generate new private key") e confirme.
3. Um arquivo `.json` será baixado — **guarde esse arquivo com cuidado e nunca o compartilhe ou suba pro GitHub.**
4. Você vai precisar converter esse arquivo inteiro para uma única linha em base64. Abra o terminal na pasta onde o arquivo foi baixado e rode:

   ```bash
   # Linux
   base64 -w0 nome-do-arquivo.json

   # Mac
   base64 -i nome-do-arquivo.json

   # Windows (PowerShell)
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("nome-do-arquivo.json"))
   ```

   Vai sair um texto gigante numa linha só — copie ele, você vai colar no `.env.local` daqui a pouco.

### 1.5. Colar as regras de segurança

As regras de segurança dizem o que o navegador do comprador pode e não pode ler/escrever direto no banco (tudo mais sensível passa pelo servidor, usando a chave do Admin SDK).

1. No Firestore Database, clique na aba **"Regras"** ("Rules").
2. Apague o conteúdo que estiver lá e cole o conteúdo do arquivo [`firestore.rules`](firestore.rules) deste projeto.
3. Clique em **"Publicar"** ("Publish").

Pronto — o banco de dados está criado e protegido. Vamos ao código agora.

---

## Parte 2 — Baixando e configurando o projeto

### 2.1. Clonar o projeto

```bash
git clone https://github.com/chutzpah-os/RifaGo-OSS.git
cd RifaGo-OSS
```

(Se você quer manter seu próprio histórico separado, pode baixar o ZIP do GitHub em vez de clonar, ou dar um "Fork" antes de clonar o seu fork.)

### 2.2. Instalar as dependências

```bash
npm install
```

Isso baixa todas as bibliotecas que o projeto usa (Next.js, Firebase, etc.) — só precisa rodar uma vez (ou de novo se o `package.json` mudar).

### 2.3. Criar o arquivo de variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Abra `.env.local` num editor de texto e preencha, campo por campo:

| Variável | O que colocar |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | valor `apiKey` do passo 1.3 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | valor `authDomain` do passo 1.3 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | valor `projectId` do passo 1.3 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | valor `storageBucket` do passo 1.3 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | valor `appId` do passo 1.3 |
| `FIREBASE_ADMIN_CREDENTIALS_BASE64` | o texto base64 gigante do passo 1.4 |
| `SESSION_SECRET` | qualquer texto aleatório longo — pode gerar com `openssl rand -base64 32` |
| `CRON_SECRET` | outro texto aleatório qualquer (mesmo comando acima) |

**A senha do painel admin merece atenção especial.** Ela não é digitada em texto puro — você gera um "hash" (uma versão embaralhada, irreversível) dela e só o hash vai no arquivo. Rode:

```bash
npx tsx -e "import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('SUA_SENHA_AQUI', 10))"
```

Isso imprime algo como `$2b$10$Kx....` — copie exatamente esse valor pra variável `ADMIN_PASSWORD_HASH`, **mas escape cada `$` colocando uma barra invertida antes** (o Next.js interpretaria `$algumacoisa` como referência a outra variável, senão):

```
ADMIN_PASSWORD_HASH=\$2b\$10\$Kx....
```

As demais variáveis do `.env.example` (`RESERVATION_TTL_MINUTES`, `MAX_TICKETS_PER_ORDER`, etc.) já têm um valor padrão razoável — só mexa nelas se quiser mudar o comportamento.

> A chave Pix, o número de WhatsApp e todo o conteúdo da página (título, fotos, regulamento...) **não vão aqui** — isso é configurado depois, direto pelo painel admin no navegador.

### 2.4. Popular o banco com a rifa inicial

Antes de rodar, abra `scripts/seed.ts` e edite as constantes no topo (título, descrição, preço por número, quantidade de números, etc.) para a sua rifa. Depois rode:

```bash
npm run seed
```

Isso cria a configuração da rifa e um documento para cada número no Firestore.

### 2.5. Rodar localmente

```bash
npm run dev
```

Abra **[http://localhost:3000](http://localhost:3000)** no navegador — a página da sua rifa já deve aparecer.

### 2.6. Entrar no painel admin e configurar o Pix

1. Acesse `http://localhost:3000/admin/login` e entre com a senha que você definiu no passo 2.3 (a senha de verdade, não o hash).
2. Vá em **"Configurações"** e preencha:
   - **Chave Pix**: a chave que recebe os pagamentos (CPF, CNPJ, e-mail, telefone ou chave aleatória). Se for telefone, o formato precisa ter o `+` na frente (ex: `+5511987654321`), senão o banco recusa o QR code.
   - **Nome e cidade do recebedor**: aparecem no código Pix.
   - **Número de WhatsApp** e texto de dúvidas.
3. Salve — pronto, a rifa já está funcional.

---

## Parte 3 — Publicando na internet (Vercel)

A Vercel é quem vai hospedar o site de verdade, com um link público. É gratuita para esse tipo de projeto (plano "Hobby").

### 3.1. Subir o código pro seu próprio GitHub

Se você ainda não tem o código num repositório seu (em vez de só ter clonado este), crie um repositório vazio no GitHub e:

```bash
git remote set-url origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

### 3.2. Importar o projeto na Vercel

1. Acesse **[vercel.com](https://vercel.com)** e entre com sua conta do GitHub.
2. Clique em **"Add New..." → "Project"**.
3. Selecione o repositório que você acabou de subir.
4. Na tela de configuração, abra **"Environment Variables"** e cole **as mesmas variáveis** que você colocou no `.env.local` (uma por uma, ou cole tudo de uma vez se a Vercel oferecer essa opção).
5. Clique em **"Deploy"**.

Depois de alguns minutos, a Vercel te dá um link (tipo `seu-projeto.vercel.app`) — o site já está no ar.

### 3.3. Últimos ajustes, já no ar

1. Acesse `https://seu-projeto.vercel.app/admin/login` e entre com a senha do admin.
2. Configure a chave Pix e o conteúdo da rifa em **Configurações**, exatamente como no passo 2.6 (essas configurações vivem no banco, então valem tanto local quanto em produção, mas é bom conferir de novo no ambiente de produção).
3. Faça um teste real: abra a página principal, clique em "Quero participar", escolha um número e confirme que o código Pix gerado é válido (escaneie com o app do seu banco antes de divulgar pra valer).

Pronto — sua rifa está no ar, de graça, e pronta para receber participantes.

---

## Solução de problemas comuns

- **"O código Pix gerado é inválido"**: quase sempre é o formato da chave. Chave de telefone precisa do `+` (ex: `+5511987654321`); CPF/CNPJ só dígitos, sem pontuação.
- **Erro `Missing required environment variable`**: alguma variável do `.env.local` (ou da Vercel) está faltando ou vazia — confira a lista da Parte 2.3.
- **Hash da senha "quebrado"**: se você esqueceu de escapar os `$` do bcrypt com `\`, o Next.js vai tentar interpretar como variável e a senha nunca vai bater. Gere de novo e escape certinho.
- **Build falha na Vercel por causa de variável do Firebase**: confirme que colou exatamente os mesmos nomes de variável (`NEXT_PUBLIC_FIREBASE_*`) no painel da Vercel, sem espaços extras.

---

## Arquitetura (resumo técnico)

- Um documento por número da rifa (`tickets/{numero}`), não um array num doc só — permite que o Firestore paralelize reservas de números diferentes, e só há conflito real quando duas pessoas tentam o **mesmo** número.
- Toda mudança de estado de reserva roda dentro de uma transação do Firestore, que sempre revalida a disponibilidade real antes de confirmar — impossível vender o mesmo número duas vezes.
- Dois documentos denormalizados (`ticketsState/summary` e `raffleState/stats`) são atualizados como efeito colateral (fora da transação principal) para que a grade de disponibilidade e o total arrecadado/ranking sejam lidos com 1-2 leituras, não uma por documento.

## Licença

MIT — veja [LICENSE](LICENSE).
