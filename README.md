# SAS Brasil • Suíte Clínica & Volantes

Aplicativo web (single-file, sem build) usado pelos volantes da **SAS Brasil**
durante as expedições médicas (ex.: Rally dos Sertões) para acompanhar e
movimentar as filas de atendimento por especialidade, direto do celular.

🔗 App publicado: https://danielbriror.github.io/volantes-sas/

## O que o app faz

O cadastro e a triagem dos pacientes continuam sendo feitos como sempre, na
planilha da SAS. O app **não substitui o cadastro** — ele existe pra dar aos
volantes uma visão em tempo real de quem está esperando, quem já foi chamado
pra porta e quem está em consulta, especialidade por especialidade.

### Aba "Volantes & Filas"

- Lista todas as especialidades (Oftalmologia, Odontologia, Dermatologia,
  Saúde da Mulher, Pediatria/Neuroped, Clínica Geral por padrão — editável),
  cada uma com sua fila dividida em 3 etapas:
  1. **Aguardando na Tenda**
  2. **Na Porta** (buffer de 2–3 pacientes chamados)
  3. **Em Consulta com o Médico**
- Cada card de paciente mostra o nome, a pulseira/ID, bolinhas coloridas
  indicando em quais outras especialidades ele também está na fila, o tempo
  na etapa atual e o tempo total de espera.
- Um botão por etapa move o paciente pra frente na fila (Chamar p/ Porta →
  Entrou na Consulta → Concluir Atendimento), com opção de devolver pra
  Tenda em caso de engano.
- Se o paciente já está em atendimento em outra especialidade, isso aparece
  destacado no card (e o botão de chamada fica bloqueado) pra evitar
  conflito de agenda.
- Busca rápida por nome ou número de pulseira na barra inferior.

### Aba "Temporizador Ver Magia"

Controle simples de tempo por paciente para o atendimento de Oftalmologia
(Ver Magia): 1º toque marca 5 minutos (colírio), 2º toque marca 30 minutos
(espera de dilatação), 3º toque reseta.

### Configurações

- **Tema** claro/escuro/automático.
- **Cores das pulseiras** de cada especialidade, personalizáveis.
- **Sincronização com Google Sheets** (opcional) — veja
  [`google-apps-script/README.md`](google-apps-script/README.md) para o
  protótipo de backend que mantém múltiplos celulares em sincronia através
  de uma planilha operacional separada, sem nunca alterar a planilha
  original de cadastro/triagem.
- Recarregar dados de demonstração / limpar tudo.

## Como funciona por baixo dos panos

- HTML/CSS/JS puro, um único arquivo (`index.html`), sem dependências de
  build.
- Estado guardado no `localStorage` do navegador — funciona offline, cada
  aparelho mantém sua própria cópia local a menos que a sincronização com o
  Google Sheets esteja configurada.
- Publicado via GitHub Pages a partir da branch `master`.

## Estrutura do repositório

```
index.html              o aplicativo inteiro
google-apps-script/      protótipo de backend (Apps Script) para sincronizar
                          múltiplos volantes via Google Sheets
tests/                   testes automatizados (node --test)
```

## Rodando localmente

Não precisa de instalação — é HTML estático:

```bash
python3 -m http.server 8000
# abra http://localhost:8000/index.html
```

## Testes

```bash
node --test tests/dark-theme.test.cjs
```
