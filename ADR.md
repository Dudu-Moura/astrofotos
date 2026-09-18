# ADR — Registro de Decisões de Arquitetura

Este documento registra as decisões de arquitetura do **astrofotos** e, principalmente, o *porquê* de cada uma. A ideia não é descrever o que o código faz (isso está no [README](README.md)), mas deixar explícito quais alternativas foram consideradas e por que foram descartadas — para que uma decisão só seja revertida com consciência do trade-off original.

**Última atualização:** 2026-09-17
**Status geral:** projeto em desenvolvimento ativo; todas as decisões abaixo estão aceitas e em vigor no código atual.

---

## 1. Visão geral da arquitetura atual

A aplicação é um serviço HTTP monolítico em Node.js + TypeScript (ESM), organizado em **camadas horizontais**, com um único módulo de domínio (`photo`).

### Fluxo de uma requisição

```
HTTP
 │
 ▼
main.ts ──────────────── Express: JSON, estáticos (public/), /health
 │
 ▼
routes/photo.routes.ts ─ define as rotas e pluga o middleware de upload (Multer)
 │
 ▼
controllers/photo.controller.ts
 │   • traduz Request/Response ↔ objetos de domínio
 │   • orquestra a pipeline de processamento chamando os utils
 │
 ├──► utils/           sharp (variantes), fs (diretórios), exifr (metadados)
 │
 ▼
service/photo.service.ts ─ regras de negócio (ex.: "foto inexistente é erro")
 │
 ▼
repository/photo.repository.ts ─ única camada que conhece Drizzle/SQL
 │
 ▼
db/instance.db.ts ─────── conexão postgres-js + Drizzle
 │
 ▼
PostgreSQL (Supabase)
```

### Módulos de apoio (transversais)

| Pasta | Papel |
|---|---|
| `container.ts` | Composition root: instancia repository → service → controller e exporta a instância pronta |
| `constants/` | Configuração de domínio como dado (formatos de saída das imagens) |
| `types/` | Tipos compartilhados; `Photo`/`NewPhoto` são inferidos do schema Drizzle |
| `middlewares/` | Preocupações de borda do Express (Multer + filtro de mimetype) |
| `utils/` | Funções puras/de I/O sem estado, reutilizáveis e testáveis isoladamente |
| `db/` | Schema, relações e instância de conexão |

### Dois eixos de organização

Vale notar que o projeto usa **dois critérios de divisão ao mesmo tempo**, e isso é intencional:

- **Camadas** (`controller`/`service`/`repository`) para o que é *fluxo de dados stateful* e depende de dependências injetadas;
- **Funções** (`utils`/`constants`) para o que é *transformação sem estado* e não depende de ninguém.

Tudo o que é `(input) => output` sem dependência de banco ou de Express vive em `utils/`, é importado diretamente e não passa pelo container.

---

## 2. ADR-001 — Arquitetura em camadas (Controller → Service → Repository)

**Status:** aceito

### Contexto

A primeira versão do projeto tinha tudo dentro de `main.ts`: rota, leitura do arquivo, query no banco e resposta HTTP no mesmo handler. Isso funciona enquanto existe um endpoint, mas amarra três coisas que mudam por motivos diferentes e em ritmos diferentes: o contrato HTTP, a regra de negócio e o acesso ao banco.

### Decisão

Separar o fluxo em três camadas, cada uma com uma responsabilidade única e uma direção de dependência só (de cima para baixo):

- **Controller** — conhece Express. Lê `req`, monta a resposta, define status code. Não sabe o que é SQL.
- **Service** — não conhece Express nem Drizzle. É onde vive a regra de negócio (ex.: `getPhotoById` lança erro quando a foto não existe, em vez de devolver `undefined`).
- **Repository** — é o único lugar do código que importa `drizzle-orm` e o `schema`. Expõe operações de coleção (`findAll`, `findOne`, `create`, `createMultiple`).

O objetivo central é **isolar o núcleo de negócio tanto do banco de dados quanto do framework**. Consequências práticas disso:

- Trocar o Express por Fastify (ou expor a mesma lógica via CLI/worker de fila) mexe só na camada de controller/routes;
- Trocar Drizzle por outro ORM, ou mover a leitura para uma view materializada, mexe só no repository;
- A regra "foto inexistente é erro" existe em um lugar só e vale para qualquer chamador, não só para o handler HTTP.

### Alternativas consideradas

**Arquitetura hexagonal (Ports & Adapters).** Descartada por **overengineering** para o tamanho e o perfil deste projeto.

O ganho real da hexagonal é poder trocar adaptadores sem tocar no núcleo — e esse ganho só se paga quando a troca é provável, quando existem múltiplos adaptadores para a mesma porta, ou quando o domínio é rico o bastante para justificar ser blindado. Aqui nenhuma das três condições vale:

