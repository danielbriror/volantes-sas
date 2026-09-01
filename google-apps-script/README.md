# Integração com Google Sheets (protótipo)

Arquitetura de duas planilhas, pra nunca arriscar os dados de cadastro/triagem:

- **Planilha Master** (cadastro/triagem) — continua exatamente como está hoje,
  usada por quem faz o cadastro. O app e o script **nunca escrevem nela**,
  só leem.
- **Planilha Fila Operacional** — nova, criada como mockup em:
  https://docs.google.com/spreadsheets/d/1IGYuc9u9k5Hl-vVS1k9x7dzDvk5siLoSLKVF_HiElxs/edit
  É nela que o `Code.gs` escreve as movimentações de fila (tenda / porta /
  consulta / concluído), e é ela que o app vai ler e atualizar em tempo real.

O script (`Code.gs`) faz duas coisas:

1. `syncFromMaster()` — lê a Master (só leitura) e adiciona na Fila
   Operacional qualquer combinação paciente+especialidade que ainda não
   existe lá. Não sobrescreve o progresso de quem já está na fila.
2. `doGet` / `doPost` — expõe a Fila Operacional como uma API HTTP simples
   pro app consumir (buscar o estado atual, e mandar "mover pra porta",
   "entrou na consulta", "concluiu").

As colunas `Entrou_Tenda`, `Entrou_Porta`, `Entrou_Consulta`, `Concluido_Em`
e `Atualizado_Em` guardam **timestamp numérico (ms, tipo `Date.now()`)**, não
texto "HH:MM" — evita o Google Sheets reinterpretar o valor como hora com
fuso horário errado ao ler/escrever.

## Como implantar (passo manual, precisa ser feito por vocês)

1. Abra a planilha **Fila Operacional** (link acima) → `Extensões` →
   `Apps Script`.
2. Apague o conteúdo padrão e cole o conteúdo de `Code.gs`.
3. No topo do arquivo, troque `MASTER_SHEET_ID` pelo ID real da Planilha
   Master (a parte da URL entre `/d/` e `/edit`).
4. No editor, selecione a função `setupTrigger` no menu de funções e clique
   em ▶ Executar uma vez — isso pede autorização (é a tela de permissão do
   Google, só vocês podem aprovar) e já liga a sincronização automática a
   cada 5 minutos.
5. `Implantar` → `Nova implantação` → tipo **Aplicativo da Web** →
   Executar como *Eu*, Quem pode acessar *Qualquer pessoa*. Copie a URL
   gerada.
6. Essa URL é o que entra no app (isso ainda não foi conectado ao
   `index.html` — é o próximo passo, depois que a Master real da SAS
   estiver definida).

## Pendências conhecidas (mockup → real)

- A Master mockup tem inconsistência nos nomes de especialidade (ex:
  "Saúde da Mulher" vs "Saúde da Mulher (Colo Útero)"). O `matchSpecialty_`
  já usa correspondência parcial pra tolerar isso, mas vale padronizar na
  planilha real.
- `Status_Geral` da Master é um status único por paciente (não por
  especialidade), por isso `syncFromMaster` sempre insere as novas linhas
  como `waiting` — ele nunca tenta adivinhar em qual etapa cada
  especialidade está a partir da Master.
- O `index.html` já sabe consumir essa API (Configurações > Sincronização):
  basta colar a URL do Apps Script implantado.
