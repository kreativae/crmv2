# 🔍 Revisão Arquitetural — NexCRM Backend

**Data da Revisão:** Janeiro 2025  
**Status:** ✅ APROVADO COM RECOMENDAÇÕES

---

## 📋 Sumário Executivo

O documento `estrategia.md` apresenta uma arquitetura **sólida e bem estruturada** para um sistema SaaS multi-tenant. A maioria das decisões está alinhada com boas práticas de mercado. Este documento detalha:

1. ✅ Decisões **validadas e aprovadas**
2. ⚠️ Pontos de **atenção e melhorias**
3. ❌ Problemas **críticos a corrigir**
4. 💡 Recomendações **adicionais**

---

## 1. Stack Tecnológica

### ✅ APROVADO

| Decisão | Avaliação | Comentário |
|---------|-----------|------------|
| **Node.js 20 LTS** | ✅ Excelente | Versão estável, suporte longo, performance melhorada |
| **TypeScript** | ✅ Essencial | Type safety crítico para projetos grandes |
| **MongoDB Atlas** | ✅ Adequado | Flexibilidade para schema evolutivo, bom para CRM |
| **Redis Upstash** | ✅ Inteligente | Serverless, baixo custo inicial, escala automaticamente |
| **Prisma ORM** | ✅ Recomendado | Type-safe, migrations, boa DX |
| **Zod** | ✅ Moderno | Validação runtime + tipos TypeScript |
| **Socket.io** | ✅ Maduro | Real-time consolidado, fallbacks automáticos |
| **JWT + Refresh** | ✅ Padrão | Stateless, escalável |

### ⚠️ ATENÇÃO

| Decisão | Problema | Recomendação |
|---------|----------|--------------|
| **Express vs Fastify** | Documento não decide | **Escolher Fastify** — 2-3x mais rápido, schema validation nativo, melhor TypeScript support |
| **Cloudinary** | Custo pode escalar | Considerar **AWS S3 + CloudFront** para maior volume. Cloudinary OK para início |
| **Resend vs SendGrid** | Não decidido | **Resend** para simplicidade, **SendGrid** para features avançadas (templates, analytics) |

### 💡 ADICIONAR À STACK

```typescript
// Recomendações de bibliotecas adicionais:

// 1. Background Jobs
"bullmq": "^5.0.0"          // Job queue com Redis (automações, emails em massa)

// 2. Logging estruturado  
"pino": "^8.0.0"            // Logger JSON, 5x mais rápido que winston

// 3. Error Tracking
"@sentry/node": "^7.0.0"    // Monitoramento de erros em produção

// 4. API Documentation
"@fastify/swagger": "^8.0.0" // OpenAPI spec automática

// 5. Testing
"vitest": "^1.0.0"          // Testes rápidos, compatível com Jest API
"supertest": "^6.0.0"       // Testes de API

// 6. Security
"@fastify/rate-limit": "^9.0.0"
"@fastify/helmet": "^11.0.0"
"@fastify/cors": "^8.0.0"

// 7. Validation (já tem Zod, mas adicionar)
"zod-to-json-schema": "^3.0.0"  // Converter Zod para JSON Schema (Swagger)
```

---

## 2. Estrutura do Banco de Dados

### ✅ APROVADO — Modelos Bem Estruturados

Os modelos apresentados cobrem bem os requisitos. Pontos positivos:

- ✅ `organizationId` em todas as collections (multi-tenant correto)
- ✅ Separação de `Message` da `Conversation` (escalabilidade)
- ✅ `customFields` como Map para flexibilidade
- ✅ Índices compostos bem planejados
- ✅ TTL index para audit logs (limpeza automática)

### ⚠️ MELHORIAS NECESSÁRIAS

#### 2.1 Adicionar Campo `deletedAt` (Soft Delete)

