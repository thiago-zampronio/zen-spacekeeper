## Why

Quem usa Spaces no Zen mantém contextos separados de propósito: trabalho, pessoal,
estudo. Abrir dez abas de pesquisa dentro de um Space transforma a sidebar em uma
lista indistinguível, e organizar isso à mão anula o ganho de ter Spaces.

Ferramentas de agrupamento automático existentes resolvem a lista mas ignoram a
fronteira do Space. O [Auto Tab Groups](https://github.com/nitzanpap/auto-tab-groups)
é a melhor referência de funcionalidades disponível — agrupamento por domínio, regras
customizadas, cores estáveis — e serve de linha de base para o conjunto de recursos
deste produto. O que ele não pode fazer, por limitação da API de extensões, é
enxergar Spaces: seus grupos são globais, então uma aba aberta em um Space é adotada
por um grupo de outro e arrastada junto para lá.

Este projeto trata o Space como fronteira de primeira classe da organização, não como
detalhe a contornar.

## What Changes

Introduz o produto completo em sua primeira versão: organização automática de abas
por domínio dentro do Zen Browser, com o Space como escopo de tudo.

- Toda aba é atribuída a um grupo derivado da URL, sem sair do seu Space.
- Grupos de mesma chave em Spaces distintos são entidades independentes.
- Regras customizadas agrupam domínios diferentes sob um nome escolhido pelo usuário.
- Rótulo, cor e estado de colapso são estáveis entre sessões.
- Comandos manuais reorganizam, desfazem e colapsam os grupos do Space atual.
- Toda a configuração vive em preferências e vale sem reiniciar o navegador.

Organização feita à mão pelo usuário — grupos que ele criou, folders nativas do Zen,
abas essenciais, fixadas e em split view — é território protegido e nunca é alterada.

Fora do escopo desta versão: sugestões de agrupamento por IA (o WebLLM da ferramenta
de referência), interface gráfica de configuração e sincronização entre dispositivos.

## Capabilities

### New Capabilities

- `space-isolation`: invariantes que impedem a organização de cruzar a fronteira de
  um Space ou tocar em estruturas nativas do Zen.
- `tab-grouping`: como a chave de grupo é derivada de uma URL e como abas são
  atribuídas, reavaliadas e liberadas de grupos.
- `group-presentation`: rótulo, cor e estado de colapso dos grupos.
- `grouping-commands`: ações manuais sobre os grupos do Space atual.
- `configuration`: leitura, validação e aplicação em tempo real das preferências.

### Modified Capabilities

Nenhuma. Esta é a primeira change do projeto.

## Impact

- Novo artefato: script privilegiado `zen-space-tab-groups.uc.mjs` em
  `<perfil>/chrome/JS/`, carregado por `fx-autoconfig`.
- Requer `fx-autoconfig` instalado no diretório de instalação do Zen (`config.js` e
  `defaults/pref/`), o que pede privilégio de administrador.
- Novas preferências sob o prefixo `zen.stg.` em `about:config`.
- Depende de API interna do Zen (`gZenWorkspaces`, `gBrowser.tabGroups`), sujeita a
  quebra em atualizações do navegador.
- Nada é publicado em `about:addons`; não há pacote `.xpi`.
