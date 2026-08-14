## Purpose

Decidir a qual grupo cada aba pertence, derivando uma chave a partir da URL e das
regras do usuário, e manter essa atribuição correta ao longo da vida da aba.

## ADDED Requirements

### Requirement: Agrupamento automático de abas

O sistema SHALL, enquanto estiver habilitado, atribuir cada aba elegível a um grupo
do seu Space cuja chave corresponda à derivada da URL da aba, criando o grupo quando
ele ainda não existir.

#### Scenario: Primeira aba de uma chave

- **GIVEN** nenhum grupo `github` existe no Space da aba
- **WHEN** o usuário abre `https://github.com/algum/repo`
- **THEN** um grupo de chave `github` é criado nesse Space
- **AND** a aba é colocada nele

#### Scenario: Aba adicional da mesma chave

- **GIVEN** um grupo `github` já existe no Space da aba
- **WHEN** o usuário abre `https://github.com/outro/repo`
- **THEN** a aba é adicionada ao grupo existente
- **AND** nenhum grupo novo é criado

### Requirement: Derivação da chave por domínio

O sistema SHALL derivar a chave de grupo do domínio registrável da URL, descartando o
prefixo `www` e o sufixo público.

#### Scenario: Prefixo www

- **WHEN** o usuário abre `https://www.github.com/x`
- **THEN** a chave de grupo é `github`

#### Scenario: Caminho e parâmetros ignorados

- **WHEN** o usuário abre `https://github.com/org/repo?tab=issues`
- **THEN** a chave de grupo é `github`

### Requirement: Tratamento de sufixos compostos

O sistema SHALL reconhecer sufixos públicos de segundo nível, de modo que a chave
nunca seja o próprio sufixo.

#### Scenario: Sufixo de segundo nível de país

- **WHEN** o usuário abre `https://loja.exemplo.com.br/produto`
- **THEN** a chave de grupo é `exemplo`
- **AND** a chave não é `com` nem `br`

#### Scenario: Domínios homônimos em sufixos diferentes

- **WHEN** o usuário abre `https://youtube.com` e `https://youtube.com.br`
- **THEN** ambas as abas recebem a chave `youtube`
- **AND** ficam no mesmo grupo do Space

### Requirement: Agrupamento por subdomínio opcional

O sistema SHALL, quando o agrupamento por subdomínio estiver habilitado, usar o host
completo como chave de grupo.

#### Scenario: Subdomínios separados

- **GIVEN** o agrupamento por subdomínio está habilitado
- **WHEN** o usuário abre `https://mail.google.com` e `https://drive.google.com`
- **THEN** as abas ficam em dois grupos distintos

#### Scenario: Subdomínios unidos

- **GIVEN** o agrupamento por subdomínio está desabilitado
- **WHEN** o usuário abre `https://mail.google.com` e `https://drive.google.com`
- **THEN** ambas as abas ficam no mesmo grupo `google`

### Requirement: Regras customizadas

O sistema SHALL permitir regras que associam um conjunto de domínios a um grupo
nomeado pelo usuário, e essas regras SHALL ter precedência sobre a chave derivada do
domínio.

#### Scenario: Domínios distintos sob uma regra

- **GIVEN** uma regra `Dev` cobrindo `github.com` e `stackoverflow.com`
- **WHEN** o usuário abre uma aba de cada domínio no mesmo Space
- **THEN** ambas ficam no mesmo grupo rotulado `Dev`

#### Scenario: Precedência sobre o domínio

- **GIVEN** uma regra `Dev` cobrindo `github.com`
- **WHEN** o usuário abre `https://github.com/x`
- **THEN** a aba vai para o grupo `Dev`
- **AND** nenhum grupo `github` é criado

#### Scenario: Regra vale por Space

- **GIVEN** uma regra `Dev` cobrindo `github.com`
- **WHEN** o usuário abre `github.com` em dois Spaces diferentes
- **THEN** existe um grupo `Dev` em cada Space, independentes entre si

### Requirement: Mínimo de abas para formar grupo

O sistema SHALL criar um grupo apenas quando a quantidade de abas da mesma chave no
mesmo Space alcançar o mínimo configurado, e esse limiar SHALL valer somente na
criação, nunca dissolvendo um grupo que já existe.

#### Scenario: Abaixo do mínimo

- **GIVEN** o mínimo configurado é 2
- **AND** não há aba de `example.com` no Space
- **WHEN** o usuário abre a primeira aba de `example.com`
- **THEN** a aba permanece fora de qualquer grupo

#### Scenario: Mínimo alcançado

- **GIVEN** o mínimo configurado é 2
- **AND** há uma aba desagrupada de `example.com` no Space
- **WHEN** o usuário abre a segunda aba de `example.com` no mesmo Space
- **THEN** um grupo é criado contendo as duas abas

#### Scenario: Grupo encolhe abaixo do mínimo

- **GIVEN** o mínimo configurado é 3
- **AND** um grupo `github` com três abas
- **WHEN** o usuário fecha uma dessas abas
- **THEN** o grupo `github` continua existindo com as duas abas restantes
- **AND** as abas não são liberadas do grupo

### Requirement: URLs não agrupáveis

O sistema SHALL ignorar abas cuja URL não tenha um host agrupável, incluindo páginas
internas do navegador e arquivos locais.

#### Scenario: Página interna

