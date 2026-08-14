## Context

Fatos verificados no `omni.ja` do Zen instalado (não em documentação de terceiros):

- Cada Space tem seu próprio container de abas no DOM:
  `gZenWorkspaces.activeWorkspaceElement.tabsContainer` (`modules/zen/ZenSpaceManager.mjs`).
- O Space de uma aba está no atributo `zen-workspace-id` da `<tab>`.
- Um grupo é um elemento que vive **dentro** do container de um Space. Logo,
  `group.addTabs([tab])` reparenta a aba para o Space daquele grupo.
- O próprio Zen filtra grupos por Space ao listá-los para o usuário
  (`ZenFolders.mjs` descarta `spaceId !== gZenWorkspaces.activeWorkspace`).

Consequência que molda todo o design: **identidade de grupo é `(Space, chave)`**. Um
índice global por chave, como o de ferramentas construídas sobre a API de extensões,
inevitavelmente move abas entre Spaces.

Duas vias de execução foram descartadas por impossibilidade técnica, ambas
verificadas:

- **Extensão (WebExtensions):** `browser.tabs.group()` não expõe Spaces. Uma extensão
  não consegue ler nem escolher o Space de uma aba.
- **Zen Mod:** `zen-components/ZenMods.mjs` carrega exatamente dois arquivos por mod,
  `chrome.css` e `preferences.json`. Não há caminho de código que leia ou execute
  `.js`/`.mjs`. Os mods instalados no perfil confirmam. CSS não escuta `TabOpen` nem
  chama `gBrowser.addTabGroup`.

Resta o script privilegiado de chrome (`.uc.mjs`) carregado por `fx-autoconfig`.

## Goals / Non-Goals

**Goals:**

- Organização automática que nunca cruza a fronteira de um Space.
- Paridade de funcionalidades com a ferramenta de referência, menos IA.
- Convivência pacífica com a organização manual do usuário e com as estruturas
  nativas do Zen.
- Configuração legível e editável sem interface própria.

**Non-Goals:**

- Sugestões de agrupamento por IA (WebLLM).
- Interface gráfica de configuração (popup, sidebar, página de opções).
- Sincronização de configuração entre dispositivos.
- Substituir ou reimplementar as folders nativas do Zen.

## Decisions

### Grupo comum, não folder do Zen

`gZenFolders.createFolder()` chama `gBrowser.pinTab(tab)` em cada aba e insere a
folder no container de pinadas — adotá-la fixaria toda aba organizada. Usamos
`gBrowser.addTabGroup(tabs, { label, color, insertBefore })`, que mantém as abas
desafixadas no strip normal do Space.

Trade-off aceito: grupos comuns não persistem entre reinícios como folders. O sistema
os reconstrói conforme as abas são restauradas.

### Identidade por atributo, não por rótulo

Grupos criados pelo sistema recebem `zstg-key` (a chave) e `zen-workspace-id` (o
Space). A resolução de um grupo existente é:

```js
gBrowser.tabGroups.find(g =>
  !g.isZenFolder &&
  !g.hasAttribute("split-view-group") &&
  g.getAttribute("zen-workspace-id") === spaceId &&
  g.getAttribute("zstg-key") === groupKey
);
```

Isso sustenta dois requisitos de uma vez: o usuário pode renomear um grupo sem
quebrar o pareamento, e a ausência de `zstg-key` marca um grupo como território do
usuário.

### O Space vem da aba

`spaceId` é lido de `tab.getAttribute("zen-workspace-id")`, nunca de
`gZenWorkspaces.activeWorkspace` — uma aba pode ser aberta em background num Space
que não é o ativo.

### Elegibilidade de uma aba

Uma aba só é candidata a qualquer operação de organização se:

- não é fixada, essencial, `zen-empty-tab` nem parte de split view;
- não está em folder nativa do Zen (`group.isZenFolder`);
- não está em grupo comum sem `zstg-key` (organização manual do usuário);
- tem URL com host agrupável e fora da lista de exclusão.