- Os módulos não mudam com frequência — se é que vão mudar. Postgres e Express são escolhas estáveis para este caso de uso;
- Abstrair cada dependência em uma interface (`PhotoRepositoryPort`, `StoragePort`, `ImageProcessorPort`…) exigiria uma interface + uma implementação + um wiring **por dependência**. Mais arquivos, mais classes, mais indireção — e todo `Ctrl+Click` passaria a cair na interface em vez de no código que realmente executa;
- O resultado seria um código *maior* e *pior de manter* para proteger contra uma troca que provavelmente nunca vai acontecer.

A arquitetura em camadas já entrega a parte do benefício que importa (o isolamento das bordas) sem o custo estrutural. Se um dia surgir uma segunda implementação real de alguma porta — por exemplo, storage em disco **e** em S3 convivendo — aí a interface passa a se pagar, e o refactor é local: basta extrair a interface do repository/util existente.

**Módulos por feature (`src/photo/{controller,service,repository}.ts`).** Não descartada por princípio, e é o caminho natural se o projeto crescer para vários domínios (usuários, álbuns, jobs). Com um único domínio, a divisão por camada é mais legível: a pasta já diz qual é o papel do arquivo.

### Consequências

- ✅ Cada camada é substituível e testável isoladamente (o service aceita qualquer objeto com a forma do repository).
- ✅ O erro de "não encontrado" é decidido no domínio, não no handler.
- ⚠️ Mais arquivos e mais saltos para seguir uma operação de ponta a ponta. Aceitável: o salto é sempre previsível (controller → service → repository).
- ⚠️ **Débito conhecido:** hoje o `PhotoController` orquestra `generateVariants` e `generateDirectoryForImages` diretamente. Isso é "regra de processamento" vazando para a camada HTTP. O lugar natural dessa orquestração é o service (`createPhoto` recebendo o arquivo e cuidando de variantes + diretório + persistência). Será movido em breve
- ⚠️ **Débito conhecido:** o repository engole erros de banco em `try/catch` com `console.error`, devolvendo `undefined`. Isso esconde falha de escrita do service e do cliente. O tratamento de erro padronizado já está no roadmap do README.

---

## 3. ADR-002 — Funções simples extraídas para `utils/`

**Status:** aceito

### Contexto

Geração de variantes com `sharp`, criação de diretórios com `fs`, leitura de EXIF com `exifr`: são operações com bastante código de detalhe (paths, buffers, `Promise.all`) e **nenhuma regra de negócio**. Deixar isso inline no controller faria cada handler crescer dezenas de linhas de manipulação de arquivo, escondendo o que o endpoint realmente faz.

### Decisão

Extrair essas operações para funções isoladas em `src/utils/`, uma por arquivo, nomeadas pelo que fazem (`generateVariants.util.ts`, `generateDirectoryForImages.util.ts`, `readPhoto.util.ts`, `readMultiplePhoto.util.ts`).

O efeito é que o handler vira uma narrativa curta e direta do caso de uso:

```ts
const variants = await generateVariants(photo, [miniatureFormat, webFormat]);
await generateDirectoryForImages(photo, variants);
await this.photoService.createPhoto(photo);
```

Lê-se de cima para baixo: gera variantes, organiza em pasta, persiste. Os detalhes de `sharp` e de `fs` ficam a um clique de distância, mas fora do caminho.

O ganho de manutenção é duplo:

1. **No código principal** — o controller fica compacto e a intenção de cada rota é óbvia;
2. **Na hora do bug** — quando a conversão WebP sai errada, o problema está em *um arquivo de 20 linhas com uma responsabilidade*, não perdido no meio de um handler de 60 linhas. A superfície de investigação e o raio de impacto da correção são pequenos.

### Convenção de "multiple"

As variações em lote (`generateMultipleVariants`, `generateMultipleDirectoryForImages`, `readMultiplePhoto`) são **wrappers finos** sobre a versão unitária, feitos de `Promise.all` + `map`. A lógica real existe em um lugar só; a versão múltipla só adiciona paralelismo. Corrigir a versão unitária corrige as duas.

### Alternativas consideradas

- **Métodos privados do controller/service.** Rejeitado: amarra funções sem estado a uma classe com dependências injetadas, o que dificulta reuso (um worker de fila precisa de `generateVariants`, não de um `PhotoController`) e teste isolado.
- **Uma classe `ImageProcessor` injetada no container.** Seria justificável se essas funções tivessem estado ou dependências configuráveis (um cliente S3, por exemplo). Hoje são funções puras de entrada→saída: uma classe só adicionaria cerimônia.

### Consequências

- ✅ Controllers curtos; cada util é testável em isolamento, sem Express e sem banco.
- ✅ Reutilizáveis por qualquer camada — inclusive por um futuro worker fora do ciclo HTTP.

