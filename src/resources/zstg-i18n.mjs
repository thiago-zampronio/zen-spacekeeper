/**
 * Catálogo de textos do Spacekeeper.
 *
 * Fonte única: o script de chrome e a página do painel importam este mesmo
 * arquivo por `chrome://userchrome/content/zstg-i18n.mjs`. Texto visível não é
 * escrito em nenhum outro lugar.
 *
 * O inglês é o idioma base, não uma tradução do português: é o único
 * obrigatoriamente completo, e é para ele que se cai quando falta uma chave.
 *
 * "Spacekeeper" e "Space" nunca são traduzidos — o primeiro é a marca, o segundo
 * é o termo que o próprio Zen mantém em inglês em todos os idiomas.
 */

export const LANGUAGES = ["en", "pt-BR", "es"];
export const BASE_LANGUAGE = "en";

/**
 * Each language written in itself, never translated: someone who cannot read the
 * current interface still has to recognize their own language in the list.
 */
export const LANGUAGE_NAMES = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
};

const en = {
  "app.subtitle": "Tab groups, one per site, inside the Space you are in.",

  "sec.grouping": "Grouping",
  "sec.subdomains": "Subdomains",
  "sec.labels": "Names for those groups",
  "sec.rules": "Rules",
  "sec.exclusions": "Exclusions",
  "sec.appearance": "Appearance",
  "sec.actions": "Actions for this Space",
  "sec.diagnostics": "Diagnostics",

  "grouping.title": "Group tabs automatically",
  "grouping.short": "Each tab joins the group of the site it is showing.",
  "grouping.help":
    "As soon as a page loads, its tab joins that site's group — and never leaves the Space you are in. When a tab navigates to another site, it moves to the matching group. Turn this off and nothing is grouped on its own, but the buttons under Actions still work, and existing groups stay untouched. What you change here applies to tabs from now on; to apply it to what is already open, use Regroup.",

  "minimum.title": "Minimum tabs",
  "minimum.short": "How many tabs of the same site before a group is created.",
  "minimum.help":
    "With 1 (the default), every site becomes a group the moment it opens: instant tidiness, at the cost of one-tab groups. With 2, the first tab stays loose and the group appears when the second one shows up. The minimum only applies when creating: if a group already exists and you close tabs, it stays — nothing dissolves on its own.",

  "noJump.title": "Never jump to another Space",
  "noJump.short": "Opening an address already open elsewhere won't move you.",
  "noJump.help":
    "When you type an address that is already open, Zen looks for that tab across every Space and takes you there, even if it belongs to another context. The effect is confusing: no new tab appears and the browser seems to jump on its own. Turned on (the default), that search is limited to the current Space and nothing moves you without asking. In exchange, if the page is open in another Space, Zen no longer jumps there — it opens a new tab here.",

  "subGlobal.title": "Split every subdomain",
  "subGlobal.short": "mail.google.com and drive.google.com become two groups, everywhere.",
  "subGlobal.help":
    "Normally mail.google.com and drive.google.com land in the same group, called google. Turn this on and every subdomain becomes its own group — across all sites, including the ones where the subdomain means nothing. It usually fragments too much; in most cases the list below does a better job.",

  "subList.title": "Sites where each service is its own group",
  "subList.short": "e.g. google.com splits Gmail, Drive and Calendar; the rest of the web is unchanged.",
  "subList.help":
    "List the sites where whatever comes before the name is really a different service. On google.com, Gmail, Drive and Calendar become separate groups — shown in the sidebar as mail.google, drive.google and calendar.google — while the rest of the web stays grouped by site. Writing google.com already covers everything under it: you don't need to list them one by one.",
  "subList.example": "google.com, atlassian.net",

  "label.help":
    "This changes only the name shown, never the grouping — switching styles never moves a tab. \"Subdomain and site\" always makes it clear which site a group belongs to. \"Subdomain only\" is shorter to read, with a catch: if you list google.com and yahoo.com, both will show a group called mail. They are two different groups with the same name, and nothing in the sidebar tells them apart.",
  "label.host": "Subdomain and site",
  "label.host.ex": "mail.google · drive.google",
  "label.sub": "Subdomain only",
  "label.sub.ex": "mail · drive · docs",

  "rules.help":
    "A rule keeps different sites together in one group: a rule called Work with slack.com and notion.so puts both in the Work group. Rules beat grouping by site and subdomain splitting; only exclusions beat a rule. The rule's name is the group's name — renaming it creates a new group on the next tab and leaves the old one behind.",
  "rules.name": "Group name",
  "rules.sites": "Sites, separated by commas",
  "rules.new": "New rule",
  "rules.remove": "Remove",
  "rules.warning":
    "We couldn't read your saved rules — no rule is active right now. Nothing was deleted: creating a rule here replaces the stored text, and the panel asks first. The original is in about:config, under zen.stg.customRules.",
  "rules.confirm":
    "Your saved rules couldn't be read and the original text is still stored. Creating a rule now replaces it. Continue?",

  "exclusions.title": "Sites that are never grouped",
  "exclusions.short": "Tabs from these sites stay loose, outside any group.",
  "exclusions.help":
    "Sites listed here are left out of automatic grouping: new tabs from them start loose. Tabs already in a group leave it as soon as the page reloads. Writing banco.com.br also covers app.banco.com.br and anything ending in it. Useful for banking, intranets, or anything you'd rather keep apart.",
  "exclusions.example": "bank.com, gov.br",

  "color.title": "Color from the site's logo",
  "color.short": "YouTube turns red, Spotify green.",
  "color.help":
    "The group's color comes from the site's logo. Since the browser only accepts nine colors, the closest one wins: dark logos turn gray, and colorful logos settle on one of their colors. With this on, changing a group's color by hand pins your choice for that site. With it off, each site gets a fixed color derived from its own name — always the same, unrelated to the brand.",

  "focus.title": "Focus mode",
  "focus.short": "Collapses the groups you are not using. No tab is closed.",
  "focus.help":
    "With many groups the sidebar turns into scrolling. Focus mode collapses the groups you are not using and keeps the most recent ones open in this Space. No tab is closed: tabs in collapsed groups stay open, they just leave the list until you click the group again. Opening a loose tab, one that belongs to no group, collapses nothing.",

  "focusCount.title": "Groups kept open",
  "focusCount.short": "How many stay open — only applies with focus mode on.",
  "focusCount.help":
    "With 1, only the current tab's group stays open, and the sidebar shifts every time you switch tabs. With 3 (the default), moving between the groups you've been using changes nothing: only what fell behind leaves the screen. With focus mode off this number does nothing, which is why the field is dimmed until you turn it on.",

  "actions.help":
    "These buttons act only on the Space you are in — the others are never touched. Regroup applies the current settings to this Space's tabs. Collapse and Expand only fold or unfold groups. Ungroup undoes the groups created automatically here: tabs stay open, but the names you gave those groups are lost and don't come back with Regroup. Groups you built by hand and Zen folders are left intact. Recover old groups makes groups created by earlier versions recognizable again — use it once after updating.",
  "cmd.regroup": "Regroup this Space",
  "cmd.ungroup": "Ungroup this Space",
  "cmd.collapse": "Collapse all groups",
  "cmd.expand": "Expand all groups",
  "cmd.recover": "Recover old groups",
  "cmd.confirmUngroup":
    "This undoes the groups created automatically in this Space. Tabs stay open, but the names you gave those groups are lost. Continue?",
  "cmd.regrouped": "Done: {n} tabs reorganized in this Space.",
  "cmd.nothingToDo": "Nothing to do: everything was already organized.",
  "cmd.ungrouped": "{n} tabs left their groups. They are still open.",
  "cmd.noGroups": "There were no automatic groups in this Space.",
  "cmd.recovered": "{n} old group(s) recognized again.",
  "cmd.noOldGroups": "No old groups to recover.",
  "cmd.done": "Done.",

  "log.title": "Write a log file",
  "log.short": "Keeps a file describing what was done with your tabs.",
  "log.help":
    "Every decision — group created, tab moved, color chosen — becomes a line in zstg-debug.log, inside your Zen profile folder. Because each line records the site of the tab involved, the file ends up being a history of the sites you visit, in plain text on your computer. That's why it ships turned off. Turn it on when investigating odd grouping; past 1 MB the file is cleared and starts over, so it never grows without end.",

  "selfTest.button": "Check that everything works",
  "selfTest.ok": "All good — {n} checks passed.",
  "selfTest.failed":
    "{n} of {total} checks failed. Grouping may misbehave because of this. Copy this result when reporting the problem.",
  "noWindow":
    "This page isn't connected to the browser window. Open the panel from a normal Zen window and try again.",

  "language.title": "Language",
  "language.short": "Follows the browser unless you pick one.",
  "language.auto": "Follow the browser",

  "a11y.moreDetails": "More details",

  "sec.maintenance": "Updates and removal",
  "maintenance.help":
    "Spacekeeper updates and removes itself from here — no installer needed. Checking and updating are the only actions in the whole product that contact the network: one request to the project's repository, only when you click, never on their own.",
  "update.check": "Check for updates",
  "update.apply": "Update",
  "update.checking": "Checking…",
  "update.upToDate": "You are on {version}, the latest release.",
  "update.available": "Update available: {current} → {latest}.",
  "update.applying": "Updating…",
  "update.done": "Updated. The new version takes effect when Zen restarts.",
  "update.doneLoaderChanged":
    "Updated. This release also changed the loader, which the panel cannot update by itself — run the installer once to finish.",
  "update.failed": "It did not work: {error}. Nothing was changed.",
  "update.disclosure":
    "Checking and updating contact the project's repository. Nothing else here ever touches the network.",
  "uninstall.button": "Uninstall Spacekeeper",
  "uninstall.title": "Uninstall Spacekeeper?",
  "uninstall.body":
    "This removes Spacekeeper's files — and the guard, if installed. Your settings and the loader are kept; other mods may use the loader. The removal takes effect when Zen restarts.\n\nIf you restart now, every group Spacekeeper created is dissolved first — no tab is closed — and the startup cache is cleared. Since Spacekeeper is being removed, the groups are not recreated.",
  "uninstall.action": "Uninstall",
  "uninstall.checkbox": "Restart Zen now",
  "uninstall.done":
    "Removed. Spacekeeper keeps working in this session and disappears when Zen restarts. Your settings were kept, so a reinstall finds everything again.",
  "uninstall.failed": "Removal failed: {error}",
  "common.cancel": "Cancel",
  "restart.title": "Restart Zen now?",
  "restart.body":
    "Before restarting, every group Spacekeeper created is dissolved. No tab is closed. The startup cache is also cleared. After the restart, the new version regroups everything from scratch.",
  "restart.loaderNote":
    "This release also changed the loader — after the restart, run the installer once to update it too.",
  "restart.action": "Restart now",
  "restart.later": "Not now",
  "reset.manual":
    "Zen was not restarted. Restart it whenever you like; if anything looks stale after that, clear the startup cache in about:support.",

  "menu.root": "Spacekeeper",
  "menu.preferences": "Preferences…",
  "menu.rename": "Rename this group…",
  "rename.title": "Rename group",
  "rename.field": "New group name:",
};

