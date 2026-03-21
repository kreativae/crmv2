# 🚀 Guia de Deploy para Produção — NexCRM

## 📋 Checklist Pré-Deploy

### ✅ Frontend
- [x] Build sem erros (`npm run build`)
- [x] Todas as páginas funcionais
- [x] Responsividade testada
- [x] Variáveis de ambiente configuradas

### ✅ Backend
- [x] Todos os models criados
- [x] Todas as rotas implementadas
- [x] Middlewares de segurança
- [x] Validação de dados
- [x] Tratamento de erros

### ⚠️ Pendências Antes de Produção
- [ ] Configurar MongoDB Atlas (produção)
- [ ] Configurar Redis (Upstash)
- [ ] Configurar variáveis de ambiente de produção
- [ ] Configurar OAuth (Google, Microsoft, Apple)
- [ ] Configurar integrações (WhatsApp, Instagram, etc.)
- [ ] Configurar serviço de email (Resend/SendGrid)
- [ ] Configurar domínio e SSL

---

## 🏗️ Arquitetura de Deploy

```
┌─────────────────────────────────────────────────────────────┐
│                         PRODUÇÃO                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │   Vercel    │    │  Railway/   │    │  MongoDB    │     │
│   │  Frontend   │───▶│   Render    │───▶│   Atlas     │     │
│   │   (React)   │    │  (Backend)  │    │  (Database) │     │
│   └─────────────┘    └─────────────┘    └─────────────┘     │
│                             │                                │
│                             ▼                                │
│                      ┌─────────────┐                        │
│                      │   Upstash   │                        │
│                      │   (Redis)   │                        │
│                      └─────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 1. Configurar MongoDB Atlas

### Criar Cluster
1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie uma conta ou faça login
3. Crie um novo projeto: "NexCRM"
4. Crie um cluster:
   - **Shared (Free)** para testes
   - **M10+ (Dedicated)** para produção ($57/mês)
5. Configure usuário de banco:
   - Username: `nexcrm_admin`
   - Password: (gerar senha forte)
6. Configure Network Access:
   - Adicione `0.0.0.0/0` para permitir de qualquer IP
   - Ou adicione IPs específicos do seu servidor

### Obter Connection String
```
mongodb+srv://nexcrm_admin:<password>@cluster0.xxxxx.mongodb.net/nexcrm?retryWrites=true&w=majority
```

---

## 📦 2. Configurar Redis (Upstash)

### Criar Database
1. Acesse [Upstash](https://upstash.com)
2. Crie uma conta
3. Crie um novo database Redis
4. Região: Escolha a mais próxima do seu servidor
5. Copie a connection string:

```
redis://default:xxxxx@us1-xxxxx.upstash.io:6379
```

---

## 📦 3. Deploy do Backend

### Opção A: Railway (Recomendado)

1. Acesse [Railway](https://railway.app)
2. Conecte seu GitHub
3. Crie novo projeto → Deploy from repo
4. Configure variáveis de ambiente:

```env
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Auth
JWT_SECRET=sua-chave-super-secreta-min-32-chars
JWT_REFRESH_SECRET=outra-chave-super-secreta-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=https://seu-dominio.vercel.app

# Email (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@kreativ.ae

# WhatsApp Cloud API
WHATSAPP_TOKEN=EAAxxxxx
WHATSAPP_PHONE_ID=123456789
WHATSAPP_VERIFY_TOKEN=seu-token-verificacao

# Instagram
INSTAGRAM_APP_ID=xxxxx
INSTAGRAM_APP_SECRET=xxxxx
INSTAGRAM_VERIFY_TOKEN=seu-token-verificacao

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxx
MICROSOFT_CLIENT_SECRET=xxxxx
MICROSOFT_TENANT_ID=common

# Apple Sign In
APPLE_SERVICE_ID=com.seuapp.signin
APPLE_TEAM_ID=xxxxx
APPLE_KEY_ID=xxxxx
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# OpenAI (para IA)
OPENAI_API_KEY=sk-xxxxx
```

5. Configure o start command:
```bash
npm run build && npm start
```

6. Railway fornecerá uma URL como: `https://nexcrm-backend.up.railway.app`

### Opção B: Render