---

## 4. ADR-003 — Formatos de imagem como constantes tipadas

**Status:** aceito

### Contexto

Cada imagem enviada gera variantes derivadas (miniatura e versão web). Largura, altura e qualidade de cada variante são **configuração**, não lógica — mas se ficarem hardcoded dentro de `generateVariants`, adicionar um formato novo significa editar a função de transformação, que é justamente a parte que não deveria mudar.

### Decisão

Descrever cada formato como um objeto tipado em `src/constants/format.constants.ts`, seguindo o tipo `Format` (`id`, `width`, `height`, `quality`), e fazer `generateVariants` receber **um array de formatos** como parâmetro:

```ts
export const miniatureFormat: Format = { id: 'M', width: 300,  height: 300,  quality: 80 };
export const webFormat: Format       = { id: 'W', width: 1600, height: 1600, quality: 95 };
```

```ts
const variants = await generateVariants(photo, [miniatureFormat, webFormat]);
```

Como a geração de variantes é dirigida pelo array, **adicionar um formato é adicionar um objeto** — nenhuma linha de lógica muda. Criar uma constante nova é escalável e barato: quatro campos e pronto. O tipo `Format` garante que nenhum campo obrigatório seja esquecido, e o compilador avisa se o contrato mudar (um campo `format: 'webp' | 'avif'` novo, por exemplo, quebra em todos os lugares certos de uma vez).

Além disso, os formatos ficam **inspecionáveis como dado**: dá para listá-los, expô-los via API, escolher subconjuntos por tipo de imagem ou por plano de usuário — sem tocar no código de processamento.

### Alternativas consideradas

- **Valores hardcoded em `generateVariants`.** Mistura configuração com transformação; cada formato novo é uma alteração na função crítica.
- **Formatos em variáveis de ambiente / arquivo de config externo.** Ganho pequeno (esses valores não mudam por ambiente) e custo real: perde a checagem de tipo em tempo de compilação e adiciona parsing/validação em runtime.
- **Registro em banco de dados.** Faria sentido se os formatos fossem definidos pelo usuário em runtime. Não é o caso — são decisões de produto, versionadas junto com o código, que é onde devem estar.

### Consequências

- ✅ Adicionar/ajustar formatos é uma mudança de uma linha, isolada e revisável no diff.
- ✅ Tipagem garante consistência entre formatos.
- ⚠️ O `id` do formato (`'M'`, `'W'`) é usado como **sufixo do nome do arquivo em disco**. Mudar um `id` depois que arquivos já foram gerados desalinha o que está gravado. Os `id`s devem ser tratados como estáveis; formato novo ganha `id` novo.
- ⚠️ Hoje o array `[miniatureFormat, webFormat]` é repetido nos dois handlers do controller. Não há uma lista padrão de formatos.

---

## 5. ADR-004 — Injeção de dependência manual via `container.ts`

**Status:** aceito

### Contexto

A cadeia controller → service → repository precisa ser montada em algum lugar. Se cada camada instanciar a seguinte (`new PhotoRepository()` dentro do service), o acoplamento volta: o service passa a depender da classe concreta, e não há como substituí-la em teste ou em outro contexto.

### Decisão

As classes recebem suas dependências pelo construtor e **nunca as instanciam**:

```ts
export class PhotoService {
    constructor(private photoRepository: PhotoRepository){};
}
```

E existe um único ponto de montagem — um *composition root* explícito em `src/container.ts`:

```ts
const photoRepository = new PhotoRepository();
const photoService    = new PhotoService(photoRepository);
export const photoController = new PhotoController(photoService);
```

### Por que isso é útil

- **Um único lugar sabe como o sistema é montado.** O grafo de dependências inteiro cabe em três linhas legíveis. Para entender quem depende de quem, basta abrir um arquivo — não é preciso caçar `new` espalhados pelo código.
- **Inversão de dependência de verdade.** O service depende de *algo com a forma de* `PhotoRepository`. Em teste, passa-se um duplo; em outro contexto (worker, script de migração), passa-se outra implementação. Nenhuma linha do service muda.
- **Ciclo de vida controlado.** Repository, service e controller são instanciados **uma vez** na subida do processo, e não a cada request. As rotas apenas referenciam a instância pronta.
- **Sem estado escondido.** Como nada é criado dentro das classes, não existe dependência implícita: tudo o que a classe usa está declarado no construtor e visível na assinatura.

### Alternativas consideradas

**a) Instanciar direto nas rotas ou dentro de cada classe.**
É o caminho mais curto, e o problema aparece devagar: o `new` se espalha, cada arquivo passa a depender de classes concretas, e o mesmo objeto acaba instanciado em lugares diferentes sem ninguém perceber. Substituir uma implementação vira um "procurar e substituir" pelo projeto inteiro.

