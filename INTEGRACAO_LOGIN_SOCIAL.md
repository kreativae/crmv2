# 🔐 Integração de Login Social — NexCRM

Este documento explica como implementar login com Google, Microsoft e Apple no sistema.

---

## 📋 Visão Geral

O login social usa o protocolo **OAuth 2.0** para autenticar usuários através de provedores externos. O fluxo básico é:

```
1. Usuário clica "Entrar com Google"
2. Frontend redireciona para página de consent do Google
3. Usuário autoriza o app
4. Google redireciona de volta com um código de autorização
5. Backend troca o código por tokens (access_token, id_token)
6. Backend extrai informações do usuário (email, nome, foto)
7. Backend cria/atualiza usuário no banco e gera JWT próprio
8. Frontend recebe JWT e faz login
```

---

## 🔧 Configuração por Provedor

### 1️⃣ Google OAuth

**Passo 1: Criar projeto no Google Cloud Console**
1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto (ou use existente)
3. Vá em **APIs & Services > Credentials**
4. Clique **Create Credentials > OAuth 2.0 Client IDs**
5. Configure:
   - Application type: **Web application**
   - Name: **NexCRM**
   - Authorized redirect URIs:
    - `https://projeto.kreativ.ae/api/auth/callback/google`
6. Copie o **Client ID** e **Client Secret**

**Passo 2: Variáveis de ambiente**
```env
GOOGLE_CLIENT_ID=sua_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
```

**Passo 3: Endpoint de inicialização**
```typescript
// /api/auth/google/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`;
  const scope = encodeURIComponent('email profile openid');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  return NextResponse.redirect(authUrl);
}
```

**Passo 4: Callback handler**
```typescript
// /api/auth/callback/google/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }
  
  // Trocar código por tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
      grant_type: 'authorization_code',
    }),
  });
  
  const tokens = await tokenResponse.json();
  
  // Decodificar id_token para obter dados do usuário
  const payload = JSON.parse(
    Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
  );
  
  const { email, name, picture, sub: googleId } = payload;
  
  // Criar ou atualizar usuário no banco
  // ... sua lógica de banco de dados
  
  // Gerar JWT próprio
  // ... sua lógica de JWT
  
  // Redirecionar para o app com token
  return NextResponse.redirect(`/auth/success?token=${jwt}`);
}
```

---

### 2️⃣ Microsoft OAuth (Azure AD)

**Passo 1: Registrar app no Azure**
1. Acesse https://portal.azure.com/
2. Vá em **Azure Active Directory > App registrations**
3. Clique **New registration**
4. Configure:
   - Name: **NexCRM**
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: 
     - Platform: **Web**
    - URL: `https://projeto.kreativ.ae/api/auth/callback/microsoft`
5. Após criar, vá em **Certificates & secrets**
6. Clique **New client secret** e copie o valor
7. Copie também o **Application (client) ID** da página Overview

**Passo 2: Variáveis de ambiente**
```env
MICROSOFT_CLIENT_ID=seu_application_client_id
MICROSOFT_CLIENT_SECRET=seu_client_secret
MICROSOFT_TENANT_ID=common  # ou seu tenant específico
```

**Passo 3: Endpoint de inicialização**
```typescript
// /api/auth/microsoft/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/microsoft`;
  const scope = encodeURIComponent('openid email profile User.Read');
  
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `response_mode=query`;
  
  return NextResponse.redirect(authUrl);
}
```

**Passo 4: Callback handler**
```typescript
// /api/auth/callback/microsoft/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  
  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }
  
  // Trocar código por tokens
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/microsoft`,
        grant_type: 'authorization_code',
      }),
    }
  );
  
  const tokens = await tokenResponse.json();
  
  // Buscar dados do usuário via Graph API
  const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  
  const user = await userResponse.json();
  const { mail, displayName, id: microsoftId, userPrincipalName } = user;
  
  // Criar ou atualizar usuário no banco
  // ... sua lógica
  
  return NextResponse.redirect(`/auth/success?token=${jwt}`);
}
```

---

### 3️⃣ Apple Sign In

**Passo 1: Configurar no Apple Developer**
1. Acesse https://developer.apple.com/
2. Vá em **Certificates, Identifiers & Profiles**
3. Em **Identifiers**, crie um **App ID** com Sign In with Apple habilitado
4. Em **Keys**, crie uma nova key com Sign In with Apple
5. Baixe o arquivo `.p8` da key
6. Configure um **Service ID**:
   - Identifier: `com.nexcrm.auth` (exemplo)
   - Enable Sign In with Apple
   - Configure domains e redirect URLs

**Passo 2: Variáveis de ambiente**
```env
APPLE_CLIENT_ID=com.nexcrm.auth  # Service ID
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Passo 3: Gerar Client Secret (Apple usa JWT)**
```typescript
// lib/apple-auth.ts
import jwt from 'jsonwebtoken';