1. Acesse [Render](https://render.com)
2. Conecte seu GitHub
3. Crie um novo Web Service
4. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node
5. Adicione variáveis de ambiente (mesmas do Railway)

---

## 📦 4. Deploy do Frontend

### Vercel (Recomendado)

1. Acesse [Vercel](https://vercel.com)
2. Importe o repositório do GitHub
3. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Adicione variáveis de ambiente:

```env
VITE_API_URL=https://nexcrm-backend.up.railway.app/api
VITE_APP_NAME=NexCRM
```

5. Deploy!

### Configurar Domínio Personalizado

1. No Vercel, vá em Settings → Domains
2. Adicione seu domínio: `projeto.kreativ.ae`
3. Configure DNS no seu registrador:
   - Tipo: CNAME
   - Nome: app
   - Valor: cname.vercel-dns.com

---

## 🔐 5. Configurar OAuth

### Google OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione existente
3. Vá em APIs & Services → Credentials
4. Crie OAuth 2.0 Client ID:
   - Tipo: Web application
   - Authorized redirect URIs:
     - `https://seu-backend.railway.app/api/auth/google/callback`
5. Copie Client ID e Client Secret

### Microsoft OAuth

1. Acesse [Azure Portal](https://portal.azure.com)
2. Vá em Azure Active Directory → App registrations
3. Crie novo registro:
   - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   - Redirect URI: `https://seu-backend.railway.app/api/auth/microsoft/callback`
4. Copie Application (client) ID
5. Em Certificates & secrets, crie um novo client secret

### Apple Sign In

1. Acesse [Apple Developer](https://developer.apple.com)
2. Vá em Certificates, Identifiers & Profiles
3. Crie um Service ID para Sign in with Apple
4. Configure o domínio e redirect URL
5. Crie uma Key para Sign in with Apple
6. Baixe o arquivo .p8 (Private Key)

---

## 📱 6. Configurar Integrações

### WhatsApp Cloud API

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Crie um app do tipo Business
3. Adicione o produto WhatsApp
4. Configure um número de telefone de teste
5. Gere um Access Token permanente
6. Configure o Webhook:
   - URL: `https://seu-backend.railway.app/api/webhooks/whatsapp`
   - Verify Token: (o mesmo que você definiu nas env vars)
   - Inscreva-se em: `messages`

### Instagram

1. No mesmo app do Meta for Developers
2. Adicione o produto Instagram Basic Display ou Messenger
3. Configure OAuth redirect
4. Configure Webhook para mensagens

### Telegram

1. Fale com [@BotFather](https://t.me/BotFather) no Telegram
2. Crie um novo bot: `/newbot`
3. Copie o Token do bot
4. Configure webhook:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://seu-backend.railway.app/api/webhooks/telegram"
```

---

## ✅ 7. Verificação Final

### Checklist de Produção

```bash
# 1. Testar health check
curl https://seu-backend.railway.app/health

# 2. Testar login
curl -X POST https://seu-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456"}'

# 3. Testar CORS
# Acessar o frontend e verificar se as requisições funcionam

# 4. Testar webhooks
# Enviar mensagem teste pelo WhatsApp/Instagram/Telegram
```

### Monitoramento

1. **Logs**: Railway/Render fornecem logs em tempo real
2. **Erros**: Configure Sentry para capturar erros
3. **Métricas**: Use o dashboard do MongoDB Atlas
4. **Uptime**: Configure UptimeRobot ou similar

---

## 💰 Custos Estimados (Mensal)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel (Frontend) | Pro | $20 |
| Railway (Backend) | Developer | $5-20 |
| MongoDB Atlas | M10 | $57 |
| Upstash Redis | Pay as you go | $0-10 |
| Domínio | - | ~$12/ano |
| **TOTAL** | | **~$90-110/mês** |

### Alternativa Econômica (MVP)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel (Frontend) | Hobby | Free |
| Render (Backend) | Free | Free |
| MongoDB Atlas | M0 | Free |
| Upstash Redis | Free tier | Free |
| **TOTAL** | | **$0/mês** |

⚠️ **Nota**: Planos gratuitos têm limitações (cold starts, storage limitado, etc.)

---

## 🚀 Comandos de Deploy

### Backend (Railway)
```bash
cd backend
git add .
git commit -m "Deploy to production"
git push origin main
# Railway faz deploy automático
```

### Frontend (Vercel)
```bash
cd frontend  # ou raiz do projeto
git add .
git commit -m "Deploy to production"
git push origin main
# Vercel faz deploy automático
```

---

## 📞 Suporte

Se encontrar problemas durante o deploy:

1. Verifique os logs no Railway/Render/Vercel
2. Confirme que todas as variáveis de ambiente estão configuradas
3. Teste localmente primeiro: `npm run dev`
4. Verifique a conexão com MongoDB: `mongosh "sua-connection-string"`

---

**O sistema está pronto para produção!** 🎉

Siga os passos acima e seu NexCRM estará no ar em poucas horas.
