## 1. Carregamento do script

- [x] 1.1 Instalar `fx-autoconfig` no diretório do Zen (`config.js`, `defaults/pref/config-prefs.js`)
- [x] 1.2 Criar `<perfil>/chrome/JS/zen-space-tab-groups.uc.mjs` com esqueleto e log de inicialização
- [x] 1.3 Confirmar carregamento no console do browser e documentar a limpeza do startup cache

## 2. Configuração

- [x] 2.1 Declarar as prefs `zen.stg.*` com seus padrões no default branch (aparecem em about:config)
- [x] 2.2 Implementar leitura tipada com fallback ao padrão em valor malformado
- [x] 2.3 Registrar observadores de pref para aplicação em tempo real
- [x] 2.4 Parsear `customRules` e `colors` como JSON tolerante a erro
- [x] 2.5 Honrar `enabled` desligando apenas a organização automática, não os comandos

## 3. Derivação da chave

- [x] 3.1 Descartar esquemas não agrupáveis (`about:`, `chrome:`, `moz-extension:`, `file:`)
- [x] 3.2 Remover `www.` e reduzir ao domínio registrável
- [x] 3.3 ~~Embutir lista de sufixos compostos~~ — dispensada: `Services.eTLD` expõe a Public Suffix List do próprio Firefox
- [x] 3.4 Remover o sufixo para compor o rótulo (`www.youtube.com` → `youtube`)
- [x] 3.5 Implementar modo subdomínio usando o host completo
- [x] 3.6 Aplicar regras customizadas com precedência sobre o domínio
- [x] 3.7 Aplicar a lista de exclusão

## 4. Isolamento por Space

- [x] 4.1 Ler o Space a partir da aba (`zen-workspace-id`), nunca do Space ativo
- [x] 4.2 Implementar o predicado de elegibilidade (fixada, essencial, folder, split view, grupo do usuário)
- [x] 4.3 Resolver grupo existente filtrando por Space e `zstg-key`
- [x] 4.4 Criar grupo no container do Space correto com `insertBefore` adequado
- [x] 4.5 Marcar grupos criados com `zstg-key` e `zen-workspace-id`

## 5. Ciclo de vida das abas

- [x] 5.1 Escutar `TabOpen` com avaliação adiada
- [x] 5.2 Registrar `addTabsProgressListener` e reavaliar em `onLocationChange`
- [x] 5.3 Não reavaliar quando a chave não mudou
- [x] 5.4 Escutar `TabClose` e remover grupos vazios com `zstg-key`
- [x] 5.5 Implementar a guarda de reentrância
- [x] 5.6 Aplicar `minTabs` contando abas da mesma chave no mesmo Space

## 6. Apresentação

- [x] 6.1 Rotular grupos com a chave (ou o nome da regra)
- [x] 6.2 Derivar cor por hash estável da chave e persistir em `zen.stg.colors`
- [x] 6.3 Detectar e preservar cor definida manualmente pelo usuário
- [x] 6.4 Não alterar o estado de colapso ao adicionar ou remover abas
- [x] 6.5 Implementar o modo de foco em `TabSelect`, expandindo o grupo da aba ativa
- [x] 6.6 Não alterar colapso quando a aba ativa não pertence a grupo algum

## 7. Comandos

- [x] 7.1 Reagrupar Space atual, preservando grupos do usuário e folders do Zen
- [x] 7.2 Fazer o reagrupar respeitar `minTabs` e funcionar com a organização automática desligada
- [x] 7.3 Desagrupar Space atual, apenas grupos com `zstg-key`
- [x] 7.4 Colapsar todos e expandir todos os grupos do Space
- [x] 7.5 Expor os comandos por atalho de teclado e item de menu

## 10. Migração, robustez e estilo (descobertos em uso)

- [x] 10.1 Persistir o vínculo id do grupo -> chave, que não sobrevive na sessão
- [x] 10.2 Reconhecer grupos restaurados antes de criar um grupo novo
- [x] 10.3 Passagens adiadas de reconhecimento após a inicialização
- [x] 10.4 Podar o mapa apenas a pedido, nunca na inicialização
- [x] 10.5 Comando de adoção de grupos sem marcação, exigindo chave única entre as abas
- [x] 10.6 Folha de estilo que esconde as abas de grupo colapsado, restrita a `[zstg-key]`
- [x] 10.7 Cantos arredondados no contêiner do grupo
- [x] 10.8 Log em arquivo com pref `zen.stg.debugLog`, falha visível e nunca bloqueante
- [x] 10.9 Resolver caminho do log sob demanda, nunca no topo do módulo
- [x] 10.10 Verificar que o colapso esconde as abas e mantém a ativa visível
- [x] 10.11 Verificar que folders do Zen e grupos do usuário não são afetados pelo estilo

## 8. Verificação

- [x] 8.1 `youtube.com` aberto em dois Spaces gera dois grupos independentes
- [x] 8.2 Aba aberta em background em Space não ativo agrupa no Space correto
- [x] 8.3 Fechar as abas de um grupo não afeta o grupo de mesma chave em outro Space
- [x] 8.4 Essenciais, fixadas e split view permanecem intocados (folders do Zen já verificadas)
- [x] 8.5 Aba dentro de grupo criado pelo usuário nunca é realocada
- [x] 8.6 `youtube.com` e `youtube.com.br` caem no mesmo grupo `youtube`
- [x] 8.7 Modo subdomínio separa `mail.google.com` de `drive.google.com`
- [x] 8.8 Regra customizada tem precedência sobre o domínio
- [x] 8.9 `minTabs = 2` só cria grupo na segunda aba; reagrupar também respeita o mínimo
- [x] 8.10 Grupo que encolhe abaixo do `minTabs` não é dissolvido
- [x] 8.11 Navegação para outro domínio move a aba de grupo; dentro do mesmo domínio não
- [x] 8.12 Renomear grupo não quebra o pareamento por chave
- [x] 8.13 Cores estáveis entre Spaces e após reinício; cor manual preservada
- [x] 8.14 Grupo colapsado continua colapsado ao receber aba em segundo plano, com o modo de foco desligado
- [x] 8.15 Modo de foco colapsa os grupos sem a aba ativa e expande o da aba ativa
- [x] 8.16 Aba ativa sem grupo não altera o colapso de nenhum grupo
- [x] 8.17 Comandos não afetam outros Spaces
- [x] 8.18 `customRules` inválido não impede o agrupamento por domínio
- [x] 8.19 Desabilitar a organização automática não desfaz grupos e mantém comandos

## 9. Documentação

- [x] 9.1 README com instalação, tabela de prefs, comandos e limitações
- [x] 9.2 Registrar o risco de atualização do Zen remover o `fx-autoconfig`
