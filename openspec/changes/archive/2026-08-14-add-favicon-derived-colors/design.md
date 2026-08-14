## Context

O grupo nativo aceita apenas nove cores (`blue`, `purple`, `cyan`, `orange`,
`yellow`, `pink`, `green`, `gray`, `red`) — não há como atribuir um RGB arbitrário
pela API. Pintar por conta própria seria possível via custom property e CSS nosso,
mas colocaria o projeto competindo com a estilização do Zen e arriscando contraste
ruim no modo escuro. A decisão foi aproximar para a paleta nativa.

O Zen não expõe cor dominante de favicon. O que existe (`ZenGradientGenerator`) é
para o gradiente do workspace, não serve aqui.

## Goals / Non-Goals

**Goals:**

- Cor que ajuda a reconhecer o grupo sem ler o rótulo.
- Estabilidade: mesma chave, mesma cor, sempre.
- Degradar para o comportamento atual sem piorar nada.

**Non-Goals:**

- Cor exata do logo.
- Requisições de rede para buscar logos.
- Recalcular a cor quando o site troca de favicon.

## Decisions

### Classificar por matiz, não por distância a RGBs fixos

A tentação é pegar os valores das nove cores e escolher a de menor distância
euclidiana. O problema: `--tab-group-color-*` resolve para tokens que **mudam com o
tema** (claro/escuro). Uma tabela fixa ficaria correta em um tema e errada no outro.

A classificação usa HSL da cor predominante:

- saturação baixa ou luminosidade extrema → `gray`
- caso contrário, o matiz cai em faixas nomeadas: vermelho, laranja, amarelo,
  verde, ciano, azul, roxo, rosa

É como uma pessoa nomearia a cor, e independe de tema.

### Cor predominante ignorando pixels irrelevantes

Favicons têm muito pixel transparente e muito branco/preto de fundo. A extração
descarta pixels com alpha baixo e pixels quase acromáticos, e escolhe o matiz mais
frequente entre os restantes, ponderado por saturação. Se sobrar pouca coisa, o
resultado é acromático e vira `gray`.

### Cálculo único por chave

A cor é resolvida uma vez e persistida em `zen.stg.colors`, que já existe. Isso
satisfaz a estabilidade exigida e evita reprocessar favicon a cada grupo criado.
A consequência aceita: se um site trocar de logo, a cor só muda se o usuário
limpar a entrada.

### Assíncrono, nunca bloqueante

Ler e decodificar imagem é assíncrono. O grupo nasce imediatamente com a cor por
hash, e a cor derivada é aplicada quando ficar pronta. Isso evita segurar a criação
do grupo por causa de um favicon lento — e cobre o caso comum de a aba ainda não
ter favicon no instante do agrupamento.

### Origem do favicon

Usa o favicon que o navegador já tem para a aba (`gBrowser.getIcon(tab)`), nunca uma
requisição nova. Sem ícone disponível, cai no hash.

## Risks / Trade-offs

- **Canvas e imagens remotas.** A leitura de pixels pode falhar por restrição de
  origem. Qualquer falha cai no hash — o pior caso é o comportamento de hoje.
- **Colisões de cor.** Nove cores para muitos domínios: `github` e `notion`, ambos
  de logo escuro, viram `gray`. É inerente à escolha de manter aparência nativa.
- **Custo por favicon.** Decodificar imagem custa; mitigado por calcular uma vez por
  chave e persistir.
- **Logo trocado.** A cor não acompanha mudança de logo do site, por decisão de
  estabilidade.
