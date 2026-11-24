# Arquitetura

O Facilita é um app Next.js 14 (app router) com Prisma e Postgres (Supabase), publicado na Vercel. Fora da Vercel, uma VPS na Hostinger roda o WhatsApp (Evolution API) e o Claude Code com a assinatura. A VPS é descrita em [vps.md](vps.md).

```
Navegador ──► tela (src/app, src/components)
                 │
                 ▼
             rota da API (src/app/api) ── fina: sessão, validação, chama o serviço
                 │
                 ▼
             serviço e regras (src/lib) ── *-db.ts fala com o banco; o resto é função pura com teste
                 │
                 ▼
             Prisma ──► Postgres (Supabase, RLS ligado sem políticas)

WhatsApp ──► Evolution (VPS) ──► repetidor (VPS) ──► /api/whatsapp/webhook ──► src/lib/robo.ts
Claude da VPS ◄──► /api/claude/fila, /api/claude/audio, /api/claude/conversas (senha CLAUDE_PONTE_SECRET)
```

## As camadas

| Camada | Onde | Pode | Não pode |
|---|---|---|---|
| Tela | `src/app/**/page.tsx`, `src/components/**` | buscar dados por uma função de `src/lib` (página de servidor), mostrar e chamar a API | fazer conta de negócio, falar com o banco direto, importar `node:*` em componente `"use client"` |
| Rota | `src/app/api/**/route.ts` | conferir sessão (`withSession`) ou segredo, validar e limitar a entrada, chamar o serviço | ter regra de negócio |
| Serviço | `src/lib/*-db.ts` e os módulos que usam `db` | ler e gravar no banco, chamar serviços de fora (WhatsApp, Autentique, e-mail) | ser importado por componente de cliente |
| Regra pura | `src/lib/*.ts` sem `db` | contas, textos, validações, decisões | acessar banco, rede ou relógio sem receber como parâmetro |

**Testes:** toda regra pura tem `*.test.ts` ao lado (vitest). O teste de `src/lib/apresentacao/modelo.test.ts` lê uma planilha da pasta `base/` e falha fora da máquina do Fernando; é conhecido e não indica erro.

**Nomes:** em português, como o resto do projeto. Comentário explica o porquê (pedido, data, regra), não o óbvio.

**Arquivos grandes** (`JblPadrao.tsx`, `Editable.tsx`, `StudyEditor.tsx`, `ProposalEditor.tsx`): coisa nova vai em componente ou módulo próprio, importado.

## Mapa de `src/lib`, por assunto

### Áreas (Captação)
| Arquivo | O que faz |
|---|---|
| `captacao.ts` | Regras puras: etapas do funil, checklist oficial (30 seções, 265 itens), distribuir texto no checklist, validação da área, geladeira e descarte |
| `captacao-estudos.ts` | Viabilidade Legal e Mercadológica: leitura dos campos, cartão do funil, próximo passo, checklist que puxa dos passos |
| `captacao-proposta.ts` | Proposta que nasce com os dados dos estudos |
| `captacao-assinatura.ts` | Carta de intenção dentro da etapa Proposta: aviso no Central, bloco da tela, assinada → estudo de 30 dias |
| `captacao-db.ts` | Banco da Captação: listar, nutrir pelo WhatsApp, abrir projeto na SPE, guardar estudo da VPS |
| `kml.ts`, `poligono.ts` | Ler KML/KMZ, hectares, centro, cidade do ponto; `poligono.ts` pode ir para o navegador |
| `relatorio.ts`, `relatorio-db.ts` | Estudo completo (HTML) convertido em blocos e imagens para abrir dentro da área |

