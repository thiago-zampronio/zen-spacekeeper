## 1. Contagem

- [x] 1.1 Calcular a quantidade de abas escondidas, descontando a aba ativa visível
- [x] 1.2 Escrever a contagem em `zstg-hidden-count` quando o grupo estiver colapsado
- [x] 1.3 Remover o atributo quando o grupo for expandido
- [x] 1.4 Atualizar ao colapsar e expandir, inclusive pelos comandos de colapsar tudo
- [x] 1.5 Atualizar quando abas entram ou saem de um grupo

## 2. Estilo

- [x] 2.1 Exibir a contagem por `content: attr(...)` no rótulo do grupo
- [x] 2.2 Posicionar e dimensionar de forma discreta, alinhada ao rótulo
- [x] 2.3 Confirmar legibilidade em tema claro e escuro
- [x] 2.4 Manter os cantos arredondados com reserva quando a variável do Zen faltar
- [x] 2.5 Restringir todas as regras a `[zstg-key]`

## 3. Verificação

- [x] 3.1 Grupo colapsado de três abas sem a ativa exibe `3`
- [x] 3.2 Grupo colapsado de três abas com a ativa exibe `2`
- [x] 3.3 Expandir remove a contagem
- [x] 3.4 Agrupar nova aba em grupo colapsado incrementa a contagem
- [x] 3.5 Fechar aba escondida decrementa a contagem
- [x] 3.6 Folder nativa e grupo do usuário não exibem contagem
- [x] 3.7 Cantos arredondados visíveis nos grupos do sistema

## 4. Documentação

- [x] 4.1 Registrar o acabamento no README
