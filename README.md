# astrofotos

Sistema de processamento de imagens astronômicas. Permite o upload de fotos de astrofotografia (uma ou várias de uma vez) e, a partir delas, gera automaticamente variantes otimizadas em WebP (miniatura e versão web), organiza os arquivos em uma pasta própria por imagem e extrai os metadados EXIF na leitura.

> Projeto em desenvolvimento ativo. Este README reflete o estado atual do código, não um produto final.

## Stack atual

- **Runtime:** Node.js + TypeScript (`tsx` em dev, `tsc` para build), módulos ESM
- **Servidor HTTP:** [Express 5](https://expressjs.com/)
- **Upload de arquivos:** [Multer](https://github.com/expressjs/multer) (com filtro para aceitar apenas imagens; `single` e `array`)
- **Banco de dados:** PostgreSQL (hospedado no [Supabase](https://supabase.com/)), acessado via [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm` + `postgres`)
- **Processamento de imagem:** [sharp](https://sharp.pixelplumbing.com/) para redimensionamento e conversão para WebP
- **Metadados:** [exifr](https://github.com/MikeKovarik/exifr) para extração de EXIF
- **Front-end de teste:** páginas HTML estáticas servidas por `express.static('public')`
- **Containerização:** Docker multi-stage (`build` / `dev` / `final`) + Docker Compose (prod e dev com hot reload)

## O que mudou desde a primeira versão do README

A versão anterior deste README descrevia um projeto que só recebia o arquivo, gravava os metadados no banco e devolvia o arquivo salvo — `sharp` e `exifr` estavam instalados mas fora do fluxo. Desde então:

- **Arquitetura em camadas:** o código saiu do `main.ts` monolítico para `routes → controller → service → repository`, com um container simples de injeção de dependências (`src/container.ts`) e tipos derivados do schema Drizzle (`Photo`, `NewPhoto`).
- **`sharp` integrado ao upload:** cada imagem enviada gera variantes WebP a partir de uma lista de formatos (`generateVariants`), em vez de ser apenas salva como veio.
- **Formatos como configuração:** miniatura e versão web viraram constantes (`src/constants/format.constants.ts`) tipadas por `Format`, então adicionar um novo tamanho é adicionar um objeto à lista passada ao `generateVariants`.
- **`exifr` integrado à leitura:** `GET /photo` e `GET /photo/:id` devolvem os metadados EXIF junto com a imagem em base64.
- **Upload múltiplo:** novo endpoint `POST /photo/multiple`, com variantes e diretórios gerados em paralelo (`generateMultipleVariants`, `generateMultipleDirectoryForImages`) e inserção em lote no banco.
- **Listagem de todas as fotos:** novo `GET /photo`.
- **Camada de organização em disco:** cada imagem passou a ter uma pasta própria dentro de `.uploads/`, contendo o original e suas variantes, em vez de todos os arquivos soltos na mesma pasta.
- **Camada de utilitários:** as funções de I/O e transformação foram extraídas dos controllers para `src/utils/`, reduzindo o tamanho dos controllers.
- **Front-end de teste:** três páginas estáticas (upload, galeria, busca por id) para exercitar a API sem cliente HTTP externo.
- **Docker:** Dockerfile multi-stage e dois compose files (produção com volume nomeado para `.uploads`, desenvolvimento com bind mount e hot reload).

## Estado atual do projeto

O que já funciona:

- Upload de uma foto via `POST /photo` e de várias via `POST /photo/multiple`, com validação de que o arquivo é uma imagem
- Geração automática de variantes WebP com `sharp`:
  - `M` (miniatura): 300×300, qualidade 80
  - `W` (web): 1600×1600, qualidade 100, lossless
- Criação de um diretório por imagem em `.uploads/`, com o arquivo original e as variantes
- Persistência dos metadados básicos do arquivo (nome original, nome salvo, mimetype, tamanho, path) na tabela `photos`
- Listagem de todas as fotos (`GET /photo`) e busca por id (`GET /photo/:id`), ambas retornando a imagem em base64 + metadados EXIF extraídos com `exifr`
- Páginas estáticas para upload (`/index.html`), galeria (`/gallery.html`) e busca por id (`/view.html`)
- Endpoint de health check (`GET /health`)
- Schema de banco gerenciado via Drizzle, sincronizado com um projeto Supabase (schemas `auth`, `storage`, `realtime` inclusos)
- Execução em container, com ambiente de dev com hot reload

O que ainda **não** está implementado (roadmap):

- [ ] Persistir no banco os caminhos das variantes geradas — hoje elas existem em disco, mas a tabela `photos` só guarda o arquivo original
- [ ] Coluna e fluxo de `status` da imagem (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) — o enum `ImageStatus` já existe no schema e o tipo em `src/types/image_status.types.ts`, mas nenhum dos dois é usado na tabela `photos`
- [ ] Associação de fotos a usuários (`userId`) e filtragem por usuário/tipo de imagem
- [ ] Processamento assíncrono via fila (ex.: BullMQ/Redis ou similar) — hoje a conversão acontece dentro do request
- [ ] Tratamento de erro padronizado nas rotas (error handler do Express) e validação de entrada
- [ ] Testes automatizados
- [ ] CI/CD e hospedagem

### Limitações conhecidas

- `generateDirectoryForImages` monta o caminho de destino a partir de `/app`, o caminho do container. Rodando fora do Docker (`npm run dev` direto na máquina), a gravação das variantes não vai cair em `.uploads/` do repositório.
- O nome da pasta de cada imagem vem do nome original do arquivo, então dois uploads com o mesmo nome colidem.

## Estrutura do projeto

```
src/
  main.ts                                    # servidor Express, estáticos e health check
  container.ts                               # instanciação/injeção de repository, service e controller
  routes/
    photo.routes.ts                          # rotas de /photo
  controllers/
    photo.controller.ts                      # orquestra upload, geração de variantes e leitura
  service/
    photo.service.ts                         # regras de negócio
  repository/
    photo.repository.ts                      # acesso ao banco (Drizzle)
  middlewares/
    upload.ts                                # Multer + filtro de mimetype
  constants/
    format.constants.ts                      # formatos de saída (miniatura, web)
  types/
    format.types.ts                          # tipo Format
    photo.types.ts                           # Photo / NewPhoto inferidos do schema
    image_status.types.ts                    # ImageStatus
  utils/
    generateVariants.util.ts                 # sharp: gera as variantes de uma imagem
    generateMultipleVariants.util.ts         # idem, para várias imagens
    generateDirectoryForImages.util.ts       # cria a pasta da imagem e move original + variantes
    generateMultipleDirectoryForImages.util.ts
    readPhoto.util.ts                        # lê arquivo + EXIF de uma foto
    readMultiplePhoto.util.ts                # idem, para várias
  db/
    instance.db.ts                           # conexão com o Postgres (postgres-js + drizzle)
    schema.ts                                # schema Drizzle (tabelas + enums)
    relations.ts                             # relações entre tabelas
public/
  index.html                                 # formulário de upload
  gallery.html                               # galeria com todas as fotos
  view.html                                  # busca de foto por id
drizzle.config.ts                            # configuração do drizzle-kit
dockerfile                                   # build multi-stage (build / dev / final)
docker-compose.yml                           # execução em produção
docker-compose.dev.yml                       # execução em dev com hot reload
.uploads/                                    # arquivos enviados (armazenamento local)
```

## Como rodar localmente

### Pré-requisitos

- Node.js 24+ (ou Docker)
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

### Rodando com Docker

Desenvolvimento (hot reload, com `./src` e `./.uploads` montados):

```bash
docker compose -f docker-compose.dev.yml up --build
```

Produção (uploads em volume nomeado):

```bash
docker compose up --build
```

### Build

```bash
npm run build
npm start
```

## Endpoints atuais

| Método | Rota               | Descrição                                                                   |
|--------|--------------------|-----------------------------------------------------------------------------|
| GET    | `/health`          | Verifica se o servidor está no ar                                            |
| GET    | `/photo`           | Lista todas as fotos (imagens em base64, metadados EXIF e mimetypes)          |
| GET    | `/photo/:id`       | Retorna uma foto por id (base64), com metadados EXIF e mimetype               |
| POST   | `/photo`           | Upload de uma imagem (campo `photo`); gera miniatura e versão web             |
| POST   | `/photo/multiple`  | Upload de várias imagens (campo `photos`); gera as variantes de cada uma      |

## Páginas de teste

| Rota             | Descrição                          |
|------------------|------------------------------------|
| `/index.html`    | Formulário de upload                |
| `/gallery.html`  | Galeria com todas as fotos          |
| `/view.html`     | Busca de uma foto por id            |

## Licença

MIT — veja [LICENSE](LICENSE).