### WhatsApp
| Arquivo | O que faz |
|---|---|
| `whatsapp.ts` | Cliente do Evolution: enviar texto e arquivo, baixar mídia, ler mensagem do webhook, listar conversas |
| `limite-whatsapp.ts` | Limite de envio: robô 1 a cada 10 min (o resto espera em `MensagemEspera`); mensagens digitadas na tela 20 a cada 15 min |
| `estudo-andamento.ts` / `-db.ts` | Estudo pedido pela tela: fila da VPS, avisos "comecei" e "pronto" no JBL - Avisos, % na tela |
| `area-kmz.ts` / `-db.ts` | Trocar o KMZ da área, mantendo ou apagando o estudo |
| `estudo-parar.ts` / `-db.ts` | Parar e retomar o estudo (tela e WhatsApp): guardado 5 dias na VPS, depois descartado |
| `robo.ts` | Entrada do robô: decide o que fazer com cada mensagem (grupo ou particular) |
| `robo-areas.ts`, `robo-estudos.ts`, `robo-propostas.ts` | Comandos sobre áreas, Central (KMZ, 1 Sim · 2 Não, "Claude, …"), propostas |
| `grupos.ts` | Para que serve cada tipo de grupo |
| `contatos-terra.ts`, `contatos-terra-db.ts` | Conversas particulares: o Claude da VPS separa as de terra; áudios transcritos |
| `lembretes.ts`, `rotinas-whatsapp.ts`, `agenda-whatsapp.ts` | Lembretes, resumo da manhã, avisos de geladeira e do calendário |
| `avisos.ts` | Avisos das propostas nos grupos |
| `claude-ponte.ts` | Senha da VPS, quem pode pedir, tipo do pedido |

### Propostas
| Arquivo | O que faz |
|---|---|
| `calc.ts` | Motor de cálculo do estudo de parcelamento (mudança visível → `congelada.ts`) |
| `proposals.ts`, `queries.ts` | Opções da proposta, lista com números, dados do menu lateral |
| `congelada.ts` | Lista das mudanças visíveis com data: propostas bloqueadas antes continuam como eram |
| `carta.ts`, `minuta.ts`, `minuta-acoes.ts`, `autentique.ts` | Carta de intenção, minuta, envio para assinatura e retorno da Autentique |
| `formatos.ts`, `formato-server.ts`, `benfeitorias.ts`, `orcamento2026.ts`, `personalizadas.ts`, `template-salvar.ts` | Formatos de empreendimento, obras e benfeitorias, textos personalizados |
| `pdf.ts` | PDF da proposta em slides |
| `destinatario.ts`, `mensagem.ts`, `mascara.ts`, `format.ts` | Tratamento, mensagem de envio, máscaras, formatação de número |

### Base
| Arquivo | O que faz |
|---|---|
| `db.ts` | Prisma |
| `api.ts`, `auth.ts`, `session.ts`, `token.ts` | `withSession`, sessão em cookie, tokens |
| `sanitize.ts` | Limpeza de texto formatado (`cleanOverride`, `sanitizeHtml`) |
| `email.ts`, `sms.ts`, `site.ts`, `docs.ts`, `fases.ts`, `ia.ts`, `modo.ts` | E-mail, SMS, endereço público, documentos, fases, leitura de documentos, modo simples |
| `agenda.ts`, `agenda-server.ts`, `google-agenda.ts` | Calendário |

## Telas

| Endereço | O que é |
|---|---|
| `/app` | Painel |
| `/app/dia-a-dia`, `/app/calendario`, `/app/conversas` | Dia a dia, agenda, conversas no formato do WhatsApp |
| `/app/captacao` | **Áreas**: funil com as colunas das etapas, geladeira e descartadas |
| `/app/captacao/[id]` | A área: etapas, checklist, documentos, custos, pessoas, estudo, configurações |
| `/app/estudos`, `/app/cidades` | Lista dos estudos, biblioteca de cidades |
| `/app/propostas`, `/app/cartas`, `/app/proposta/[id]`, `/app/minuta/[id]` | Propostas, cartas recebidas, editor da proposta, editor do contrato |
| `/app/projetos/[id]` | Projeto de Loteamento: só existe depois do contrato da SPE; antes leva para a área |
| `/app/whatsapp`, `/app/templates`, `/app/usuarios`, `/app/imagens` | Configurações |
| `/p/[token]`, `/estudo/[token]`, `/assinar/[token]`, `/agenda/[slug]` | Páginas públicas (cliente, parceiro, assinatura, agendamento) |
