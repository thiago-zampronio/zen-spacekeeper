## Why

Hoje a cor de um grupo vem de um hash da chave. É estável e previsível, mas
arbitrária: `youtube` ser rosa não ajuda ninguém a achar o grupo do YouTube na
sidebar.

Se a cor vier do logo do site, ela deixa de ser um enfeite e passa a ser
informação — o grupo do YouTube vermelho, o do Spotify verde. O reconhecimento
passa a ser periférico, sem precisar ler o rótulo.

## What Changes

A cor de um grupo passa a ser derivada do favicon do site, aproximada para a cor
nativa mais próxima entre as nove que o Firefox aceita.

A aproximação é por **matiz**, não por distância até valores RGB fixos: as cores
nativas mudam conforme tema claro/escuro, então comparar contra valores fixos
seria frágil. Um vermelho de logo vira `red` porque o matiz dele é vermelho, não
porque bateu com um hexadecimal específico.

A cor continua sendo por chave de grupo e persistida, então permanece estável
entre Spaces e entre sessões, e a escolha manual do usuário continua tendo
precedência sobre qualquer derivação.

Quando não há favicon, a extração falha, ou o logo é acromático, o sistema volta
ao hash atual — o comportamento nunca piora em relação a hoje.

Fora de escopo: pintar o grupo com a cor exata do logo. O grupo nativo aceita
apenas nove cores, e pintar por conta própria significaria competir com a
estilização do Zen e arriscar contraste ruim no modo escuro.

## Capabilities

### New Capabilities

- `favicon-colors`: derivação da cor de um grupo a partir do favicon do site,
  aproximada para a paleta nativa.

### Modified Capabilities

Nenhuma. A regra de precedência da cor manual já existe e não muda.

## Impact

- Estende o script com leitura de favicon e classificação de cor.
- Nova preferência `zen.stg.faviconColors` para desligar a derivação.
- Reaproveita a persistência existente em `zen.stg.colors`; a cor é calculada uma
  vez por chave.
- Nenhuma requisição de rede nova: usa o favicon que o navegador já carregou.
