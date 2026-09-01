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
  cada uma com sua fila dividida em 3 etapas:
  1. **Aguardando na Tenda**
  2. **Na Porta** (buffer de 2–3 pacientes chamados)
  3. **Em Consulta com o Médico**
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
| **Volante** | Organiza a Tenda e move o paciente de **Aguardando** para **Na Porta**. |
| **Médico ou auxiliar da especialidade** | Confirma **Entrou na Consulta**, conclui o atendimento e decide/explica o próximo destino físico do paciente. |
| **App** | Mostra pendências por especialidade e sugere retorno à Tenda, porta direta ou liberação, sempre para confirmação humana. |

> A condição “sem outro paciente aguardando” considera a fila da Tenda da
> especialidade pendente, sem contar o próprio paciente que acabou de concluir
> outra consulta. Antes de encaminhar direto, a equipe ainda deve confirmar que
> a porta está apta a recebê-lo.

### Aba "Temporizador Ver Magia"

Controle simples de tempo por paciente para o atendimento de Oftalmologia
(Ver Magia): 1º toque marca 5 minutos (colírio), 2º toque marca 30 minutos
(espera de dilatação), 3º toque reseta.

## Dados de demonstração

O app contém **60 pacientes inteiramente fictícios** (`SAS-101` a `SAS-160`). A composição diminui conforme cresce o número de especialidades: 30 pacientes têm 1, 18 têm 2, 9 têm 3 e 3 têm 4 especialidades. Exatamente 9 pacientes (15%) iniciam o mockup já ocupados em uma fila enquanto aguardam outra; esses conflitos são distribuídos por toda a base, não concentrados no início.

Use **Recarregar Dados Demo** em Configurações para reiniciar esse cenário e
seus cronômetros. Não use esses dados como registro clínico.

## Configurações

- **Tema** claro/escuro/automático.
- **Cores das pulseiras** de cada especialidade, personalizáveis.
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
