## 1. Extração da cor

- [x] 1.1 Obter o favicon da aba pelo que o navegador já carregou, sem requisição nova
- [x] 1.2 Decodificar a imagem e ler os pixels de forma assíncrona
- [x] 1.3 Descartar pixels transparentes e quase acromáticos
- [x] 1.4 Escolher o matiz predominante ponderado por saturação
- [x] 1.5 Tratar qualquer falha como "sem cor", sem lançar

## 2. Classificação

- [x] 2.1 Converter a cor predominante para HSL
- [x] 2.2 Mapear saturação baixa ou luminosidade extrema para `gray`
- [x] 2.3 Mapear faixas de matiz para as oito cores cromáticas nativas
- [x] 2.4 Garantir que o resultado seja sempre uma das nove cores aceitas

## 3. Integração

- [x] 3.1 Declarar `zen.stg.faviconColors` (bool, padrão `true`)
- [x] 3.2 Criar o grupo imediatamente com a cor por hash
- [x] 3.3 Aplicar a cor derivada quando ficar pronta, sem recriar o grupo
- [x] 3.4 Persistir a cor derivada por chave em `zen.stg.colors`
- [x] 3.5 Não recalcular quando a chave já tem cor persistida
- [x] 3.6 Preservar a precedência da cor escolhida manualmente
- [x] 3.7 Registrar a derivação no log de diagnóstico

## 4. Verificação

- [x] 4.1 `youtube.com` produz um grupo `red`
- [x] 4.2 Site de logo escuro produz `gray`
- [x] 4.3 Site sem favicon cai no hash e o grupo é criado normalmente
- [x] 4.4 Cor derivada é a mesma em outro Space
- [x] 4.5 Cor permanece após reiniciar, sem recálculo
- [x] 4.6 Cor trocada manualmente sobrevive à recriação do grupo
- [x] 4.7 Com a pref desligada, novas chaves usam o hash
- [x] 4.8 Favicon ausente no momento do agrupamento é aplicado quando chega

## 5. Documentação

- [x] 5.1 Registrar a pref e o comportamento no README
- [x] 5.2 Explicar a limitação das nove cores e as colisões que ela causa
