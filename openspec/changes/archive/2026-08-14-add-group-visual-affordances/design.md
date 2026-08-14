## Context

O `tab-group` já traz um elemento nativo de contagem
(`.tab-group-overflow-count`), mas o Firefox o usa para overflow do strip
horizontal. Depender dele na sidebar vertical do Zen seria depender de um
comportamento que não existe nesse contexto.

O projeto já mantém uma folha de estilo própria, criada porque o Zen só estiliza
`zen-folder[collapsed]` e deixa `tab-group` comum sem tratamento de colapso.

## Goals / Non-Goals

**Goals:**

- Saber, sem abrir, quanto conteúdo um grupo colapsado esconde.
- Grupo que parece parte da interface do Zen.
- Zero efeito sobre folders nativas e grupos do usuário.

**Non-Goals:**

- Reimplementar a aparência da folder nativa.
- Tornar o acabamento configurável.
- Animações de abrir e fechar.

## Decisions

### Contagem em atributo, exibida por CSS

O script escreve a contagem em `zstg-hidden-count` no elemento do grupo, e o CSS a
exibe com `content: attr(zstg-hidden-count)` num pseudo-elemento do rótulo.

Contar em CSS é impossível, e criar um elemento próprio significaria manter DOM
dentro de um componente do navegador — que o Firefox recria em restauração de sessão
e pode sobrescrever. Atributo é o menor acoplamento possível: se o Zen mudar a
estrutura interna, perde-se a exibição, nunca a organização.

### O que é "escondido"

A contagem é de abas **ocultas**, não de abas do grupo. Como a aba ativa permanece
visível num grupo colapsado, ela é descontada. Um grupo colapsado de três abas com a
ativa dentro mostra `2`, que é o que o usuário deixará de ver.

### Quando atualizar

A contagem é recalculada ao colapsar ou expandir, e quando abas entram ou saem de um
grupo. Fora do estado colapsado o atributo é removido, para que o CSS não precise de
regra de exclusão e o DOM não carregue informação desatualizada.

### Raio com reserva

`var(--zen-button-border-radius, 8px)`: acompanha o Zen quando a variável existe e
cai num valor razoável quando não existe, em vez de perder o arredondamento.

## Risks / Trade-offs

- **Dependência da estrutura interna do `tab-group`.** O seletor alcança
  `.tab-group-label-container`; se o Zen ou o Firefox mudarem essa markup, a
  contagem some. Degrada para o estado atual, sem quebrar organização.
- **Contagem e realidade podem divergir por um instante** entre a mudança de abas e
  a atualização do atributo. É acabamento visual; não há consequência funcional.
- **Mais um ponto onde CSS nosso convive com o tema do Zen.** Restringir tudo a
  `[zstg-key]` mantém o risco confinado aos grupos que criamos.