```typescript
// Problema: DELETE real perde histórico e pode quebrar referências
// Solução: Soft delete em entidades principais

// Adicionar em: Lead, Contact, Conversation, Task, Transaction
{
  // ... outros campos
  deletedAt: Date | null,        // null = ativo, Date = deletado
  deletedBy: ObjectId | null
}

// Índice para filtrar deletados
db.leads.createIndex({ 
  "organizationId": 1, 
  "deletedAt": 1,
  "status": 1 
})
```

#### 2.2 Adicionar Versionamento para Otimistic Locking

```typescript
// Problema: Edições simultâneas podem sobrescrever dados
// Solução: Campo __v para versionamento

{
  __v: number  // Incrementa a cada update, reject se versão diferente
}

// No update:
const result = await Lead.updateOne(
  { _id: leadId, __v: currentVersion },
  { $set: updates, $inc: { __v: 1 } }
)
if (result.modifiedCount === 0) {
  throw new ConflictError('Lead foi modificado por outro usuário')
}
```

#### 2.3 Separar `LeadNote` e `LeadActivity`

```typescript
// Está correto no documento, mas reforçar:
// LeadActivity = timeline automática (sistema gera)
// LeadNote = notas manuais do usuário

// Adicionar índice para busca full-text em notas
db.leadNotes.createIndex({ 
  "content": "text",
  "organizationId": 1 
})
```

#### 2.4 Adicionar Collection de `Templates`

```typescript
// Falta no documento: Templates de mensagens reutilizáveis

// MessageTemplate
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  name: string,
  category: 'greeting' | 'follow_up' | 'closing' | 'support' | 'marketing',
  
  channels: ('whatsapp' | 'instagram' | 'email')[],
  
  content: {
    text: string,                    // Com placeholders {{nome}}, {{empresa}}
    mediaUrl?: string,
    buttons?: [{
      type: 'url' | 'phone' | 'quick_reply',
      text: string,
      value: string
    }]
  },
  
  // WhatsApp específico
  whatsappTemplateId?: string,       // ID do template aprovado
  whatsappStatus?: 'pending' | 'approved' | 'rejected',
  
  usageCount: number,
  lastUsedAt: Date,
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2.5 Adicionar Collection de `QuickReply`

```typescript
// QuickReply (respostas rápidas do agente)
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  shortcut: string,          // "/ola" - atalho para digitar
  title: string,
  content: string,
  
  category: string,
  tags: string[],
  
  usageCount: number,
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

db.quickReplies.createIndex({ "organizationId": 1, "shortcut": 1 }, { unique: true })
```

#### 2.6 Índices Adicionais Críticos

```javascript
// Índices faltando para performance:

// 1. Busca full-text em leads
db.leads.createIndex({ 
  "name": "text", 
  "email": "text", 
  "company": "text",
  "phone": "text"
}, { 
  weights: { name: 10, email: 5, company: 3, phone: 2 },
  name: "leads_fulltext"
})

// 2. Conversas por SLA (para alertas)
db.conversations.createIndex({ 
  "organizationId": 1,
  "slaBreached": 1,
  "status": 1,
  "slaDeadline": 1
})

// 3. Mensagens por data (para exports)
db.messages.createIndex({ 
  "organizationId": 1,
  "createdAt": -1 
})

// 4. Automações ativas por trigger (para event matching)
db.automations.createIndex({ 
  "organizationId": 1,
  "status": 1,
  "trigger.type": 1 
})

// 5. Transações por período (relatórios)
db.transactions.createIndex({ 
  "organizationId": 1,
  "type": 1,
  "status": 1,
  "createdAt": -1 
})
```

---

## 3. API Design

### ✅ APROVADO — Estrutura RESTful Correta

- Rotas bem organizadas por recurso
- Padrões de resposta consistentes
- Filtros e paginação bem definidos

### ⚠️ MELHORIAS

#### 3.1 Adicionar Rotas Faltantes

```typescript
// Rotas que faltam no documento:

// Templates
'/api/templates': {
  GET: 'List templates',
  POST: 'Create template',
  '/:id': { GET, PATCH, DELETE },
  '/:id/duplicate': 'POST - Duplicar template'
}

