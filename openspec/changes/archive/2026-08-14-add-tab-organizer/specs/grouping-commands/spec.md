## Purpose

Oferecer ao usuário ações manuais que reorganizam, desfazem e colapsam os grupos do
Space em que ele está, sem efeito sobre os demais Spaces.

## ADDED Requirements

### Requirement: Escopo dos comandos

Todo comando de organização SHALL agir exclusivamente sobre o Space atual e SHALL
deixar os demais Spaces inalterados.

#### Scenario: Comando não vaza para outro Space

- **GIVEN** grupos existentes nos Spaces "Pessoal" e "Trabalho"
- **AND** o Space "Trabalho" está ativo
- **WHEN** o usuário aciona qualquer comando de organização
- **THEN** apenas os grupos do Space "Trabalho" são afetados

### Requirement: Reagrupar o Space atual

O sistema SHALL oferecer um comando que reavalia as abas elegíveis do Space atual e
as redistribui nos grupos correspondentes às suas chaves.

#### Scenario: Corrigir organização existente

- **GIVEN** abas soltas e abas em grupos do sistema no Space atual
- **WHEN** o usuário aciona o comando de reagrupar
- **THEN** cada aba elegível fica no grupo correspondente à sua chave

#### Scenario: Grupo criado pelo usuário é respeitado

- **GIVEN** um grupo `Estudos` criado manualmente contendo uma aba de `youtube.com`
- **WHEN** o usuário aciona o comando de reagrupar
- **THEN** o grupo `Estudos` continua existindo com o mesmo nome
- **AND** a aba de `youtube.com` permanece dentro dele

#### Scenario: Mínimo de abas é respeitado

- **GIVEN** o mínimo configurado é 3
- **AND** existe uma única aba de `example.com` solta no Space
- **WHEN** o usuário aciona o comando de reagrupar
- **THEN** a aba permanece solta
- **AND** nenhum grupo `example` é criado

#### Scenario: Comando disponível com organização automática desligada

- **GIVEN** a organização automática está desabilitada
- **WHEN** o usuário aciona o comando de reagrupar
- **THEN** as abas elegíveis do Space são organizadas normalmente

### Requirement: Desagrupar o Space atual

O sistema SHALL oferecer um comando que desfaz os grupos criados por ele no Space
atual, liberando as abas.

#### Scenario: Desfazer organização automática

- **GIVEN** grupos criados pelo sistema no Space atual
- **WHEN** o usuário aciona o comando de desagrupar
- **THEN** as abas desses grupos ficam soltas no Space
- **AND** os grupos criados pelo sistema deixam de existir

#### Scenario: Organização manual sobrevive

- **GIVEN** um grupo `Estudos` criado pelo usuário e uma folder nativa do Zen
- **WHEN** o usuário aciona o comando de desagrupar
- **THEN** o grupo `Estudos` e a folder permanecem intactos

### Requirement: Renomear o grupo da aba ativa

O sistema SHALL oferecer um comando que renomeia o grupo da aba ativa, e o novo
nome NÃO SHALL alterar a chave pela qual o grupo é reconhecido.

#### Scenario: Renomear e continuar agrupando

- **GIVEN** um grupo `youtube` criado pelo sistema
- **WHEN** o usuário renomeia o grupo para `Vídeos` pelo comando
- **AND** abre outra aba de `youtube.com` no mesmo Space
- **THEN** a aba entra no grupo `Vídeos`
- **AND** nenhum grupo novo é criado

#### Scenario: Aba fora de grupo do sistema

- **GIVEN** a aba ativa não pertence a um grupo criado pelo sistema
- **WHEN** o usuário aciona o comando de renomear
- **THEN** nada é renomeado

### Requirement: Colapsar e expandir todos os grupos

O sistema SHALL oferecer comandos que colapsam e que expandem todos os grupos do
Space atual de uma vez.

#### Scenario: Colapsar tudo

- **GIVEN** grupos expandidos no Space atual
- **WHEN** o usuário aciona o comando de colapsar tudo
- **THEN** todos os grupos do Space ficam colapsados

#### Scenario: Expandir tudo

- **GIVEN** grupos colapsados no Space atual
- **WHEN** o usuário aciona o comando de expandir tudo
- **THEN** todos os grupos do Space ficam expandidos
