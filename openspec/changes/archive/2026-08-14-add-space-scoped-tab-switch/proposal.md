## Why

O Zen tira o usuário do Space atual sozinho. Ao digitar um endereço já aberto em
outra aba, a barra de endereços oferece "Mudar para a aba"; se essa aba mora em
outro Space, o Zen troca de Space para mostrá-la. O sintoma é desconcertante:
nenhuma aba nova aparece e o navegador "pula" para outro contexto, como se um
clique tivesse acontecido sozinho.

Isso não é um defeito do agrupamento — foi reproduzido com o organizador
desinstalado e sem nenhum grupo existente. A causa está em
`URILoadingHelper.switchToTabHavingURI`, que o Zen alterou para varrer
`gZenWorkspaces.allUsedBrowsers`, ou seja, as abas de **todos** os Spaces
(`ZenSpaceManager.mjs:3074`).

Além do incômodo, isso corrói a confiança no organizador de abas: quando o
navegador salta de Space sozinho, é impossível dizer se a culpa é do agrupamento
ou do navegador. Enquanto esse comportamento existir, nenhum teste de isolamento
por Space é confiável.

## What Changes

A troca automática para uma aba existente passa a considerar apenas as abas do
Space atual. O comportamento continua idêntico dentro do Space — digitar um
endereço já aberto ali continua pulando para aquela aba.

Quando a única aba correspondente está em outro Space, o Zen deixa de saltar e
abre o endereço no Space atual, como faria se a aba não existisse.

Abas essenciais são exceção: elas aparecem em todos os Spaces por definição, então
saltar para uma delas não tira o usuário de lugar nenhum e continua permitido.

A regra vale para todos os pontos de entrada que usam esse mecanismo — barra de
endereços, favoritos, histórico —, não só para a barra de endereços. O invariante
que o produto passa a sustentar é: **nada tira o usuário do Space atual sem que
ele mande**.

## Capabilities

### New Capabilities

- `space-scoped-tab-switch`: restringe ao Space atual a troca automática para uma
  aba já aberta, preservando o comportamento dentro do Space.

### Modified Capabilities

Nenhuma. As capabilities de agrupamento não mudam de comportamento.

## Impact

- Estende o script `zen-space-tab-groups.uc.mjs` com um envoltório sobre
  `window.switchToTabHavingURI`.
- Nova preferência `zen.stg.spaceScopedTabSwitch` para desligar o comportamento.
- Depende de `gZenWorkspaces.allUsedBrowsers`, API interna do Zen.
- Não requer alterar `browser.urlbar.suggest.openpage` nem
  `browser.urlbar.secondaryActions.switchToTab`: a sugestão nativa continua
  funcionando, apenas deixa de atravessar Spaces.
