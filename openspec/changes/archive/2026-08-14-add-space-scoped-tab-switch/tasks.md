## 1. Envoltório

- [x] 1.1 Guardar a referência original de `window.switchToTabHavingURI`
- [x] 1.2 Substituir por um envoltório que delega sempre à original
- [x] 1.3 Restaurar a função original no `unload` da janela

## 2. Filtro por Space

- [x] 2.1 Montar a lista de browsers cujas abas pertencem ao Space ativo
- [x] 2.2 Incluir abas essenciais apenas quando não declaram Space ou declaram o atual
- [x] 2.3 Sombrear `gZenWorkspaces.allUsedBrowsers` durante a chamada
- [x] 2.4 Restaurar o getter original em `finally`, inclusive quando a original lança

## 3. Robustez e configuração

- [x] 3.1 Declarar `zen.stg.spaceScopedTabSwitch` (bool, padrão `true`)
- [x] 3.2 Delegar sem filtrar quando a pref estiver desligada
- [x] 3.3 Delegar sem filtrar e registrar no console se a API interna faltar

## 4. Verificação

- [x] 4.1 Endereço aberto só em outro Space: abre no Space atual, sem trocar de Space
- [x] 4.2 Endereço aberto no Space atual: troca para a aba existente, sem criar nova
- [x] 4.3 Endereço aberto nos dois Spaces: escolhe a aba do Space atual
- [x] 4.4 Aba essencial continua sendo alcançada de qualquer Space
- [x] 4.5 Favorito de endereço aberto em outro Space não troca de Space
- [x] 4.6 Pref desligada restaura o comportamento nativo sem reiniciar
- [x] 4.7 `gZenWorkspaces.allUsedBrowsers` volta ao getter original após a chamada

## 5. Documentação

- [x] 5.1 Registrar o comportamento e a pref no README
- [x] 5.2 Explicar no README por que isso não é um bug do agrupamento
