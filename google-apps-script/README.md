# Integração com Google Sheets — protótipo técnico

> [!warning] Status atual
> O `index.html` **já possui** a integração no front-end: ele lê a URL configurada em **Configurações → Sincronização**, busca a fila remota e envia movimentações. Essa integração fica **desligada por padrão** enquanto o campo da URL estiver vazio.
>
> Não há URL oficial configurada neste repositório e o protótipo abaixo **não está aprovado para dados reais de pacientes**. Até existir controle de acesso validado, o app deve operar apenas com `localStorage` e dados fictícios.

## Arquitetura prevista

A arquitetura usa duas planilhas para preservar o cadastro e a triagem:

- **Planilha Master** — cadastro/triagem. O app e o `Code.gs` devem somente **ler** essa planilha; nunca escrever nela.
- **Fila Operacional** — planilha separada, privada e administrada pela operação. É nela que o script registra o fluxo `waiting` → `door` → `in_room` → `done`.

O repositório não publica links de planilhas. IDs, URLs e permissões da operação real devem ficar fora do código público.

## O que o `Code.gs` já faz

1. `syncFromMaster()` lê a Master e cria, na Fila Operacional, somente as combinações novas de paciente + especialidade. Não sobrescreve o progresso já registrado.
2. `doGet` devolve o estado da Fila Operacional em JSON.
3. `doPost` atualiza uma movimentação de uma combinação paciente + especialidade.
4. `setupTrigger()` cria um gatilho de sincronização a cada 5 minutos e executa a primeira sincronização.

Os campos `Entrou_Tenda`, `Entrou_Porta`, `Entrou_Consulta`, `Concluido_Em` e `Atualizado_Em` usam timestamp numérico em milissegundos, em vez de texto de hora, para evitar ambiguidade de fuso horário.

## Limite de segurança do protótipo

O `Code.gs` atual expõe `GET` e `POST` sem autenticação própria. Uma implantação de Apps Script acessível por “qualquer pessoa” permite que qualquer pessoa com a URL leia e tente alterar a Fila Operacional.

**Portanto, não implante este script com acesso anônimo para dados reais ou identificáveis.** A Planilha Master fica protegida contra escrita, mas a Fila Operacional pode conter informação de saúde e exige controle de acesso compatível com a operação e a LGPD.

## Pré-requisitos antes de ativar em campo

- [ ] Definir o responsável operacional pela Fila Operacional e pela Planilha Master.
- [ ] Criar a Fila Operacional privada e manter seus links/IDs fora do repositório público.
- [ ] Padronizar os nomes das especialidades na Master.
- [ ] Definir e testar o modelo de autenticação/autorização da API antes de disponibilizar dados reais.
- [ ] Validar leitura, movimentações, reconciliação de erros e acesso offline em Android e iPhone.
- [ ] Registrar quem pode configurar a URL do endpoint nos celulares de campo.

## Fluxo de ativação, quando os pré-requisitos forem cumpridos

1. Na Fila Operacional privada, abra `Extensões` → `Apps Script` e copie `Code.gs`.
2. Preencha `MASTER_SHEET_ID` com o ID da Master real. O script deve permanecer vinculado à **Fila Operacional**, nunca à Master.
3. Execute `setupTrigger()` uma vez para autorizar o acesso e criar o gatilho de sincronização.
4. Implante a API somente com o modelo de acesso aprovado para a operação. Não use uma implantação anônima como atalho para produção.
5. No app, abra **Configurações → Sincronização**, cole a URL do endpoint oficialmente aprovado e use **Salvar e Testar**.
6. Confirme que a tela mostra `Sincronizado` e que uma movimentação de teste aparece na Fila Operacional antes de iniciar a ação.

## Limitações conhecidas

- `Status_Geral` da Master é único por paciente, não por especialidade. Por isso, `syncFromMaster()` inicia novas linhas como `waiting`; ele não tenta inferir uma etapa por especialidade.
- A correspondência de especialidades no protótipo aceita nomes parciais, mas a padronização na planilha real continua necessária.
- O app mantém a atualização local imediatamente e só então envia o `POST`. Falhas de rede são sinalizadas como erro de sincronização e precisam de uma estratégia operacional de reconciliação antes da produção.
