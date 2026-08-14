## Purpose

Definir como um grupo se apresenta ao usuário — rótulo, cor e estado de colapso — e
garantir que essa aparência permaneça estável entre Spaces e entre sessões.

## ADDED Requirements

### Requirement: Rótulo derivado da chave

O sistema SHALL rotular os grupos que cria com a chave de grupo correspondente.

#### Scenario: Grupo por domínio

- **WHEN** um grupo é criado para `https://www.youtube.com/watch`
- **THEN** o rótulo exibido é `youtube`

#### Scenario: Grupo por regra customizada

- **GIVEN** uma regra `Dev` cobrindo `github.com`
- **WHEN** um grupo é criado para `https://github.com/x`
- **THEN** o rótulo exibido é `Dev`

### Requirement: Identidade independente do rótulo

O sistema SHALL identificar seus grupos por marcação própria, e não pelo texto do
rótulo, de modo que renomear um grupo não quebre a associação com a chave.

#### Scenario: Usuário renomeia um grupo

- **GIVEN** um grupo criado pelo sistema com chave `youtube`
- **WHEN** o usuário renomeia o grupo para `Vídeos`
- **AND** abre outra aba de `youtube.com` no mesmo Space
- **THEN** a aba é adicionada ao grupo renomeado
- **AND** nenhum grupo `youtube` novo é criado

### Requirement: Cor estável por chave

O sistema SHALL atribuir a cor de um grupo de forma determinística a partir da chave
e SHALL persistir essa associação.

#### Scenario: Mesma cor em Spaces diferentes

- **GIVEN** um grupo `youtube` de cor vermelha no Space "Pessoal"
- **WHEN** um grupo `youtube` é criado no Space "Trabalho"
- **THEN** esse grupo também é vermelho

#### Scenario: Cor mantida entre sessões

- **GIVEN** um grupo `youtube` de cor vermelha
- **WHEN** o usuário reinicia o navegador
- **THEN** o grupo `youtube` recriado continua vermelho

### Requirement: Cor escolhida pelo usuário

O sistema SHALL respeitar a cor que o usuário definir manualmente para um grupo,
preservando-a nas recriações seguintes daquela chave.

#### Scenario: Cor manual preservada

- **GIVEN** o usuário mudou a cor do grupo `youtube` para azul
- **WHEN** o grupo `youtube` é recriado em qualquer Space
- **THEN** ele é azul

### Requirement: Colapso esconde as abas do grupo

O sistema SHALL garantir que colapsar um grupo esconda visualmente as abas dele na
sidebar, mantendo visível apenas a aba ativa quando ela pertencer ao grupo.

#### Scenario: Grupo colapsado esconde as abas

- **GIVEN** um grupo com três abas, nenhuma delas ativa
- **WHEN** o usuário colapsa o grupo
- **THEN** nenhuma das três abas aparece na sidebar
- **AND** o rótulo do grupo continua visível

#### Scenario: Aba ativa continua visível

- **GIVEN** um grupo com três abas, uma delas ativa
- **WHEN** o usuário colapsa o grupo
- **THEN** a aba ativa continua visível
- **AND** as outras duas ficam escondidas

#### Scenario: Grupos de terceiros não são afetados

- **GIVEN** uma folder nativa do Zen e um grupo criado pelo usuário
- **WHEN** o estilo do sistema é aplicado
- **THEN** a aparência e o colapso desses elementos permanecem os do Zen

### Requirement: Estado de colapso preservado

O sistema SHALL preservar o estado de colapso de cada grupo, não expandindo nem
colapsando um grupo por conta própria ao adicionar ou remover abas.

#### Scenario: Aba ativa entra em grupo colapsado com foco ligado

- **GIVEN** o modo de foco está habilitado
- **AND** um grupo colapsado
- **WHEN** uma aba nova entra nesse grupo e recebe o foco
- **THEN** o grupo é expandido pelo modo de foco

Esta é a exceção deliberada à preservação do colapso: o modo de foco mantém
aberto o grupo da aba ativa, e uma aba recém-aberta é a aba ativa. Sem o modo de
foco, o grupo permanece colapsado.

#### Scenario: Aba adicionada a grupo colapsado

- **GIVEN** um grupo `youtube` colapsado
- **WHEN** uma nova aba de `youtube.com` é adicionada a ele
- **THEN** o grupo continua colapsado

### Requirement: Colapso automático dos grupos menos usados

O sistema SHALL, quando o modo de foco estiver habilitado, manter expandidos os N
grupos usados mais recentemente no Space — sendo N configurável — e colapsar os
demais.

Manter apenas o grupo ativo aberto faz a barra lateral piscar a cada troca de aba:
um grupo fecha e outro abre a cada clique. Preservar os últimos N reduz esse
movimento sem perder o efeito de foco.

#### Scenario: Alternância entre dois grupos com N igual a 3

- **GIVEN** o modo de foco mantém 3 grupos abertos
- **AND** o usuário usou os grupos `github`, `youtube` e `figma` recentemente
- **WHEN** o usuário alterna entre abas de `github` e `youtube`
- **THEN** os três grupos permanecem expandidos
- **AND** nenhum grupo abre ou fecha durante a alternância

#### Scenario: Grupo cai fora dos mais recentes

- **GIVEN** o modo de foco mantém 2 grupos abertos
- **AND** os grupos `github` e `youtube` são os mais recentes
- **WHEN** o usuário seleciona uma aba do grupo `figma`
- **THEN** `figma` e `github` ficam expandidos
- **AND** `youtube`, agora o terceiro mais recente, é colapsado

#### Scenario: Grupo da aba ativa estava colapsado

- **GIVEN** o modo de foco está habilitado
- **AND** o grupo `github` está colapsado
- **WHEN** o usuário seleciona uma aba desse grupo
- **THEN** o grupo `github` é expandido

#### Scenario: Modo de foco desabilitado

- **GIVEN** o modo de foco está desabilitado
- **WHEN** o usuário troca de aba entre grupos
- **THEN** nenhum grupo é colapsado automaticamente

### Requirement: Aba ativa sem grupo não dispara colapso

O sistema SHALL, quando a aba ativa não pertencer a nenhum grupo, deixar o estado de
colapso de todos os grupos do Space como estava, mesmo com o modo de foco habilitado.

#### Scenario: Abertura de aba passageira

- **GIVEN** o modo de foco está habilitado
- **AND** o grupo `github` está expandido e o grupo `youtube` está colapsado
- **WHEN** o usuário abre uma aba nova, que não pertence a nenhum grupo
- **THEN** o grupo `github` continua expandido
- **AND** o grupo `youtube` continua colapsado