### Derivação da chave

1. Descartar esquemas não-web (`about:`, `chrome:`, `moz-extension:`, `file:`).
2. Remover `www.`.
3. Com agrupamento por subdomínio ligado, usar o host inteiro.
4. Caso contrário, reduzir ao domínio registrável com
   `Services.eTLD.getBaseDomainFromHost()`.
5. Remover o sufixo público (`Services.eTLD.getPublicSuffixFromHost()`) do rótulo:
   `www.youtube.com` → `youtube`, `loja.exemplo.com.br` → `exemplo`.
6. Regra customizada que case com o host tem precedência sobre tudo acima.

Correção de uma suposição inicial: o contexto de chrome **tem** acesso à Public Suffix
List, via `Services.eTLD`. A lista de sufixos compostos embutida que este design
previa foi descartada — ela seria sempre parcial e exigiria manutenção, enquanto o
`Services.eTLD` acompanha a lista que o próprio Firefox mantém. Hosts sem sufixo
conhecido (IP, intranet) caem no host completo.

### Cores

Paleta válida do Firefox: `blue`, `purple`, `cyan`, `orange`, `yellow`, `pink`,
`green`, `gray`, `red`. A cor sai de um hash estável da chave e é persistida, o que
dá estabilidade entre Spaces e entre sessões. Cor definida manualmente pelo usuário
sobrescreve o hash e é persistida do mesmo modo.

### Divergências deliberadas da ferramenta de referência

Duas decisões se afastam do comportamento observado no código do Auto Tab Groups.
Ambas foram tomadas com o comportamento dele à vista, não por desconhecimento.

**Aba ativa sem grupo não colapsa nada.** A referência colapsa todos os grupos
(`TabGroupService.ts:1130`), e ameniza o efeito com um atraso configurável cujo padrão
é zero. Na prática isso desmonta o contexto de trabalho justamente quando o usuário
abre uma aba passageira: o grupo em que ele estava colapsa junto. Aqui o modo de foco
só age quando a aba ativa pertence a um grupo.

**O mínimo de abas vale só na criação.** A referência trata o mínimo como invariante
contínuo: retira do grupo a aba que fica abaixo do limiar
(`TabGroupService.ts:486-488`) e dissolve o grupo inteiro quando ele encolhe
(`TabGroupService.ts:773-779`). Isso faz um grupo desaparecer e espalhar as abas ao
fechar uma única delas. Aqui um grupo criado permanece até esvaziar.

Consequência dessa segunda decisão: como o comando de reagrupar também respeita o
mínimo, um comando separado de "agrupar tudo" seria idêntico a ele. Existe um comando
só.

### Gatilhos

| Evento | Ação |
| --- | --- |
| `TabOpen` | avaliação adiada (em `TabOpen` a aba costuma estar em `about:blank`) |
| `onLocationChange` via `gBrowser.addTabsProgressListener` | reavalia a aba |
| `TabClose` | remove o grupo se ficou vazio e tem `zstg-key` |
| `TabSelect` | aplica o modo de foco, quando habilitado |
| comando manual | opera sobre o Space atual |

Mover abas dispara eventos que reentrariam no organizador; um flag de operação em
andamento faz o sistema ignorar os eventos que ele mesmo provocou.

### Configuração

Preferências em `about:config`, prefixo `zen.stg.`:

| Pref | Tipo | Padrão | Efeito |
| --- | --- | --- | --- |
| `zen.stg.enabled` | bool | `true` | organização automática ligada |
| `zen.stg.groupBySubdomain` | bool | `false` | `mail.google` separado de `drive.google` |
| `zen.stg.minTabs` | int | `1` | mínimo de abas da mesma chave para criar grupo |
| `zen.stg.focusMode` | bool | `false` | colapsa grupos sem a aba ativa |
| `zen.stg.excludedDomains` | string | `""` | lista separada por vírgula |
| `zen.stg.customRules` | string (JSON) | `[]` | `[{"name":"Dev","domains":["github.com"]}]` |
| `zen.stg.colors` | string (JSON) | `{}` | cor persistida por chave |