const pt = {
  "app.subtitle": "Grupos de abas, um por site, dentro do Space em que você está.",

  "sec.grouping": "Agrupamento",
  "sec.subdomains": "Subdomínios",
  "sec.labels": "Nome desses grupos",
  "sec.rules": "Regras",
  "sec.exclusions": "Exclusões",
  "sec.appearance": "Aparência",
  "sec.actions": "Ações deste Space",
  "sec.diagnostics": "Diagnóstico",

  "grouping.title": "Agrupar abas automaticamente",
  "grouping.short": "Cada aba vai para o grupo do site que ela está mostrando.",
  "grouping.help":
    "Assim que uma página carrega, a aba vai para o grupo do site dela — e nunca sai do Space onde você está. Quando você navega de um site para outro, a aba troca de grupo junto. Desligando, nada é agrupado sozinho, mas os botões de Ações continuam funcionando, e os grupos que já existem ficam como estão. O que você muda aqui vale das próximas abas em diante; para aplicar ao que já está aberto, use Reagrupar.",

  "minimum.title": "Mínimo de abas",
  "minimum.short": "Quantas abas do mesmo site precisam existir para o grupo nascer.",
  "minimum.help":
    "Com 1 (o padrão), todo site vira grupo assim que abre: organização imediata, ao custo de grupos de uma aba só. Com 2, a primeira aba fica solta e o grupo nasce quando aparece a segunda. O mínimo vale só na criação: se o grupo já existe e você fecha abas, ele continua ali — nada se desfaz sozinho.",

  "noJump.title": "Não pular para outro Space",
  "noJump.short": "Abrir um endereço já aberto em outro Space não leva você para lá.",
  "noJump.help":
    "Quando você digita um endereço que já está aberto, o Zen procura essa aba em todos os Spaces e leva você até ela, mesmo que esteja em outro contexto. O efeito é confuso: nenhuma aba nova aparece e o navegador parece pular sozinho. Ligado (o padrão), essa busca fica restrita ao Space atual e nada muda você de lugar sem você mandar. Em troca, se a página já estiver aberta em outro Space, o Zen não vai mais pular para lá — ele abre uma aba nova aqui.",

  "subGlobal.title": "Separar todos os subdomínios",
  "subGlobal.short": "mail.google.com e drive.google.com viram dois grupos, em todos os sites.",
  "subGlobal.help":
    "Normalmente mail.google.com e drive.google.com caem no mesmo grupo, chamado google. Ligando isto, cada subdomínio vira um grupo próprio — em todos os sites, inclusive naqueles onde o subdomínio não significa nada. Costuma fragmentar demais; na maioria dos casos a lista logo abaixo resolve melhor.",

  "subList.title": "Sites em que cada serviço vira um grupo",
  "subList.short": "Ex.: google.com separa Gmail, Drive e Agenda; o resto da web não muda.",
  "subList.help":
    "Liste os sites em que cada endereço antes do nome é, na prática, um serviço diferente. Em google.com, Gmail, Drive e Agenda passam a ser grupos separados — na barra lateral eles aparecem como mail.google, drive.google e calendar.google — enquanto todo o resto da web continua agrupado por site. Escrever google.com já cobre tudo que vem antes dele: não precisa listar um por um.",
  "subList.example": "google.com, atlassian.net",

  "label.help":
    "Isto muda só o nome que aparece, nunca o agrupamento — trocar de estilo não move nenhuma aba. \"Subdomínio e site\" sempre deixa claro de qual site é o grupo. \"Só o subdomínio\" é mais curto de ler, com um porém: se você listar google.com e yahoo.com, os dois vão exibir um grupo chamado mail. São dois grupos diferentes com o mesmo nome, e nada na barra lateral diz qual é qual.",
  "label.host": "Subdomínio e site",
  "label.host.ex": "mail.google · drive.google",
  "label.sub": "Só o subdomínio",
  "label.sub.ex": "mail · drive · docs",

  "rules.help":
    "Uma regra mantém sites diferentes juntos num grupo só: uma regra chamada Trabalho com slack.com e notion.so põe os dois no grupo Trabalho. Regras vencem o agrupamento por site e a separação por subdomínio; só a lista de exclusões vence uma regra. O nome da regra é o nome do grupo — mudar o nome cria um grupo novo na próxima aba e deixa o antigo para trás.",
  "rules.name": "Nome do grupo",
  "rules.sites": "Sites, separados por vírgula",
  "rules.new": "Nova regra",
  "rules.remove": "Remover",
  "rules.warning":
    "Não conseguimos ler suas regras salvas — nenhuma regra está valendo agora. Nada foi apagado: criar uma regra aqui substitui o texto guardado, e o painel pergunta antes. O original está em about:config, na chave zen.stg.customRules.",
  "rules.confirm":
    "Suas regras salvas não puderam ser lidas e o texto original ainda está guardado. Criar uma regra agora substitui esse texto. Continuar?",

  "exclusions.title": "Sites que nunca são agrupados",
  "exclusions.short": "As abas desses sites ficam soltas, fora de qualquer grupo.",
  "exclusions.help":
    "Sites listados aqui ficam de fora da organização automática: as abas novas deles nascem soltas. Abas que já estavam num grupo saem dele assim que a página recarrega. Escrever banco.com.br já cobre app.banco.com.br e qualquer endereço terminado nele. Útil para banco, intranet ou qualquer coisa que você prefere ver separada do resto.",
  "exclusions.example": "banco.com.br, gov.br",

  "color.title": "Cor pelo logo do site",
  "color.short": "YouTube fica vermelho, Spotify verde.",
  "color.help":
    "A cor do grupo vem do logo do site. Como o navegador só aceita nove cores, fica a mais próxima: logos escuros viram cinza e logos com muitas cores ficam com uma delas. Com isto ligado, trocar a cor de um grupo na mão fixa a sua escolha para aquele site. Desligando, cada site ganha uma cor fixa tirada do próprio nome — sempre a mesma, sem relação com a marca.",

  "focus.title": "Modo de foco",
  "focus.short": "Recolhe os grupos que você não está usando. Nenhuma aba é fechada.",
  "focus.help":
    "Com muitos grupos, a barra lateral vira rolagem. O modo de foco recolhe os grupos que você não está usando e mantém abertos os mais recentes deste Space. Nenhuma aba é fechada: as abas dos grupos recolhidos continuam abertas, só somem da lista até você clicar no grupo de novo. Abrir uma aba avulsa, que não pertence a grupo nenhum, não recolhe nada.",

  "focusCount.title": "Grupos abertos no foco",
  "focusCount.short": "Quantos ficam abertos — só vale com o modo de foco ligado.",
  "focusCount.help":
    "Com 1, só o grupo da aba atual fica aberto, e a barra se mexe a cada troca de aba. Com 3 (o padrão), alternar entre os grupos que você vem usando não move nada: só sai de cena o que ficou para trás. Com o modo de foco desligado, este número não faz nada — por isso o campo aparece apagado até você ligar o modo de foco.",

  "actions.help":
    "Estes botões agem apenas no Space em que você está — os outros nunca são tocados. Reagrupar aplica as configurações atuais às abas deste Space. Colapsar e Expandir só recolhem ou abrem os grupos. Desagrupar desfaz os grupos criados automaticamente aqui: as abas continuam abertas, mas os nomes que você deu a esses grupos se perdem e não voltam com Reagrupar. Grupos que você montou à mão e pastas do Zen ficam intactos. Recuperar grupos antigos reconhece de novo grupos criados por versões anteriores — use uma vez depois de atualizar.",
  "cmd.regroup": "Reagrupar este Space",
  "cmd.ungroup": "Desagrupar este Space",
  "cmd.collapse": "Colapsar todos os grupos",
  "cmd.expand": "Expandir todos os grupos",
  "cmd.recover": "Recuperar grupos antigos",
  "cmd.confirmUngroup":
    "Isto desfaz os grupos criados automaticamente neste Space. As abas continuam abertas, mas os nomes que você deu a esses grupos se perdem. Continuar?",
  "cmd.regrouped": "Pronto: {n} abas reorganizadas neste Space.",
  "cmd.nothingToDo": "Nada a fazer: tudo já estava organizado.",
  "cmd.ungrouped": "{n} abas saíram dos grupos. Elas continuam abertas.",
  "cmd.noGroups": "Não havia grupos automáticos neste Space.",
  "cmd.recovered": "{n} grupo(s) antigo(s) reconhecido(s) de novo.",
  "cmd.noOldGroups": "Nenhum grupo antigo para recuperar.",
  "cmd.done": "Pronto.",

  "log.title": "Gravar arquivo de registro",
  "log.short": "Guarda num arquivo o que foi feito com suas abas.",
  "log.help":
    "Cada decisão — grupo criado, aba movida, cor escolhida — vira uma linha em zstg-debug.log, na pasta do seu perfil do Zen. Como cada linha registra o site da aba envolvida, o arquivo acaba sendo um histórico dos sites que você visita, em texto puro no seu computador. Por isso vem desligado. Ligue se estiver investigando um agrupamento estranho; ao passar de 1 MB o arquivo é zerado e recomeça, então não cresce sem fim.",

  "selfTest.button": "Verificar se está tudo funcionando",
  "selfTest.ok": "Tudo certo — {n} verificações passaram.",
  "selfTest.failed":
    "{n} de {total} verificações falharam. O agrupamento pode errar por causa disso. Copie este resultado ao relatar o problema.",
  "noWindow":
    "Esta página não está conectada à janela do navegador. Abra o painel a partir de uma janela normal do Zen e tente de novo.",

  "language.title": "Idioma",
  "language.short": "Segue o navegador, a menos que você escolha um.",
  "language.auto": "Seguir o navegador",

  "a11y.moreDetails": "Mais detalhes",

  "sec.maintenance": "Atualização e remoção",
  "maintenance.help":
    "O Spacekeeper se atualiza e se remove por aqui — sem precisar do instalador. Verificar e atualizar são as únicas ações do produto inteiro que acessam a rede: uma consulta ao repositório do projeto, só quando você clica, nunca sozinhas.",
  "update.check": "Verificar atualização",
  "update.apply": "Atualizar",
  "update.checking": "Verificando…",
  "update.upToDate": "Você está na {version}, a versão mais recente.",
  "update.available": "Atualização disponível: {current} → {latest}.",
  "update.applying": "Atualizando…",
  "update.done": "Atualizado. A nova versão passa a valer quando o Zen reiniciar.",
  "update.doneLoaderChanged":
    "Atualizado. Esta versão também mudou o loader, que o painel não consegue atualizar sozinho — rode o instalador uma vez para concluir.",
  "update.failed": "Não deu certo: {error}. Nada foi alterado.",
  "update.disclosure":
    "Verificar e atualizar consultam o repositório do projeto. Nada mais aqui acessa a rede.",
  "uninstall.button": "Desinstalar o Spacekeeper",
  "uninstall.title": "Desinstalar o Spacekeeper?",
  "uninstall.body":
    "Isto remove os arquivos do Spacekeeper — e o guard, se estiver instalado. Suas configurações e o loader são mantidos; outros mods podem usar o loader. A remoção passa a valer quando o Zen reiniciar.\n\nSe você reiniciar agora, todos os grupos que o Spacekeeper criou são desfeitos antes — nenhuma aba é fechada — e o cache de inicialização é limpo. Como o Spacekeeper está sendo removido, os grupos não são recriados.",
  "uninstall.action": "Desinstalar",
  "uninstall.checkbox": "Reiniciar o Zen agora",
  "uninstall.done":
    "Removido. O Spacekeeper continua funcionando nesta sessão e some quando o Zen reiniciar. Suas configurações foram mantidas, então uma reinstalação encontra tudo de novo.",
  "uninstall.failed": "A remoção falhou: {error}",
  "common.cancel": "Cancelar",
  "restart.title": "Reiniciar o Zen agora?",
  "restart.body":
    "Antes de reiniciar, todos os grupos que o Spacekeeper criou são desfeitos. Nenhuma aba é fechada. O cache de inicialização também é limpo. Depois do reinício, a nova versão reagrupa tudo do zero.",
  "restart.loaderNote":
    "Esta versão também mudou o loader — depois do reinício, rode o instalador uma vez para atualizá-lo também.",
  "restart.action": "Reiniciar agora",
  "restart.later": "Agora não",
  "reset.manual":
    "O Zen não foi reiniciado. Reinicie quando quiser; se algo parecer desatualizado depois, limpe o cache de inicialização em about:support.",

  "menu.root": "Spacekeeper",
  "menu.preferences": "Preferências…",
  "menu.rename": "Renomear este grupo…",
  "rename.title": "Renomear grupo",
  "rename.field": "Novo nome do grupo:",
};