// Quick Replies  
'/api/quick-replies': {
  GET: 'List quick replies',
  POST: 'Create quick reply',
  '/:id': { GET, PATCH, DELETE }
}

// Contacts (separado de Leads)
'/api/contacts': {
  GET: 'List contacts',
  POST: 'Create contact',
  '/:id': { GET, PATCH, DELETE },
  '/:id/merge': 'POST - Merge contacts',
  '/:id/conversations': 'GET - All conversations'
}

// Bulk Operations
'/api/leads/bulk': {
  POST: { action: 'delete' | 'move' | 'assign' | 'tag', ids: [] }
}
'/api/tasks/bulk': {
  POST: { action: 'complete' | 'delete' | 'assign', ids: [] }
}

// Reports específicos
'/api/reports': {
  '/funnel': 'GET - Funil de vendas',
  '/cohort': 'GET - Análise de cohort',
  '/forecast': 'GET - Previsão de receita',
  '/export': 'POST - Gerar export (retorna job ID)',
  '/export/:jobId': 'GET - Status/download do export'
}

// Health & Status
'/api/health': 'GET - Health check',
'/api/status': 'GET - System status (admin only)'
```

#### 3.2 Implementar Cursor-Based Pagination

```typescript
// Problema: Paginação offset-based é lenta para grandes volumes
// Solução: Cursor-based pagination

// Request
GET /api/messages?conversationId=xxx&limit=50&cursor=eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFoiLCJfaWQiOiI2NWE1ZjEyMzQ1Njc4OTBhYmNkZWYwMTIifQ==

// Response
{
  "success": true,
  "data": [...],
  "meta": {
    "limit": 50,
    "hasMore": true,
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDA5OjMwOjAwLjAwMFoiLCJfaWQiOiI2NWE1ZjA5ODc2NTQzMjEwZmVkY2JhOTgifQ==",
    "prevCursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDExOjMwOjAwLjAwMFoiLCJfaWQiOiI2NWE1ZjFhYmNkZWYxMjM0NTY3ODkwYWIifQ=="
  }
}

// Cursor = base64 encode de: { createdAt, _id }
// Query: WHERE (createdAt, _id) < (cursorCreatedAt, cursorId)
```

#### 3.3 Adicionar Rate Limit Headers

```typescript
// Headers de rate limit padrão

// Response Headers:
'X-RateLimit-Limit': '100',        // Requests por janela
'X-RateLimit-Remaining': '95',     // Requests restantes
'X-RateLimit-Reset': '1642435200', // Timestamp reset (Unix)

// Quando exceder (429):
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## 4. Autenticação & Segurança

### ✅ APROVADO — Fluxo Seguro

- JWT + Refresh token rotation ✅
- httpOnly cookie para refresh ✅
- Access token em memória (não localStorage) ✅
- Middleware stack completo ✅

### ⚠️ MELHORIAS CRÍTICAS

#### 4.1 Adicionar Blacklist de Refresh Tokens

```typescript
// Problema: Refresh token comprometido pode ser usado até expirar
// Solução: Blacklist em Redis

// Ao fazer logout ou refresh:
await redis.setex(
  `blacklist:refresh:${tokenId}`,
  REFRESH_TOKEN_EXPIRY_SECONDS,
  '1'
)

// Ao validar refresh token:
const isBlacklisted = await redis.get(`blacklist:refresh:${tokenId}`)
if (isBlacklisted) {
  throw new UnauthorizedError('Token revoked')
}
```

#### 4.2 Adicionar Device Tracking

```typescript
// Para segurança e "logout de todos os dispositivos"

// Session
{
  _id: ObjectId,
  userId: ObjectId,
  refreshTokenHash: string,
  
  device: {
    type: 'desktop' | 'mobile' | 'tablet',
    os: string,
    browser: string,
    ip: string,
    location: string  // GeoIP
  },
  
  createdAt: Date,
  lastActiveAt: Date,
  expiresAt: Date
}

// Endpoints
POST /api/auth/sessions              // List active sessions
DELETE /api/auth/sessions/:id        // Logout specific device
DELETE /api/auth/sessions            // Logout all devices
```