- **WHEN** o usuário abre `about:config`
- **THEN** a aba não é agrupada

#### Scenario: Arquivo local

- **WHEN** o usuário abre `file:///C:/temp/nota.html`
- **THEN** a aba não é agrupada

### Requirement: Lista de exclusão

O sistema SHALL deixar fora da organização automática as abas cujo domínio conste na
lista de exclusão do usuário.

#### Scenario: Domínio excluído

- **GIVEN** `banco.com.br` está na lista de exclusão
- **WHEN** o usuário abre `https://banco.com.br/conta`
- **THEN** a aba não é agrupada

### Requirement: Reavaliação em navegação

O sistema SHALL reavaliar a atribuição de uma aba quando a URL dela mudar para um
domínio de chave diferente.

#### Scenario: Navegação para outro domínio

- **GIVEN** uma aba de `github.com` dentro do grupo `github`
- **WHEN** o usuário navega nessa aba para `https://youtube.com`
- **THEN** a aba passa para o grupo `youtube` do mesmo Space

#### Scenario: Navegação para domínio sem grupo possível

- **GIVEN** o mínimo configurado é 2
- **AND** uma aba de `google.com` dentro do grupo `google`
- **WHEN** o usuário navega nessa aba para `maxmilhas.com`, que não tem outra aba
- **THEN** a aba sai do grupo `google`
- **AND** permanece solta no Space, sem formar grupo

#### Scenario: Navegação dentro do mesmo domínio

- **GIVEN** uma aba de `github.com` dentro do grupo `github`
- **WHEN** o usuário navega para outra página de `github.com`
- **THEN** a aba permanece no mesmo grupo

### Requirement: Reconhecimento dos próprios grupos após reinício

O sistema SHALL reconhecer como seus os grupos que criou quando eles voltarem pela
restauração de sessão, e NÃO SHALL criar um segundo grupo para uma chave que já tem
grupo restaurado no mesmo Space.

#### Scenario: Grupo restaurado é reaproveitado

- **GIVEN** um grupo `youtube` criado pelo sistema no Space "Trabalho"
- **WHEN** o navegador é reiniciado e a sessão é restaurada
- **AND** o usuário abre outra aba de `youtube.com` nesse Space
- **THEN** a aba entra no grupo `youtube` restaurado
- **AND** nenhum segundo grupo `youtube` é criado

#### Scenario: Grupo do usuário com mesmo nome não é adotado

- **GIVEN** um grupo `youtube` criado manualmente pelo usuário
- **AND** nenhum grupo com essa chave foi criado pelo sistema nesse Space
- **WHEN** o usuário abre uma aba de `youtube.com`
- **THEN** o grupo do usuário permanece intocado
- **AND** o sistema cria o seu próprio grupo

### Requirement: Adoção de grupos sem marcação

O sistema SHALL oferecer um comando que adota grupos comuns sem marcação cujas abas
todas produzam a mesma chave, e NÃO SHALL adotar automaticamente — a adoção é
sempre pedida pelo usuário.

Este requisito existe porque qualquer mudança na forma de marcar grupos deixa os
anteriores órfãos: sem marcação eles não são reaproveitados, não recebem o estilo
de colapso e não são alcançados pelos comandos.

#### Scenario: Grupo de versão anterior é adotado

- **GIVEN** um grupo `youtube` sem marcação, com todas as abas de `youtube.com`
- **WHEN** o usuário aciona o comando de adoção
- **THEN** o grupo passa a ser reconhecido como do sistema
- **AND** abas novas de `youtube.com` entram nele em vez de criar outro grupo

#### Scenario: Grupo temático do usuário não é adotado

- **GIVEN** um grupo `Estudos` sem marcação, com abas de domínios diferentes
- **WHEN** o usuário aciona o comando de adoção
- **THEN** o grupo permanece sem marcação
- **AND** continua sendo tratado como organização do usuário

### Requirement: Vínculo de grupo sobrevive à restauração

O sistema SHALL preservar o vínculo entre grupo e chave em armazenamento próprio, e
NÃO SHALL descartar esse vínculo em momentos nos quais os grupos ainda não foram
restaurados.

#### Scenario: Reconhecimento após a restauração terminar

- **GIVEN** grupos do sistema restaurados pela sessão após a inicialização do script
- **WHEN** o usuário abre uma aba cuja chave corresponde a um grupo restaurado
- **THEN** a aba entra no grupo existente
- **AND** nenhum grupo novo é criado para a mesma chave

#### Scenario: Vínculo não é descartado na inicialização

- **GIVEN** um vínculo salvo para grupos que ainda não foram restaurados
- **WHEN** o script inicializa e ainda não há grupos na janela
- **THEN** o vínculo salvo permanece intacto

### Requirement: Remoção de grupos vazios

O sistema SHALL remover os grupos que criou assim que ficarem sem abas.

#### Scenario: Última aba fechada

- **GIVEN** um grupo `github` criado pelo sistema com exatamente uma aba
- **WHEN** o usuário fecha essa aba
- **THEN** o grupo é removido do Space

#### Scenario: Grupo do usuário esvaziado

- **GIVEN** um grupo `Estudos` criado pelo usuário com exatamente uma aba
- **WHEN** o usuário fecha essa aba
- **THEN** o grupo `Estudos` não é removido pelo sistema
