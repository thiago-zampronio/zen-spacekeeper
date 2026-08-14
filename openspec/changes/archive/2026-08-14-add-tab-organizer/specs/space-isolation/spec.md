## Purpose

Garantir que a organização automática de abas jamais cruze a fronteira de um Space do
Zen nem altere estruturas que o navegador ou o usuário mantêm por conta própria.

## ADDED Requirements

### Requirement: Preservação do Space da aba

O sistema SHALL preservar o Space de cada aba, nunca movendo uma aba de um Space para
outro como efeito de qualquer operação de organização.

#### Scenario: Domínio já agrupado em outro Space

- **GIVEN** um grupo `youtube` existente no Space "Pessoal"
- **AND** o Space "Trabalho" está ativo
- **WHEN** o usuário abre `https://youtube.com/watch?v=abc`
- **THEN** a aba permanece no Space "Trabalho"
- **AND** o grupo `youtube` do Space "Pessoal" permanece com as mesmas abas

#### Scenario: Reorganização em massa

- **GIVEN** abas em vários Spaces
- **WHEN** qualquer operação de organização é executada
- **THEN** nenhuma aba muda de Space

### Requirement: Escopo de grupo por Space

O sistema SHALL tratar grupos de Spaces diferentes como entidades independentes,
ainda que compartilhem a mesma chave, e alterações em um grupo NÃO SHALL afetar o
grupo de mesma chave em outro Space.

#### Scenario: Mesma chave em dois Spaces

- **GIVEN** abas de `youtube.com` abertas no Space "Pessoal" e no Space "Trabalho"
- **WHEN** a organização automática é executada
- **THEN** existe um grupo `youtube` em cada Space
- **AND** cada grupo contém apenas as abas do seu próprio Space

#### Scenario: Alteração isolada

- **GIVEN** grupos `youtube` em dois Spaces
- **WHEN** o usuário fecha todas as abas do grupo no Space "Trabalho"
- **THEN** o grupo `youtube` do Space "Pessoal" segue inalterado

### Requirement: Space determinado pela aba

O sistema SHALL determinar o Space de destino a partir da própria aba, e não a partir
do Space ativo na janela.

#### Scenario: Aba aberta em background em Space não ativo

- **GIVEN** o Space "Pessoal" está ativo
- **WHEN** uma aba pertencente ao Space "Trabalho" é aberta em background
- **THEN** a aba é organizada entre os grupos do Space "Trabalho"
- **AND** nenhum grupo do Space "Pessoal" é criado ou alterado

### Requirement: Preservação de estruturas nativas do Zen

O sistema SHALL deixar intactas as abas essenciais, as abas fixadas, as folders
nativas do Zen e os grupos de split view, não as incluindo em nenhuma operação de
organização.

#### Scenario: Aba essencial

- **GIVEN** uma aba essencial de `youtube.com`
- **WHEN** a organização automática é executada
- **THEN** a aba permanece na área de essenciais
- **AND** não é adicionada a nenhum grupo

#### Scenario: Folder nativa do Zen

- **GIVEN** uma folder do Zen contendo abas de `github.com`
- **WHEN** o usuário abre outra aba de `github.com`
- **THEN** a folder do Zen não é modificada
- **AND** a aba nova é organizada fora dela

#### Scenario: Split view

- **GIVEN** duas abas em split view
- **WHEN** a organização automática é executada
- **THEN** o agrupamento de split view permanece intacto

### Requirement: Preservação da organização manual do usuário

O sistema SHALL considerar intocáveis os grupos que ele próprio não criou, não
removendo esses grupos nem realocando as abas contidas neles.

#### Scenario: Aba dentro de grupo criado pelo usuário

- **GIVEN** um grupo `Estudos` criado manualmente pelo usuário
- **AND** esse grupo contém uma aba de `youtube.com`
- **WHEN** a organização automática é executada
- **THEN** a aba permanece em `Estudos`
- **AND** não é movida para o grupo `youtube`