#### 4.3 Adicionar MFA (Two-Factor Authentication)

```typescript
// User model adicionar:
{
  mfa: {
    enabled: boolean,
    method: 'totp' | 'sms' | 'email',
    secret: string,              // TOTP secret (encrypted)
    backupCodes: string[],       // Hashed
    lastUsedAt: Date
  }
}

// Endpoints
POST /api/auth/mfa/enable           // Gera QR code
POST /api/auth/mfa/verify           // Verifica e ativa
POST /api/auth/mfa/disable          // Desativa (requer senha)
POST /api/auth/mfa/backup-codes     // Regenera códigos backup
```

#### 4.4 Rate Limit Diferenciado

```typescript
// Rate limits por tipo de operação:

const RATE_LIMITS = {
  // Auth - mais restritivo
  'POST /api/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
  'POST /api/auth/forgot-password': { windowMs: 60 * 60 * 1000, max: 3 },
  
  // Leitura - mais permissivo
  'GET /api/leads': { windowMs: 60 * 1000, max: 100 },
  'GET /api/conversations': { windowMs: 60 * 1000, max: 100 },
  
  // Escrita - moderado
  'POST /api/leads': { windowMs: 60 * 1000, max: 30 },
  'POST /api/messages': { windowMs: 60 * 1000, max: 60 },
  
  // AI - restritivo (caro)
  'POST /api/ai/*': { windowMs: 60 * 1000, max: 10 },
  
  // Webhooks - alto volume
  'POST /api/webhooks-handlers/*': { windowMs: 60 * 1000, max: 1000 }
}
```

---

## 5. Multi-Tenancy

### ✅ APROVADO — Estratégia Correta

- Shared database + discriminator ✅
- Middleware de contexto ✅
- Plan limits enforcement ✅

### ⚠️ MELHORIAS

#### 5.1 Adicionar Row-Level Security Tests