Observadores de pref aplicam mudanças em tempo real. Valor malformado cai no padrão
sem derrubar o script.

### Lições da verificação em uso real

Quatro defeitos só apareceram com o produto rodando. Ficam registrados porque cada
um representa uma classe de erro, não um caso isolado.

**A restauração de sessão termina depois da inicialização do script.** O
reconhecimento de grupos rodava logo após `delayedStartup`, quando a janela tinha
uma aba e nenhum grupo — encontrava lista vazia e, segundos depois, o agrupamento
criava um grupo duplicado. Correção: reconhecer também no instante anterior a criar
um grupo, que é exatamente quando a falta de marcação causa dano, mais passagens
adiadas. Regra geral: no chrome do Zen, nunca assumir que a janela está completa
quando o script inicia.

**Poda de estado durante inicialização destrói o próprio estado.** O reconhecimento
descartava do mapa os ids ausentes da tela. Rodando antes da restauração, apagava o
mapa inteiro — um mecanismo que se autossabotava a cada abertura do navegador.
Correção: podar apenas a pedido, nunca em caminho automático de inicialização.

**Código que pode lançar no topo de um módulo derruba o arquivo inteiro.** O caminho
do arquivo de log era calculado no topo; uma exceção ali desligou o produto inteiro
sem nenhum sintoma que apontasse para o log. Correção: resolver sob demanda, dentro
de try/catch.

**Diagnóstico que falha em silêncio é pior que não ter diagnóstico.** A escrita do
log usava um modo que exige arquivo preexistente e falhava na primeira tentativa,
com o erro engolido por um `catch` vazio. Custou várias rodadas de investigação.
Correção: o modo correto, e falha de diagnóstico sempre visível no console.

### Estilo próprio para o colapso

`tab-group` comum não tem, na sidebar vertical do Zen, a regra que esconde as abas
quando colapsado — o Zen só estiliza `zen-folder[collapsed]`. O atributo alterna, e
nada acontece visualmente.

As abas ficam dentro de `.tab-group-container`, não como filhas diretas do
`tab-group` (ver a markup de `MozTabbrowserTabGroup`). O projeto fornece uma folha
de estilo com esse recorte, restrita a `[zstg-key]` para não afetar folders do Zen
nem grupos do usuário.

É o custo direto da decisão de usar grupo comum em vez de folder: ganhamos abas
desafixadas, e assumimos o estilo que o Zen só dá às folders dele.

## Risks / Trade-offs

- **Atualização do Zen apaga o loader.** Confirmado na prática já na primeira
  instalação: uma atualização em stage foi aplicada no restart seguinte, substituiu
  `C:\Program Files\Zen Browser` e removeu `config.js` e `defaults/pref/config-prefs.js`
  (`buildID` mudou de `20260809044209` para `20260811103047`). Mitigação: o loader é
  vendorizado em `vendor/fx-autoconfig/` e reinstalado por `scripts/install-loader.ps1`,
  que aceita `-Check` para diagnosticar em um comando. Não há como evitar a remoção —
  só torná-la barata de corrigir. Documentar no README como passo pós-atualização.
- **API interna sem contrato.** `gZenWorkspaces`, `zen-workspace-id` e
  `gBrowser.tabGroups` são internos e podem mudar sem aviso. Mitigação: concentrar os
  acessos em uma camada fina e falhar de forma silenciosa e visível no console em vez
  de quebrar a navegação.
- **Privilégio total.** Um script de chrome roda sem sandbox. O custo de um bug é
  maior que o de uma extensão equivalente.
- **Grupos não persistem.** Escolher grupo comum em vez de folder significa
  reconstruir a organização a cada sessão.
- **Sufixos compostos embutidos.** A lista é parcial por natureza; domínios com
  sufixos incomuns podem gerar chave imprecisa.