export function generateAppleClientSecret() {
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  
  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '180d',
    audience: 'https://appleid.apple.com',
    issuer: process.env.APPLE_TEAM_ID,
    subject: process.env.APPLE_CLIENT_ID,
    keyid: process.env.APPLE_KEY_ID,
  });
  
  return token;
}
```

**Passo 4: Endpoint de inicialização**
```typescript
// /api/auth/apple/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.APPLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/apple`;
  const scope = 'name email';
  const state = crypto.randomUUID(); // CSRF protection
  
  const authUrl = `https://appleid.apple.com/auth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_mode=form_post&` +
    `state=${state}`;
  
  return NextResponse.redirect(authUrl);
}
```

**Passo 5: Callback handler (Apple usa POST!)**
```typescript
// /api/auth/callback/apple/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAppleClientSecret } from '@/lib/apple-auth';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get('code') as string;
  const userJson = formData.get('user') as string | null;
  
  if (!code) {
    return NextResponse.redirect('/login?error=no_code');
  }
  
  const clientSecret = generateAppleClientSecret();
  
  // Trocar código por tokens
  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/apple`,
      grant_type: 'authorization_code',
    }),
  });
  
  const tokens = await tokenResponse.json();
  
  // Decodificar id_token
  const payload = JSON.parse(
    Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
  );
  
  // Apple só envia nome na primeira autenticação!
  let name = 'Usuário Apple';
  if (userJson) {
    const userData = JSON.parse(userJson);
    name = `${userData.name?.firstName || ''} ${userData.name?.lastName || ''}`.trim();
  }
  
  const { email, sub: appleId } = payload;
  
  // Criar ou atualizar usuário
  // ... sua lógica
  
  return NextResponse.redirect(`/auth/success?token=${jwt}`);
}
```

---

## 🎯 Frontend — Handlers

Atualize a `LoginPage.tsx` para chamar as APIs:

```typescript
// Dentro do componente LoginPage
const handleSocialLogin = (provider: 'google' | 'microsoft' | 'apple') => {
  // Redireciona para o endpoint de OAuth
  window.location.href = `/api/auth/${provider}`;
};

// No JSX, substitua os botões por:
{[
  { name: 'Google', provider: 'google', svg: (/* svg existente */) },
  { name: 'Microsoft', provider: 'microsoft', svg: (/* svg existente */) },
  { name: 'Apple', provider: 'apple', svg: (/* svg existente */) },
].map((item) => (
  <motion.button
    key={item.name}
    onClick={() => handleSocialLogin(item.provider)}
    whileHover={{ scale: 1.03, y: -1 }}
    whileTap={{ scale: 0.97 }}
    className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] ..."
  >
    {item.svg}
    <span className="hidden sm:inline">{item.name}</span>
  </motion.button>
))}
```

---

## 🔒 Página de Sucesso

Crie uma página para receber o token após autenticação:

```typescript
// /auth/success/page.tsx (ou equivalente no Vite)
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Salvar token no localStorage ou estado global
      localStorage.setItem('auth_token', token);
      
      // Redirecionar para dashboard
      router.push('/dashboard');
    } else {
      router.push('/login?error=no_token');
    }
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );
}
```

---

## 📦 Bibliotecas Recomendadas

Se preferir uma solução pronta, use:

### NextAuth.js (recomendado para Next.js)
```bash
npm install next-auth
```

```typescript
// /api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import AppleProvider from 'next-auth/providers/apple';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: generateAppleClientSecret(),
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Criar/atualizar usuário no seu banco
      return true;
    },
    async jwt({ token, account }) {
      // Adicionar dados ao JWT
      return token;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## ✅ Checklist de Implementação

### Google
- [ ] Criar projeto no Google Cloud Console
- [ ] Configurar OAuth consent screen
- [ ] Criar OAuth 2.0 credentials
- [ ] Adicionar redirect URIs
- [ ] Implementar endpoints no backend
- [ ] Testar fluxo completo

### Microsoft
- [ ] Registrar app no Azure AD
- [ ] Criar client secret
- [ ] Configurar redirect URIs
- [ ] Implementar endpoints no backend
- [ ] Testar fluxo completo

### Apple
- [ ] Conta Apple Developer ($99/ano)
- [ ] Criar App ID com Sign In with Apple
- [ ] Criar Service ID
- [ ] Gerar e baixar key .p8
- [ ] Implementar geração de client secret
- [ ] Implementar endpoints no backend
- [ ] Testar fluxo completo

---

## 🚨 Considerações de Segurança

1. **HTTPS obrigatório** em produção
2. **State parameter** para prevenir CSRF
3. **Validar id_token** com chaves públicas do provedor
4. **Nunca expor client secrets** no frontend
5. **Refresh tokens** devem ser armazenados de forma segura
6. **Rate limiting** nos endpoints de callback

---

## 💡 Dicas

1. **Apple** exige conta Developer paga ($99/ano)
2. **Microsoft** permite contas pessoais e corporativas — escolha o tenant adequado
3. **Google** precisa verificação do app para mais de 100 usuários
4. Guarde o **email** como identificador único — o sub/id dos provedores pode mudar
5. Implemente **link de contas** para usuários que já existem com email/senha

---

## 📞 Suporte

Para dúvidas sobre implementação, consulte:
- Google: https://developers.google.com/identity/protocols/oauth2
- Microsoft: https://docs.microsoft.com/en-us/azure/active-directory/develop/
- Apple: https://developer.apple.com/sign-in-with-apple/
