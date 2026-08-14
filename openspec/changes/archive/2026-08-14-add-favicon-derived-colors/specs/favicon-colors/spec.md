## Purpose

Derivar a cor de um grupo do logo do site que ele representa, para que a cor
carregue informação em vez de ser arbitrária.

## ADDED Requirements

### Requirement: Cor derivada do favicon

O sistema SHALL, quando a derivação estiver habilitada, escolher a cor de um grupo
a partir da cor predominante do favicon do site, aproximada para a cor nativa mais
próxima entre as aceitas pelo navegador.

#### Scenario: Site com logo de cor marcante

- **GIVEN** a derivação por favicon está habilitada
- **WHEN** um grupo é criado para `youtube.com`, cujo favicon é predominantemente vermelho
- **THEN** o grupo recebe a cor nativa `red`

#### Scenario: Aproximação por matiz

- **GIVEN** um favicon cuja cor predominante é um laranja escuro
- **WHEN** a cor do grupo é derivada
- **THEN** o grupo recebe `orange`
- **AND** a escolha não depende do tema claro ou escuro em uso

### Requirement: Estabilidade da cor derivada

O sistema SHALL calcular a cor de uma chave uma única vez e persisti-la, mantendo-a
igual entre Spaces e entre sessões.

#### Scenario: Mesma cor em outro Space

- **GIVEN** um grupo `youtube` com cor derivada `red`
- **WHEN** um grupo da mesma chave é criado em outro Space
- **THEN** ele também é `red`

#### Scenario: Cor mantida após reinício

- **GIVEN** um grupo com cor derivada
- **WHEN** o navegador é reiniciado
- **THEN** a cor não é recalculada e permanece a mesma

### Requirement: Precedência da escolha manual

O sistema SHALL respeitar a cor definida manualmente pelo usuário, sem
sobrescrevê-la com a cor derivada do favicon.

#### Scenario: Usuário troca a cor de um grupo derivado

- **GIVEN** um grupo `youtube` com cor derivada `red`
- **WHEN** o usuário muda a cor do grupo para azul
- **AND** o grupo é recriado depois
- **THEN** ele é azul

### Requirement: Retorno ao comportamento anterior

O sistema SHALL usar a cor por hash da chave sempre que a derivação não for
possível, e a ausência de favicon NÃO SHALL impedir a criação do grupo.

#### Scenario: Site sem favicon

- **GIVEN** um site que não fornece favicon
- **WHEN** um grupo é criado para ele
- **THEN** o grupo recebe a cor por hash da chave

#### Scenario: Falha ao ler o favicon

- **GIVEN** um favicon que não pode ser lido
- **WHEN** a cor é derivada
- **THEN** o grupo recebe a cor por hash da chave
- **AND** o grupo é criado normalmente

#### Scenario: Logo acromático

- **GIVEN** um favicon predominantemente preto, branco ou cinza
- **WHEN** a cor é derivada
- **THEN** o grupo recebe `gray`

### Requirement: Derivação desligável

O sistema SHALL permitir desligar a derivação por preferência, voltando à cor por
hash para as chaves calculadas dali em diante.

#### Scenario: Derivação desligada

- **GIVEN** a derivação por favicon está desligada
- **WHEN** um grupo é criado para um site com favicon colorido
- **THEN** o grupo recebe a cor por hash da chave

### Requirement: Derivação não bloqueia o agrupamento

A leitura do favicon SHALL acontecer sem impedir ou atrasar a criação do grupo.

#### Scenario: Favicon ainda não carregado

- **GIVEN** uma aba cujo favicon ainda não chegou
- **WHEN** o grupo é criado
- **THEN** o grupo é criado imediatamente com a cor por hash
- **AND** a cor derivada é aplicada assim que o favicon estiver disponível
