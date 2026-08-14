## Purpose

Dar aos grupos criados pelo sistema o acabamento visual que o Zen só oferece às suas
folders nativas: saber o que está escondido e parecer parte da interface.

## ADDED Requirements

### Requirement: Contagem de abas escondidas

O sistema SHALL exibir, em um grupo colapsado, a quantidade de abas escondidas, e
NÃO SHALL exibir contagem alguma quando o grupo estiver expandido.

#### Scenario: Grupo colapsado com abas escondidas

- **GIVEN** um grupo com três abas, nenhuma ativa
- **WHEN** o usuário colapsa o grupo
- **THEN** o grupo exibe a contagem `3`

#### Scenario: Grupo expandido

- **GIVEN** um grupo colapsado exibindo a contagem
- **WHEN** o usuário expande o grupo
- **THEN** nenhuma contagem é exibida

#### Scenario: Aba ativa não é contada

- **GIVEN** um grupo com três abas, uma delas ativa
- **WHEN** o usuário colapsa o grupo
- **THEN** a aba ativa continua visível
- **AND** o grupo exibe a contagem `2`

### Requirement: Contagem acompanha o conteúdo do grupo

O sistema SHALL atualizar a contagem quando abas entrarem ou saírem de um grupo
colapsado.

#### Scenario: Aba adicionada a grupo colapsado

- **GIVEN** um grupo colapsado exibindo a contagem `3`
- **WHEN** uma nova aba do mesmo domínio é agrupada nele
- **THEN** a contagem passa a `4`

#### Scenario: Aba fechada dentro de grupo colapsado

- **GIVEN** um grupo colapsado exibindo a contagem `3`
- **WHEN** o usuário fecha uma das abas escondidas
- **THEN** a contagem passa a `2`

### Requirement: Forma alinhada à interface do Zen

O sistema SHALL arredondar o contêiner dos grupos que cria, usando o mesmo raio
adotado pelo restante da interface do Zen quando ele estiver disponível.

#### Scenario: Grupo criado pelo sistema

- **WHEN** um grupo é criado pelo sistema
- **THEN** o contêiner dele aparece com cantos arredondados

### Requirement: Grupo colapsado recua em ênfase

O sistema SHALL apresentar um grupo colapsado com menos ênfase visual que um grupo
expandido, e SHALL preservar a legibilidade do rótulo e da contagem.

O que está escondido não deve ganhar destaque: um chip colapsado mais forte que o
expandido inverte o significado do estado.

#### Scenario: Colapsado ao lado de expandido

- **GIVEN** um grupo colapsado e outro expandido na mesma lista
- **WHEN** o usuário olha os dois
- **THEN** o colapsado aparece com menos ênfase que o expandido
- **AND** a cor do grupo continua reconhecível no colapsado

#### Scenario: Rótulo e contagem continuam legíveis

- **GIVEN** um grupo colapsado
- **WHEN** o usuário lê o rótulo e a contagem
- **THEN** ambos permanecem legíveis sobre o fundo da barra lateral

### Requirement: Hierarquia visível entre grupo e abas

O sistema SHALL apresentar as abas de um grupo visualmente subordinadas ao rótulo
dele, de modo que a fronteira entre dois grupos vizinhos seja perceptível sem ler
os rótulos.

#### Scenario: Dois grupos seguidos

- **GIVEN** dois grupos consecutivos na sidebar, cada um com abas
- **WHEN** o usuário olha a lista
- **THEN** há separação visível entre o último item de um grupo e o rótulo do
  seguinte
- **AND** as abas aparecem recuadas em relação ao rótulo do próprio grupo

#### Scenario: Grupo colapsado não ocupa espaço de conteúdo

- **GIVEN** um grupo colapsado
- **WHEN** o usuário olha a lista
- **THEN** o grupo ocupa a altura do rótulo, sem espaço reservado para as abas
  escondidas

### Requirement: Acabamento restrito aos grupos do sistema

O acabamento visual SHALL ser aplicado apenas aos grupos criados por este sistema.

#### Scenario: Folder nativa e grupo do usuário

- **GIVEN** uma folder nativa do Zen e um grupo criado pelo usuário
- **WHEN** o acabamento é aplicado
- **THEN** nenhum dos dois exibe contagem
- **AND** ambos mantêm a aparência que o Zen lhes dá