**b) Framework de DI (InversifyJS, tsyringe, NestJS).**
Resolveria o mesmo problema, com custo desproporcional para o tamanho atual:

- Traz decorators + `reflect-metadata`, configuração de `tsconfig` e um container mágico que resolve o grafo em runtime;
- Erros de wiring passam a aparecer **em runtime**, quando o container não consegue resolver um token — enquanto no wiring manual o próprio TypeScript reclama em tempo de compilação se um construtor receber o tipo errado;
- Adiciona dependência de runtime e acoplamento ao framework em um projeto que hoje tem **três objetos para montar**;
- No caso do NestJS, seria adotar um framework inteiro (com sua própria estrutura de módulos, pipes e decorators) para ganhar o que dez linhas de `new` já entregam.

O container manual escala bem além do tamanho atual. Se um dia o wiring virar dezenas de linhas com dependências condicionais por ambiente, aí o framework passa a se justificar — e a migração é mecânica, porque as classes já estão escritas no estilo de injeção por construtor.

**c) Módulos singleton exportando instâncias prontas** (`export const photoService = new PhotoService(...)` dentro do próprio arquivo do service).
Funciona, mas espalha a montagem por vários arquivos e acopla cada módulo às suas dependências concretas no momento do import — exatamente o que a injeção por construtor evita. A ordem de import passa a importar, e ciclos ficam fáceis de criar.

### Consequências

- ✅ Grafo de dependências explícito, verificado pelo compilador, em um arquivo só.
- ✅ Testes podem montar a cadeia com dublês sem tocar no código de produção.
- ⚠️ O wiring é manual: dependência nova exige editar `container.ts`. A esse tamanho, isso é uma vantagem (fica visível no diff), não um custo.
- ⚠️ As classes tipam dependências pela **classe concreta** (`private photoRepository: PhotoRepository`), não por interface. É suficiente em TypeScript, porque a tipagem é estrutural — qualquer objeto com os mesmos métodos é aceito, inclusive um mock. Extrair interfaces só se paga quando existir uma segunda implementação real.
- ⚠️ `container.ts` importa o repository, que importa `db/instance.db.ts` — ou seja, **importar o container abre conexão com o banco**. É aceitável em um servidor de longa duração.

---

## 6. ADR-005 — Métodos como arrow functions nas classes

**Status:** aceito

### Contexto

As rotas passam os métodos do controller por referência para o Express:

```ts
router.get('/', photoController.getPhoto);
```

Com métodos de classe tradicionais, isso perde o `this` — o Express chama a função desanexada da instância e `this.photoService` vira `undefined` em runtime.

### Decisão

Declarar os métodos públicos de controller/service/repository como **propriedades de arrow function** (`getPhoto = async (req, res) => {...}`), que capturam o `this` da instância no momento da construção.

### Alternativas consideradas

- **`.bind(this)` no construtor** — resolve, mas é uma linha extra por método, fácil de esquecer ao adicionar um novo.
- **Wrapper na rota** (`(req, res) => photoController.getPhoto(req, res)`) — resolve, mas polui o arquivo de rotas com boilerplate proporcional ao número de endpoints.

### Consequências

- ✅ Métodos podem ser passados como callback com segurança, em qualquer lugar.
- ⚠️ Cada método é uma propriedade **por instância**, não no `prototype`. Irrelevante aqui, já que o container cria uma instância de cada classe para o processo inteiro.

---

## 7. ADR-006 — Tipos derivados do schema Drizzle

**Status:** aceito

### Contexto

Os dados de uma foto atravessam todas as camadas. Definir manualmente um tipo `Photo` em `types/` cria uma segunda fonte de verdade que **silenciosamente diverge** do schema toda vez que uma coluna é adicionada ou alterada.

### Decisão

Inferir os tipos direto do schema:

```ts
export type Photo    = InferSelectModel<typeof photos>
export type NewPhoto = InferInsertModel<typeof photos>
```

O schema Drizzle é a única fonte de verdade sobre a forma de uma foto. Uma coluna nova aparece automaticamente no tipo, e o compilador aponta todos os lugares que precisam ser ajustados.

### Consequências

- ✅ Impossível o tipo divergir da tabela.
- ✅ A distinção leitura (`Photo`, com `id` e timestamps) vs. escrita (`NewPhoto`, sem eles) sai de graça.
- ⚠️ Acopla os tipos de todas as camadas ao Drizzle. É um acoplamento **só de tipo** (apagado na compilação), sem dependência de runtime fora do repository. Se um dia o ORM mudar, define-se `Photo` à mão no mesmo arquivo e nada mais precisa mudar. O trade-off é deliberado: a duplicação custaria mais, todo dia, do que essa troca eventual.

---

