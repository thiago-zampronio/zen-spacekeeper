## Purpose

Manter a configuração do organizador persistente entre sessões, aplicável sem
reiniciar o navegador e resistente a valores malformados.

## ADDED Requirements

### Requirement: Configuração persistente

O sistema SHALL armazenar sua configuração nas preferências do navegador, de modo que
os ajustes sobrevivam ao reinício.

#### Scenario: Ajuste sobrevive ao reinício

- **GIVEN** o usuário desabilitou o agrupamento por subdomínio
- **WHEN** o navegador é reiniciado
- **THEN** o agrupamento por subdomínio continua desabilitado

### Requirement: Aplicação em tempo real

O sistema SHALL aplicar mudanças de configuração sem exigir reinício do navegador.

#### Scenario: Alternar opção com o navegador aberto

- **GIVEN** o navegador está aberto
- **WHEN** o usuário altera a preferência de agrupamento por subdomínio
- **THEN** a próxima aba organizada usa o novo valor

### Requirement: Chave geral de habilitação

O sistema SHALL oferecer uma preferência que desabilita toda a organização
automática, sem desfazer os grupos já existentes.

#### Scenario: Desabilitar organização automática

- **GIVEN** grupos já existem no Space
- **WHEN** o usuário desabilita a organização automática
- **AND** abre uma nova aba
- **THEN** a aba não é agrupada
- **AND** os grupos existentes permanecem como estão

#### Scenario: Comandos manuais seguem disponíveis

- **GIVEN** a organização automática está desabilitada
- **WHEN** o usuário aciona o comando de reagrupar o Space
- **THEN** o comando é executado normalmente

### Requirement: Registro de diagnóstico

O sistema SHALL registrar em arquivo os eventos relevantes de organização, SHALL
permitir desligar esse registro por preferência, e uma falha ao registrar NÃO SHALL
interromper a organização.

Existe porque os momentos mais difíceis de diagnosticar — restauração de sessão e
reconhecimento de grupos — acontecem antes de qualquer console estar aberto.

#### Scenario: Eventos ficam registrados

- **GIVEN** o registro está habilitado
- **WHEN** o sistema inicializa e cria um grupo
- **THEN** o arquivo de registro contém a inicialização e a criação do grupo

#### Scenario: Falha ao registrar não interrompe nada

- **GIVEN** o arquivo de registro não pode ser escrito
- **WHEN** o sistema organiza abas
- **THEN** a organização acontece normalmente
- **AND** a falha do registro é informada no console

#### Scenario: Registro desligado

- **GIVEN** o registro está desabilitado
- **WHEN** o sistema organiza abas
- **THEN** nada é escrito no arquivo

### Requirement: Tolerância a configuração inválida

O sistema SHALL, ao encontrar um valor de configuração malformado, usar o valor
padrão daquela preferência e SHALL continuar operando.

#### Scenario: Regras customizadas malformadas

- **GIVEN** a preferência de regras customizadas contém texto que não é JSON válido
- **WHEN** o sistema carrega a configuração
- **THEN** nenhuma regra customizada é aplicada
- **AND** o agrupamento por domínio continua funcionando

#### Scenario: Mínimo de abas inválido

- **GIVEN** o mínimo de abas está configurado como zero ou negativo
- **WHEN** o sistema carrega a configuração
- **THEN** o valor padrão é usado
