# astrofotos

Sistema de processamento de imagens astronômicas. A ideia é permitir o upload de fotos de astrofotografia e, a partir delas, gerar automaticamente uma versão web (otimizada) e uma miniatura, extraindo e armazenando metadados da imagem — tudo com acompanhamento de status (`PENDING` → `PROCESSING` → `COMPLETED`/`FAILED`) e filtragem por usuário e tipo de imagem.

> Projeto em desenvolvimento ativo. Este README reflete o estado atual do código, não um produto final.

## Stack atual

- **Runtime:** Node.js + TypeScript (`tsx` em dev, `tsc` para build), módulos ESM
- **Servidor HTTP:** [Express 5](https://expressjs.com/)
- **Upload de arquivos:** [Multer](https://github.com/expressjs/multer) (com filtro para aceitar apenas imagens)
- **Banco de dados:** PostgreSQL (hospedado no [Supabase](https://supabase.com/)), acessado via [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm` + `postgres`)
- **Processamento de imagem (planejado/instalado, ainda não integrado ao fluxo):** [sharp](https://sharp.pixelplumbing.com/) para redimensionamento/conversão e [exifr](https://github.com/MikeKovarik/exifr) para extração de metadados EXIF

## Estado atual do projeto

O que já funciona:

- Upload de fotos via `POST /photo`, com validação de que o arquivo é uma imagem
- Persistência dos metadados básicos do arquivo (nome original, nome salvo, mimetype, tamanho, path) na tabela `photos`
- Recuperação de uma foto salva via `GET /photo/:id`
- Endpoint de health check (`GET /health`)
- Schema de banco gerenciado via Drizzle, sincronizado com um projeto Supabase (schemas `auth`, `storage`, `realtime` inclusos)

O que ainda **não** está implementado (roadmap):

- [ ] Geração automática de versão web e miniatura (usar `sharp`)
- [ ] Extração de metadados EXIF/astronômicos da imagem (usar `exifr`)
- [ ] Coluna e fluxo de `status` da imagem (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) — o enum `ImageStatus` já existe no schema, mas ainda não é usado na tabela `photos`
- [ ] Associação de fotos a usuários (`userId`) e filtragem por usuário/tipo de imagem
- [ ] Processamento assíncrono via fila (ex.: BullMQ/Redis ou similar)
- [ ] Ambiente de deploy (containerização, CI/CD, hospedagem)

## Estrutura do projeto

```
src/
  main.ts              # servidor Express e rotas
  db/
    instance.db.ts      # conexão com o Postgres (postgres-js + drizzle)
    schema.ts            # schema Drizzle (tabelas + enums)
    relations.ts         # relações entre tabelas
drizzle.config.ts        # configuração do drizzle-kit
.uploads/                 # arquivos enviados (armazenamento local, temporário)
```

## Como rodar localmente

### Pré-requisitos

- Node.js 24+
- Um banco Postgres (recomendado: projeto Supabase)

### Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um arquivo `.env` na raiz com as variáveis:

   ```bash
   DATABASE_URL=postgres://usuario:senha@host:porta/banco
   DIRECT_URL=postgres://usuario:senha@host:porta/banco
   ```

3. Rode as migrações do Drizzle (se aplicável ao seu banco):

   ```bash
   npx drizzle-kit push
   ```

### Rodando em desenvolvimento

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000`.

### Build

```bash
npm run build
```

## Endpoints atuais

| Método | Rota         | Descrição                                      |
|--------|--------------|-------------------------------------------------|
| GET    | `/health`    | Verifica se o servidor está no ar               |
| POST   | `/photo`     | Upload de uma imagem (campo `photo`)            |
| GET    | `/photo/:id` | Retorna o arquivo salvo pelo nome gerado no upload |

## Licença

MIT — veja [LICENSE](LICENSE).
