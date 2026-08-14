## Why

Um grupo colapsado e um grupo com poucas abas parecem a mesma coisa na sidebar: uma
linha com um rótulo. O usuário não sabe se há três abas escondidas ali ou se o grupo
está vazio — e portanto não sabe se vale abrir.

O grupo também herda cantos retos, destoando do resto da interface do Zen, que é
arredondada em toda parte.

Nenhuma das duas é funcionalidade nova: são o acabamento que faltou por o projeto
usar grupo comum em vez de folder nativa, e portanto ter que fornecer a própria
apresentação.

## What Changes

Um grupo colapsado passa a exibir quantas abas estão escondidas. O número aparece
apenas quando colapsado, some ao expandir, e conta somente as abas efetivamente
ocultas — a aba ativa, que continua visível, não entra na contagem.

O contêiner do grupo ganha cantos arredondados alinhados ao raio usado pelo restante
da interface do Zen.

Tudo se aplica somente aos grupos criados por este projeto. Folders nativas do Zen e
grupos criados pelo usuário mantêm a aparência que o Zen lhes dá.

## Capabilities

### New Capabilities

- `group-visuals`: acabamento visual dos grupos criados pelo sistema — contagem de
  abas escondidas e forma do contêiner.

### Modified Capabilities

Nenhuma. O comportamento de colapso já está especificado em `group-presentation`;
aqui trata-se apenas do que o usuário vê.

## Impact

- Estende a folha de estilo do projeto.
- O script passa a manter um atributo com a contagem de abas escondidas.
- Nenhuma preferência nova: é acabamento, não comportamento configurável.