```typescript
// tests/multi-tenancy.test.ts

describe('Multi-Tenancy Isolation', () => {
  it('should never return leads from another organization', async () => {
    // Create lead in org1
    const lead = await createLead(org1Id, { name: 'Test' })
    
    // Try to access from org2 context
    const result = await request(app)
      .get(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${org2Token}`)
    
    expect(result.status).toBe(404)
  })
  
  it('should not allow update of another org lead', async () => {
    const lead = await createLead(org1Id, { name: 'Test' })
    
    const result = await request(app)
      .patch(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${org2Token}`)
      .send({ name: 'Hacked' })
    
    expect(result.status).toBe(404)
    
    // Verify not modified
    const original = await Lead.findById(lead._id)
    expect(original.name).toBe('Test')
  })
  
  it('should enforce plan limits', async () => {
    // Set org to starter plan (max 3 users)
    await Org.updateOne({ _id: orgId }, { plan: 'starter' })
    
    // Create 3 users
    await createUsers(orgId, 3)
    
    // Try to create 4th
    const result = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: 'new@test.com' })
    
    expect(result.status).toBe(403)
    expect(result.body.error.code).toBe('PLAN_LIMIT_REACHED')
  })
})
```

#### 5.2 Adicionar Tenant Health Monitoring

```typescript
// Para identificar "noisy neighbors"

// Coletar métricas por tenant:
interface TenantMetrics {
  organizationId: string
  period: '1h' | '24h'
  
  apiCalls: number
  dbQueries: number
  storageUsedMB: number
  messagesProcessed: number
  automationsRun: number
  
  avgResponseTimeMs: number
  errorCount: number
}

// Alert se tenant usar recursos excessivos
```

---

## 6. Integrações Externas

### ✅ APROVADO — Padrões Corretos

- Webhook handler com response imediato ✅
- Processamento assíncrono ✅
- Verificação de assinatura ✅

### ⚠️ ADICIONAR

#### 6.1 Circuit Breaker para Integrações

```typescript
// Problema: Se WhatsApp API cair, não travar todo o sistema
// Solução: Circuit breaker pattern

import CircuitBreaker from 'opossum'

const whatsappBreaker = new CircuitBreaker(
  whatsappService.sendMessage,
  {
    timeout: 10000,           // 10s timeout
    errorThresholdPercentage: 50,
    resetTimeout: 30000       // 30s antes de tentar de novo
  }
)

whatsappBreaker.on('open', () => {
  logger.warn('WhatsApp circuit OPEN - falling back')
  notifyAdmins('WhatsApp integration down')
})

whatsappBreaker.on('halfOpen', () => {
  logger.info('WhatsApp circuit HALF-OPEN - testing')
})

whatsappBreaker.on('close', () => {
  logger.info('WhatsApp circuit CLOSED - recovered')
})
```

#### 6.2 Retry com Exponential Backoff

```typescript
// Para webhook handlers que falham

import { Retryable } from 'typescript-retry-decorator'

class WebhookService {
  @Retryable({
    maxAttempts: 5,
    backOff: 1000,
    backOffPolicy: 'exponential', // 1s, 2s, 4s, 8s, 16s
    doRetry: (e) => e.status >= 500
  })
  async callWebhook(url: string, payload: any) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }
}
```

#### 6.3 Encryption para Credentials

```typescript
// Problema: Tokens de integração em plain text no DB
// Solução: Encryption at rest

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY // 32 bytes

function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  
  return decipher.update(encrypted) + decipher.final('utf8')
}

// Uso no model:
{
  credentials: {
    accessToken: encrypt(rawToken),  // Armazenar encriptado
    // ...
  }
}
```

---

## 7. Fases de Implementação

### ✅ APROVADO — Timeline Realista

12 semanas é adequado para MVP com as features principais.

### ⚠️ REORDENAR PRIORIDADES

```typescript
// Sugestão de reordenação:

// FASE 1: Foundation (3 semanas) - OK como está
// ✅ Auth, Users, Organizations, CRM básico

// FASE 2: Comunicação (3 semanas) - MUDAR ORDEM
// Semana 4: Omnichannel base + WebSocket ✅
// Semana 5: WhatsApp APENAS (foco total) ← Mudar
// Semana 6: Email + Webchat ← Mudar
// Instagram/Facebook/Telegram → FASE 5 (pode esperar)

// FASE 3: Automação (2 semanas) - OK
// ✅ Engine de triggers e actions

// FASE 4: Finance & Analytics (2 semanas) - OK
// ✅ Transações, Goals, Reports

// FASE 5: Channels Adicionais + Polish (2 semanas) - NOVO
// Instagram DM, Facebook Messenger, Telegram
// Testing, Security audit, Documentation
```

### 💡 ADICIONAR: Milestones de Validação

```
Semana 3: Demo 1 — Login + CRM funcionando end-to-end
Semana 6: Demo 2 — Omnichannel WhatsApp + Email funcionando
Semana 8: Demo 3 — Automações criando tarefas e enviando mensagens
Semana 10: Demo 4 — Finance + Analytics reports
Semana 12: Beta Release — Convidar 5 usuários reais para testar
```

---

## 8. Infraestrutura & Deploy

### ✅ APROVADO — Opções Bem Avaliadas

### ⚠️ RECOMENDAÇÃO DEFINITIVA

```
PARA MVP (Primeiros 6 meses):
├── Frontend: Vercel ✅
├── Backend: Railway (Express/Fastify dedicado) ✅
│   └── Motivo: WebSocket nativo, sem cold starts, $5/mês inicial
├── Database: MongoDB Atlas M10 ($57/mês) ✅
├── Redis: Upstash (free tier até 10k comandos/dia) ✅
├── Storage: Cloudinary (free 25GB) ✅
├── Email: Resend (free 3k emails/mês) ✅
└── Monitoring: Sentry (free 5k errors/mês) ✅

CUSTO MENSAL ESTIMADO: ~$70-100/mês

PARA ESCALA (Após 100 clientes):
├── Backend: AWS ECS ou GCP Cloud Run
├── Database: MongoDB Atlas M30+
├── Redis: Upstash Pro ou ElastiCache
├── Queue: AWS SQS + Lambda
├── Storage: AWS S3 + CloudFront
└── CDN: CloudFlare
```

### 💡 ADICIONAR: Observabilidade

```typescript
// Stack de observabilidade recomendada:

// 1. Logging — Estruturado JSON
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  base: {
    service: 'nexcrm-api',
    env: process.env.NODE_ENV
  }
})

// Contexto por request
app.use((req, res, next) => {
  req.logger = logger.child({
    requestId: req.id,
    organizationId: req.organizationId,
    userId: req.user?.id
  })
  next()
})

// 2. Metrics — Prometheus format
import promClient from 'prom-client'

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

// 3. Tracing — OpenTelemetry
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('nexcrm-api')

// 4. Error Tracking — Sentry
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
})
```

---

## 9. Checklist Adicional

### Pré-Produção

```
□ HTTPS enforced (redirect HTTP → HTTPS)
□ Security headers (X-Frame-Options, CSP, etc.)
□ API versioning strategy (/api/v1/...)
□ Graceful shutdown handling
□ Health check endpoint (/health)
□ Database connection pooling
□ Request timeout configuration
□ File upload size limits
□ Input sanitization (XSS prevention)
□ SQL/NoSQL injection prevention
□ CORS whitelist (not *)
□ Rate limiting enabled
□ Error messages não expõem stack traces
□ Secrets em environment variables
□ Backups automáticos configurados
```

### Documentação Necessária

```
□ README com setup local
□ API documentation (Swagger/OpenAPI)
□ Environment variables reference
□ Database schema documentation
□ Deployment runbook
□ Incident response playbook
□ Onboarding guide para novos devs
```

---

## 10. Conclusão

### ✅ Decisões Validadas (Manter)

1. Stack Node.js + TypeScript + MongoDB
2. Multi-tenancy com shared database
3. JWT + Refresh token authentication
4. Prisma como ORM
5. Redis para cache e sessions
6. Estrutura modular de código
7. Timeline de 12 semanas
8. Webhook pattern para integrações

### ⚠️ Ajustes Recomendados

1. **Escolher Fastify** em vez de Express
2. **Adicionar soft delete** (deletedAt) nos models
3. **Adicionar MFA** para segurança
4. **Cursor-based pagination** para listas grandes
5. **Circuit breaker** para integrações externas
6. **Encryption at rest** para credentials
7. **Observabilidade** (logging, metrics, tracing)
8. **Priorizar WhatsApp** antes de outros canais

### ❌ Riscos Identificados

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Cold starts em serverless | Latência UX | Usar Railway (dedicado) |
| Refresh token leak | Segurança crítica | Blacklist + device tracking |
| Noisy neighbor | Performance | Tenant monitoring + limits |
| WhatsApp API down | Core feature quebra | Circuit breaker + fallback |

### 🚀 Próximos Passos

1. **Aprovar este documento** com stakeholders
2. **Criar repositório backend** com estrutura definida
3. **Configurar CI/CD** (GitHub Actions)
4. **Setup databases** (MongoDB Atlas + Redis Upstash)
5. **Implementar Fase 1** (Auth + CRM) em 3 semanas
6. **Review arquitetural** após Fase 1 completa

---

**Documento revisado e aprovado para início do desenvolvimento.**

*A arquitetura proposta é sólida e adequada para o escopo do projeto. As recomendações acima são melhorias incrementais que podem ser implementadas ao longo do desenvolvimento.*