const es = {
  "app.subtitle": "Grupos de pestañas, uno por sitio, dentro del Space en el que estás.",

  "sec.grouping": "Agrupación",
  "sec.subdomains": "Subdominios",
  "sec.labels": "Nombre de esos grupos",
  "sec.rules": "Reglas",
  "sec.exclusions": "Exclusiones",
  "sec.appearance": "Apariencia",
  "sec.actions": "Acciones de este Space",
  "sec.diagnostics": "Diagnóstico",

  "grouping.title": "Agrupar pestañas automáticamente",
  "grouping.short": "Cada pestaña va al grupo del sitio que está mostrando.",
  "grouping.help":
    "En cuanto una página carga, su pestaña va al grupo de ese sitio — y nunca sale del Space en el que estás. Cuando navegas de un sitio a otro, la pestaña cambia de grupo con él. Si lo apagas, nada se agrupa solo, pero los botones de Acciones siguen funcionando y los grupos existentes quedan como están. Lo que cambias aquí vale para las próximas pestañas; para aplicarlo a lo que ya está abierto, usa Reagrupar.",

  "minimum.title": "Mínimo de pestañas",
  "minimum.short": "Cuántas pestañas del mismo sitio hacen falta para crear un grupo.",
  "minimum.help":
    "Con 1 (el valor por defecto), cada sitio se vuelve grupo apenas se abre: orden inmediato, a costa de grupos de una sola pestaña. Con 2, la primera pestaña queda suelta y el grupo nace cuando aparece la segunda. El mínimo solo se aplica al crear: si el grupo ya existe y cierras pestañas, sigue ahí — nada se deshace solo.",

  "noJump.title": "No saltar a otro Space",
  "noJump.short": "Abrir una dirección ya abierta en otro Space no te lleva allí.",
  "noJump.help":
    "Cuando escribes una dirección que ya está abierta, Zen busca esa pestaña en todos los Spaces y te lleva hasta ella, aunque pertenezca a otro contexto. El efecto es confuso: no aparece ninguna pestaña nueva y el navegador parece saltar solo. Activado (por defecto), esa búsqueda queda limitada al Space actual y nada te mueve de lugar sin pedirlo. A cambio, si la página ya está abierta en otro Space, Zen ya no salta allí — abre una pestaña nueva aquí.",

  "subGlobal.title": "Separar todos los subdominios",
  "subGlobal.short": "mail.google.com y drive.google.com se vuelven dos grupos, en todos los sitios.",
  "subGlobal.help":
    "Normalmente mail.google.com y drive.google.com caen en el mismo grupo, llamado google. Al activar esto, cada subdominio se vuelve un grupo propio — en todos los sitios, incluso en aquellos donde el subdominio no significa nada. Suele fragmentar demasiado; en la mayoría de los casos la lista de abajo funciona mejor.",

  "subList.title": "Sitios donde cada servicio es un grupo",
  "subList.short": "Ej.: google.com separa Gmail, Drive y Calendar; el resto de la web no cambia.",
  "subList.help":
    "Lista los sitios donde lo que viene antes del nombre es, en la práctica, un servicio distinto. En google.com, Gmail, Drive y Calendar pasan a ser grupos separados — en la barra lateral aparecen como mail.google, drive.google y calendar.google — mientras el resto de la web sigue agrupado por sitio. Escribir google.com ya cubre todo lo que viene antes: no hace falta listarlos uno por uno.",
  "subList.example": "google.com, atlassian.net",

  "label.help":
    "Esto cambia solo el nombre que se muestra, nunca la agrupación — cambiar de estilo no mueve ninguna pestaña. \"Subdominio y sitio\" siempre deja claro de qué sitio es el grupo. \"Solo el subdominio\" es más corto de leer, con un detalle: si listas google.com y yahoo.com, ambos mostrarán un grupo llamado mail. Son dos grupos distintos con el mismo nombre, y nada en la barra lateral los distingue.",
  "label.host": "Subdominio y sitio",
  "label.host.ex": "mail.google · drive.google",
  "label.sub": "Solo el subdominio",
  "label.sub.ex": "mail · drive · docs",

  "rules.help":
    "Una regla mantiene sitios distintos juntos en un solo grupo: una regla llamada Trabajo con slack.com y notion.so pone ambos en el grupo Trabajo. Las reglas ganan a la agrupación por sitio y a la separación por subdominio; solo la lista de exclusiones gana a una regla. El nombre de la regla es el nombre del grupo — cambiarlo crea un grupo nuevo en la próxima pestaña y deja el anterior atrás.",
  "rules.name": "Nombre del grupo",
  "rules.sites": "Sitios, separados por comas",
  "rules.new": "Nueva regla",
  "rules.remove": "Quitar",
  "rules.warning":
    "No pudimos leer tus reglas guardadas — ninguna regla está activa ahora. No se borró nada: crear una regla aquí reemplaza el texto guardado, y el panel pregunta antes. El original está en about:config, en la clave zen.stg.customRules.",
  "rules.confirm":
    "Tus reglas guardadas no pudieron leerse y el texto original sigue guardado. Crear una regla ahora lo reemplaza. ¿Continuar?",

  "exclusions.title": "Sitios que nunca se agrupan",
  "exclusions.short": "Las pestañas de estos sitios quedan sueltas, fuera de cualquier grupo.",
  "exclusions.help":
    "Los sitios listados aquí quedan fuera de la agrupación automática: sus pestañas nuevas nacen sueltas. Las pestañas que ya estaban en un grupo salen de él en cuanto la página se recarga. Escribir banco.com ya cubre app.banco.com y cualquier dirección terminada en él. Útil para el banco, intranets o cualquier cosa que prefieras mantener aparte.",
  "exclusions.example": "banco.com, gob.es",

  "color.title": "Color del logo del sitio",
  "color.short": "YouTube se vuelve rojo, Spotify verde.",
  "color.help":
    "El color del grupo viene del logo del sitio. Como el navegador solo acepta nueve colores, queda el más cercano: los logos oscuros se vuelven grises y los logos con muchos colores se quedan con uno. Con esto activado, cambiar el color de un grupo a mano fija tu elección para ese sitio. Al desactivarlo, cada sitio recibe un color fijo derivado de su propio nombre — siempre el mismo, sin relación con la marca.",

  "focus.title": "Modo de enfoque",
  "focus.short": "Pliega los grupos que no estás usando. No se cierra ninguna pestaña.",
  "focus.help":
    "Con muchos grupos, la barra lateral se vuelve puro desplazamiento. El modo de enfoque pliega los grupos que no estás usando y mantiene abiertos los más recientes de este Space. No se cierra ninguna pestaña: las de los grupos plegados siguen abiertas, solo desaparecen de la lista hasta que vuelves a hacer clic en el grupo. Abrir una pestaña suelta, que no pertenece a ningún grupo, no pliega nada.",

  "focusCount.title": "Grupos abiertos en el enfoque",
  "focusCount.short": "Cuántos quedan abiertos — solo aplica con el modo de enfoque activado.",
  "focusCount.help":
    "Con 1, solo el grupo de la pestaña actual queda abierto, y la barra se mueve cada vez que cambias de pestaña. Con 3 (por defecto), alternar entre los grupos que vienes usando no mueve nada: solo sale de escena lo que quedó atrás. Con el modo de enfoque desactivado este número no hace nada, por eso el campo aparece atenuado hasta que lo actives.",

  "actions.help":
    "Estos botones actúan solo en el Space en el que estás — los demás nunca se tocan. Reagrupar aplica la configuración actual a las pestañas de este Space. Plegar y Expandir solo cierran o abren los grupos. Desagrupar deshace los grupos creados automáticamente aquí: las pestañas siguen abiertas, pero los nombres que les diste a esos grupos se pierden y no vuelven con Reagrupar. Los grupos que armaste a mano y las carpetas de Zen quedan intactos. Recuperar grupos antiguos vuelve a reconocer grupos creados por versiones anteriores — úsalo una vez después de actualizar.",
  "cmd.regroup": "Reagrupar este Space",
  "cmd.ungroup": "Desagrupar este Space",
  "cmd.collapse": "Plegar todos los grupos",
  "cmd.expand": "Expandir todos los grupos",
  "cmd.recover": "Recuperar grupos antiguos",
  "cmd.confirmUngroup":
    "Esto deshace los grupos creados automáticamente en este Space. Las pestañas siguen abiertas, pero los nombres que les diste a esos grupos se pierden. ¿Continuar?",
  "cmd.regrouped": "Listo: {n} pestañas reorganizadas en este Space.",
  "cmd.nothingToDo": "Nada que hacer: ya estaba todo organizado.",
  "cmd.ungrouped": "{n} pestañas salieron de sus grupos. Siguen abiertas.",
  "cmd.noGroups": "No había grupos automáticos en este Space.",
  "cmd.recovered": "{n} grupo(s) antiguo(s) reconocido(s) de nuevo.",
  "cmd.noOldGroups": "No hay grupos antiguos que recuperar.",
  "cmd.done": "Listo.",

  "log.title": "Guardar archivo de registro",
  "log.short": "Guarda en un archivo lo que se hizo con tus pestañas.",
  "log.help":
    "Cada decisión — grupo creado, pestaña movida, color elegido — se convierte en una línea en zstg-debug.log, dentro de la carpeta de tu perfil de Zen. Como cada línea registra el sitio de la pestaña involucrada, el archivo termina siendo un historial de los sitios que visitas, en texto plano en tu computadora. Por eso viene desactivado. Actívalo si estás investigando una agrupación extraña; al pasar de 1 MB el archivo se vacía y empieza de nuevo, así que no crece sin fin.",

  "selfTest.button": "Comprobar que todo funciona",
  "selfTest.ok": "Todo bien — {n} comprobaciones pasaron.",
  "selfTest.failed":
    "{n} de {total} comprobaciones fallaron. La agrupación puede equivocarse por eso. Copia este resultado al reportar el problema.",
  "noWindow":
    "Esta página no está conectada a la ventana del navegador. Abre el panel desde una ventana normal de Zen e inténtalo de nuevo.",

  "language.title": "Idioma",
  "language.short": "Sigue al navegador, a menos que elijas uno.",
  "language.auto": "Seguir al navegador",

  "a11y.moreDetails": "Más detalles",

  "sec.maintenance": "Actualización y eliminación",
  "maintenance.help":
    "Spacekeeper se actualiza y se elimina desde aquí, sin necesidad del instalador. Verificar y actualizar son las únicas acciones de todo el producto que acceden a la red: una consulta al repositorio del proyecto, solo cuando haces clic, nunca por su cuenta.",
  "update.check": "Buscar actualizaciones",
  "update.apply": "Actualizar",
  "update.checking": "Verificando…",
  "update.upToDate": "Estás en la {version}, la versión más reciente.",
  "update.available": "Actualización disponible: {current} → {latest}.",
  "update.applying": "Actualizando…",
  "update.done": "Actualizado. La nueva versión se activa cuando Zen se reinicie.",
  "update.doneLoaderChanged":
    "Actualizado. Esta versión también cambió el loader, que el panel no puede actualizar por sí solo — ejecuta el instalador una vez para terminar.",
  "update.failed": "No funcionó: {error}. Nada fue modificado.",
  "update.disclosure":
    "Verificar y actualizar consultan el repositorio del proyecto. Nada más aquí accede a la red.",
  "uninstall.button": "Desinstalar Spacekeeper",
  "uninstall.title": "¿Desinstalar Spacekeeper?",
  "uninstall.body":
    "Esto elimina los archivos de Spacekeeper — y el guard, si está instalado. Tu configuración y el loader se conservan; otros mods pueden usar el loader. La eliminación tiene efecto cuando Zen se reinicie.\n\nSi reinicias ahora, antes se disuelven todos los grupos que Spacekeeper creó — no se cierra ninguna pestaña — y se limpia la caché de inicio. Como Spacekeeper se está eliminando, los grupos no se recrean.",
  "uninstall.action": "Desinstalar",
  "uninstall.checkbox": "Reiniciar Zen ahora",
  "uninstall.done":
    "Eliminado. Spacekeeper sigue funcionando en esta sesión y desaparece cuando Zen se reinicie. Tu configuración se conservó, así que una reinstalación encuentra todo de nuevo.",
  "uninstall.failed": "La eliminación falló: {error}",
  "common.cancel": "Cancelar",
  "restart.title": "¿Reiniciar Zen ahora?",
  "restart.body":
    "Antes de reiniciar, se disuelven todos los grupos que Spacekeeper creó. No se cierra ninguna pestaña. También se limpia la caché de inicio. Tras el reinicio, la nueva versión reagrupa todo desde cero.",
  "restart.loaderNote":
    "Esta versión también cambió el loader — tras el reinicio, ejecuta el instalador una vez para actualizarlo también.",
  "restart.action": "Reiniciar ahora",
  "restart.later": "Ahora no",
  "reset.manual":
    "Zen no se reinició. Reinícialo cuando quieras; si algo parece desactualizado después, limpia la caché de inicio en about:support.",

  "menu.root": "Spacekeeper",
  "menu.preferences": "Preferencias…",
  "menu.rename": "Renombrar este grupo…",
  "rename.title": "Renombrar grupo",
  "rename.field": "Nuevo nombre del grupo:",
};

export const CATALOG = { en, "pt-BR": pt, es };

/**
 * Casa pelo prefixo: `pt`, `pt-BR` e `pt-PT` levam todos ao português do Brasil.
 * Cobre as variantes regionais sem manter lista.
 */
export function chooseLanguage(preferred, fromBrowser) {
  if (preferred && preferred !== "auto" && CATALOG[preferred]) {
    return preferred;
  }
  const prefix = String(fromBrowser || "").toLowerCase().split(/[-_]/)[0];
  if (prefix === "pt") return "pt-BR";
  if (prefix === "es") return "es";
  if (prefix === "en") return "en";
  return BASE_LANGUAGE;
}

/**
 * Devolve a função de tradução. Chave ausente cai no inglês e é informada pelo
 * callback — retorno silencioso esconderia tradução faltando por versões
 * seguidas.
 */
export function createTranslator(language, onMissing) {
  const current = CATALOG[language] ?? CATALOG[BASE_LANGUAGE];
  return function t(key, values) {
    let text = current[key];
    if (text === undefined) {
      text = CATALOG[BASE_LANGUAGE][key];
      if (text === undefined) {
        onMissing?.(key, language, true);
        return key;
      }
      onMissing?.(key, language, false);
    }
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };
}
