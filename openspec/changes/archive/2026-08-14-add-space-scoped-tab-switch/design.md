## Context

Cadeia verificada no `omni.ja` instalado:

1. `UrlbarInput.mjs:1773` — ao escolher um resultado do tipo `TAB_SWITCH`, chama
   `this.window.switchToTabHavingURI(uri, true, loadOpts, userContextId, splitView)`.
2. `browser.js:3918` — `switchToTabHavingURI` é uma **função global da janela**, um
   invólucro fino sobre `URILoadingHelper.switchToTabHavingURI(window, …)`.
3. `URILoadingHelper.sys.mjs:982` — a busca itera
   `aWindow.gZenWorkspaces.allUsedBrowsers`.
4. `ZenSpaceManager.mjs:3074` — `allUsedBrowsers` percorre `allStoredTabs`, ou seja,
   as abas de **todos** os Spaces.

O ponto 4 é a origem do comportamento. O ponto 2 é o único lugar da cadeia que vive
no escopo da janela e, portanto, o único que um script de chrome pode substituir.

Reproduzido com o organizador desinstalado e `groups: 0` na sessão: o problema é
independente do agrupamento.

### Comportamento nativo que não é defeito nosso

Duas observações feitas durante a verificação, registradas para não virarem
investigação de novo:

- **A aba ativa nunca é destino de troca.** Estando em `youtube.com` e pedindo
  `youtube.com`, o Firefox abre uma aba nova — trocar para onde o usuário já está
  não faria sentido. Estando em outra aba, a troca acontece normalmente.
- **A troca só é oferecida em alguns fluxos.** Com
  `browser.urlbar.secondaryActions.switchToTab` ligada (padrão), o Enter navega e a
  troca vira um botão secundário. Sem essa pref desligada, os cenários de troca
  quase nunca disparam.

Nenhuma das duas depende deste projeto: ambas foram reproduzidas com o filtro
desligado.

## Goals / Non-Goals

**Goals:**

- Nenhuma troca automática de aba muda o Space ativo.
- Comportamento inalterado dentro do Space.
- Preservar integralmente a lógica de correspondência do Firefox (fragmento,
  query string, janela privada, adoção entre janelas, split view).

**Non-Goals:**

- Alterar a ordenação ou a exibição dos resultados da barra de endereços.
- Substituir as prefs nativas `browser.urlbar.suggest.openpage` ou
  `browser.urlbar.secondaryActions.switchToTab`.
- Mudar o comportamento entre janelas diferentes do mesmo Space.

## Decisions

### Estreitar a lista de candidatos, não reimplementar a troca

A tentação é escrever nosso próprio "achar aba e selecionar". Isso significaria
reimplementar comparação de URI com `ignoreFragment`/`ignoreQueryString`, checagem
de janela privada, `adoptIntoActiveWindow` e split view — quatro comportamentos
sutis, cada um uma fonte de bug.

Em vez disso, o envoltório substitui temporariamente `gZenWorkspaces.allUsedBrowsers`
por uma versão filtrada e delega à função original. Toda a lógica do Firefox
permanece intacta; muda apenas o conjunto de candidatos que ela enxerga.

```js
const zw = window.gZenWorkspaces;
const anterior = Object.getOwnPropertyDescriptor(zw, "allUsedBrowsers");
Object.defineProperty(zw, "allUsedBrowsers", {
  value: browsersDoSpaceAtual(),
  configurable: true,
});
try {
  return original.apply(window, args);
} finally {
  if (anterior) {
    Object.defineProperty(zw, "allUsedBrowsers", anterior);
  } else {
    delete zw.allUsedBrowsers;
  }
}
```

`allUsedBrowsers` é um getter no protótipo de `nsZenWorkspaces`, então uma
propriedade própria na instância o sombreia e o `delete` restaura o getter original.
O `finally` garante a restauração mesmo se a função original lançar.

Consequência bem-vinda: o fallback sai de graça e com a semântica certa. Sem
candidato no Space atual, a função original faz exatamente o que já faria se a aba
não existisse — abre no Space atual quando `aOpenNew` é verdadeiro, e devolve
"não trocou" quando não é. O contrato do chamador é preservado sem nenhum código
nosso.

### Essenciais só contam quando não declaram Space

A primeira versão desta spec assumiu que abas essenciais aparecem em todos os Spaces
e portanto seriam sempre destino válido. **A suposição estava errada nesta versão do
Zen.** Um dump das abas do perfil mostrou uma essencial de `youtube.com` com
`zen-workspace-id` do Space "Pessoal" enquanto o Space ativo era outro — e era
exatamente ela que puxava o usuário de volta, o sintoma original que esta change
deveria eliminar.

Regra corrigida: uma essencial é candidata apenas quando não declara Space ou declara
o Space atual. Essenciais realmente compartilhadas (sem id) continuam alcançáveis de
qualquer lugar.

### Falhar para o lado nativo

Se `gZenWorkspaces` ou `allUsedBrowsers` não existirem — por mudança interna do Zen
—, o envoltório registra o erro e delega sem filtrar. O pior caso vira o
comportamento atual do Zen, nunca uma navegação bloqueada.

### Uma pref para desligar

`zen.stg.spaceScopedTabSwitch` (bool, padrão `true`). Desligada, o envoltório
delega sem filtrar.

## Risks / Trade-offs

- **Substituir uma função global da janela** é intrusivo: outro script de chrome que
  faça o mesmo pode conflitar. Mitigação: guardar a referência original e delegar
  sempre, nunca duplicar a lógica.
- **`allUsedBrowsers` é API interna** sem contrato. Se sumir, o envoltório detecta e
  delega — degrada para o comportamento nativo, não quebra.
- **Mudança de comportamento fora da barra de endereços.** Favoritos e histórico
  também deixam de saltar entre Spaces. É intencional e foi decidido explicitamente,
  mas é mais amplo do que o sintoma original.
- **Abas duplicadas entre Spaces.** O mesmo endereço passa a poder existir aberto em
  dois Spaces ao mesmo tempo. É a consequência direta e desejada de tratar o Space
  como fronteira.
