# SAS Brasil • Suíte Clínica & Volantes

Aplicativo web (single-file, sem build) usado pelos volantes da **SAS Brasil**
durante as expedições médicas (ex.: Rally dos Sertões) para acompanhar e
movimentar as filas de atendimento por especialidade, direto do celular.

🔗 App publicado: https://danielbriror.github.io/volantes-sas/

## O que o app faz

O cadastro e a triagem dos pacientes continuam sendo feitos como sempre, na
planilha da SAS. O app **não substitui o cadastro** — ele existe para dar aos
volantes uma visão de quem está esperando, quem já foi chamado para a porta e
quem está em consulta, especialidade por especialidade.

### Aba "Volantes & Filas"

- Lista todas as especialidades (Oftalmologia, Odontologia, Dermatologia,
  Saúde da Mulher, Pediatria/Neuroped e Clínica Geral por padrão — editáveis),
  cada uma com quatro estados visíveis:
  1. **Aguardando na Tenda**
  2. **Na Porta** (buffer de 2–3 pacientes chamados)
  3. **Em Consulta com o Médico**
  4. **Finalizados** — histórico somente para consulta de quem já concluiu
     aquela especialidade; não possui botões de movimentação.
- A Visão Geral também inclui **Circuitos Finalizados**, reunindo pacientes que
  concluíram todas as especialidades previstas, com pulseira/ID, horário de
  conclusão e tempo total. O painel é **recolhível** e lembra no navegador se
  foi deixado aberto ou fechado; o contador superior **Circuito Completo** usa
  essa mesma regra. Esses pacientes não entram mais no número de **Na Tenda**.
- Cada card de paciente mostra nome, pulseira/ID, especialidades paralelas,
  tempo na etapa atual e tempo total de espera.
- Um botão por etapa move o paciente pela fila (Chamar para Porta → Entrou na
  Consulta → Concluir Atendimento), com opção de devolvê-lo à Tenda em caso de
  engano.
- Ao **concluir atendimento**, médico ou auxiliar recebe uma decisão orientada
  pelo restante do circuito: liberar o paciente quando não há outra
  especialidade pendente; orientar retorno à Tenda; ou, quando não houver
  **outro** paciente aguardando na Tenda de uma especialidade pendente, sugerir
  encaminhamento direto para a porta dela. A sugestão exige confirmação humana;
  ela nunca movimenta o paciente automaticamente.
- Quando um paciente está em atendimento em outra especialidade, o card mostra
  o conflito e bloqueia a chamada concorrente.
- Busca rápida por nome ou número de pulseira na barra inferior.

### Papéis no fluxo

| Papel | Ação no app |
|---|---|
| **Volante** | Organiza a Tenda e move o paciente de **Aguardando** para **Na Porta** (seguindo a regra de intercalação 1:1 entre preferenciais e gerais). |
| **Médico ou auxiliar da especialidade** | Confirma **Entrou na Consulta**, conclui o atendimento e decide/explica o próximo destino físico do paciente. |
| **App** | Mostra pendências por especialidade e sugere retorno à Tenda, porta direta ou liberação, sempre para confirmação humana. |

> A condição “sem outro paciente aguardando” considera a fila da Tenda da
> especialidade pendente, sem contar o próprio paciente que acabou de concluir
> outra consulta. Antes de encaminhar direto, a equipe ainda deve confirmar que
> a porta está apta a recebê-lo.

### Gestão de Pacientes Preferenciais (Intercalação 1:1)

- **Identificação Visual:** Pacientes prioritários (idosos, gestantes, PCDs, crianças de colo) recebem o badge `⭐ Preferencial` com destaque visual em seus cards, no modal de busca e nos circuitos finalizados.
- **Intercalação na Fila da Tenda:** A lista de espera da Tenda organiza automaticamente a chamada alternando **1 paciente preferencial para 1 paciente geral** (preservando o FIFO de cada categoria). Isso garante prioridade de atendimento sem causar a inanição (*starvation*) dos pacientes gerais.
- **Contador em Tempo Real:** O cabeçalho da coluna da Tenda exibe o número de pacientes preferenciais aguardando (ex: `⭐ 2 pref`).

### Aba "Temporizador Ver Magia"

Controle simples de tempo por paciente para o atendimento de Oftalmologia
(Ver Magia): 1º toque marca 5 minutos (colírio), 2º toque marca 30 minutos
(espera de dilatação), 3º toque reseta.

## Dados de demonstração

O app contém **72 pacientes inteiramente fictícios** (`SAS-101` a `SAS-172`) para simular uma expedição já em andamento:

- **60 pacientes ativos** (`SAS-101` a `SAS-160`): 30 têm 1 especialidade, 18 têm 2, 9 têm 3 e 3 têm 4. Exatamente 9 (15% dos ativos) iniciam o mockup já ocupados em uma fila enquanto aguardam outra; esses conflitos são distribuídos por toda a base.
- **12 circuitos já concluídos** (`SAS-161` a `SAS-172`): 6 têm 1 especialidade, 3 têm 2, 2 têm 3 e 1 tem 4. Eles chegam com os tempos de cada etapa e o horário de conclusão registrados, preenchendo os históricos por especialidade e o painel **Circuitos Finalizados**.

Use **Recarregar Dados Demo** em Configurações para reiniciar esse cenário e
seus cronômetros. Não use esses dados como registro clínico.

## Configurações

- **Tema** claro/escuro/automático.
- **Especialidades & Paleta de pulseiras** — gerencie a equipe e as cores da operação:
  - **Paleta central:** adicione novas cores pelo seletor de espectro, edite códigos existentes ou remova cores não utilizadas. Ao editar uma cor, as especialidades associadas são atualizadas conjuntamente.
  - **Especialidades do dia:** marque especialidades como *Presente* ou *Ausente* de acordo com a escala dos profissionais no mutirão (especialidades ausentes sem fila pendente ficam ocultas na visão geral); adicione novas especialidades personalizadas (com ícone/emoji e cor da paleta); edite nomes ou ícones; e remova especialidades que não possuam pacientes vinculados.
- **Armazenamento local** — comportamento padrão. Sem URL de integração, cada
  aparelho mantém sua própria cópia no `localStorage` e funciona offline.
- **Sincronização com a Fila Operacional** — o front-end já está implementado,
  porém fica **desativado por padrão** enquanto não houver URL configurada.
  O endpoint precisa ser oficial, autorizado e seguro; nunca use a Planilha
  Master nesse campo. Veja [`google-apps-script/README.md`](google-apps-script/README.md)
  antes de habilitar essa etapa.
- Recarregar dados de demonstração / limpar tudo.

## Status da integração com Google Sheets

O repositório contém um protótipo de backend em Apps Script, mas **não possui
uma URL oficial de produção configurada**. A integração anônima do protótipo
não deve receber dados reais ou identificáveis. A Fila Operacional deve ser
separada da Master, privada e protegida por um modelo de acesso validado antes
do uso em campo.

## Como funciona por baixo dos panos

- HTML/CSS/JS puro, em um único arquivo (`index.html`), sem dependências de
  build.
- Estado guardado no `localStorage` do navegador até que uma integração segura
  seja deliberadamente configurada.
- Publicado via GitHub Pages a partir da branch `master`.

## Estrutura do repositório

```
index.html              o aplicativo inteiro
google-apps-script/      protótipo de backend para uma Fila Operacional separada
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
