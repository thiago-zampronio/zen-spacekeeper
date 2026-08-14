## Purpose

Impedir que a troca automática para uma aba já aberta mova o usuário para outro
Space, preservando essa conveniência dentro do Space atual.

## ADDED Requirements

### Requirement: Troca restrita ao Space atual

O sistema SHALL considerar apenas as abas do Space atual como destino de uma troca
automática para aba existente.

#### Scenario: Endereço aberto apenas em outro Space

- **GIVEN** uma aba de `youtube.com` aberta no Space "Pessoal"
- **AND** o Space "Trabalho" está ativo
- **WHEN** o usuário digita `youtube.com` na barra de endereços e confirma
- **THEN** o Space ativo continua sendo "Trabalho"
- **AND** o endereço é aberto em uma aba do Space "Trabalho"

#### Scenario: Endereço aberto no Space atual

- **GIVEN** uma aba de `youtube.com` aberta no Space "Trabalho"
- **AND** o Space "Trabalho" está ativo
- **WHEN** o usuário digita `youtube.com` na barra de endereços e confirma
- **THEN** o navegador muda para a aba já aberta
- **AND** nenhuma aba nova é criada

#### Scenario: Endereço aberto nos dois Spaces

- **GIVEN** uma aba de `youtube.com` em "Pessoal" e outra em "Trabalho"
- **AND** o Space "Trabalho" está ativo
- **WHEN** o usuário digita `youtube.com` e confirma
- **THEN** o navegador muda para a aba do Space "Trabalho"

### Requirement: Abas essenciais seguem a fronteira do Space

O sistema SHALL considerar uma aba essencial como destino de troca apenas quando ela
não declarar Space ou declarar o Space atual. Uma aba essencial que pertence a outro
Space NÃO SHALL ser destino, pelo mesmo motivo que vale para qualquer outra aba.

#### Scenario: Essencial compartilhada entre Spaces

- **GIVEN** uma aba essencial de `youtube.com` sem Space declarado
- **WHEN** o usuário digita `youtube.com` e confirma, em qualquer Space
- **THEN** o navegador muda para a aba essencial
- **AND** o Space ativo não muda

#### Scenario: Essencial pertencente a outro Space

- **GIVEN** uma aba essencial de `youtube.com` declarada no Space "Pessoal"
- **AND** o Space "Trabalho" está ativo
- **WHEN** o usuário digita `youtube.com` e confirma
- **THEN** o Space ativo continua sendo "Trabalho"
- **AND** o endereço é aberto no Space "Trabalho"

### Requirement: Contrato do chamador preservado

O sistema SHALL preservar o contrato de `switchToTabHavingURI`: quando não houver
aba correspondente no Space atual e o chamador não autorizar a abertura de uma
nova aba, a chamada SHALL informar que nenhuma troca ocorreu, em vez de abrir
alguma coisa por conta própria.

#### Scenario: Chamador que trata o caso sozinho

- **GIVEN** um chamador que pede a troca sem autorizar abertura de aba nova
- **AND** o endereço só existe em outro Space
- **WHEN** a troca é solicitada
- **THEN** a resposta indica que nenhuma troca ocorreu
- **AND** nenhuma aba é aberta pelo sistema

### Requirement: Abrangência a todos os pontos de entrada

O sistema SHALL aplicar a restrição a todos os pontos de entrada que usam a troca
automática para aba existente, não apenas à barra de endereços.

#### Scenario: Favorito de endereço aberto em outro Space

- **GIVEN** um favorito de `youtube.com`
- **AND** esse endereço está aberto apenas no Space "Pessoal"
- **AND** o Space "Trabalho" está ativo
- **WHEN** o usuário abre o favorito
- **THEN** o Space ativo continua sendo "Trabalho"

### Requirement: Comportamento desligável

O sistema SHALL permitir desligar a restrição por preferência, restaurando o
comportamento nativo do Zen sem exigir reinício.

#### Scenario: Restrição desligada

- **GIVEN** a preferência de restrição está desligada
- **AND** `youtube.com` está aberto apenas em outro Space
- **WHEN** o usuário digita `youtube.com` e confirma
- **THEN** o navegador se comporta como o Zen nativo e muda de Space

### Requirement: Falha não impede a navegação

O sistema SHALL, se a restrição não puder ser aplicada por qualquer motivo,
delegar ao comportamento nativo em vez de impedir a navegação.

#### Scenario: API interna indisponível

- **GIVEN** a API interna de Spaces do Zen mudou e não pode ser consultada
- **WHEN** o usuário confirma um endereço na barra de endereços
- **THEN** a navegação acontece normalmente pelo caminho nativo
- **AND** o erro é registrado no console
