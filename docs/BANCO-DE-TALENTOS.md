# Banco de Talentos

Uma vaga de **Banco de Talentos** é um guarda-chuva: em vez de ser de uma área só,
ela deixa o próprio candidato dizer **de qual área ele é** e **qual cargo busca** —
e o formulário se adapta, mostrando só as perguntas daquela área.

Um link só (`/aplicar/:jobId`) serve para todo mundo.

---

## O que o candidato vê

1. **Banco de Talentos** (título da etapa, editável)
2. **Área de interesse** — lista suspensa (Comercial, Operações, Relacionamento, Marketing, Tecnologia, Financeiro)
3. **Cargo(s) de interesse** — campo livre, ele escreve (ex: "Analista Júnior")
4. As etapas seguintes mudam conforme a área escolhida.

Quem escolher **Tecnologia** responde as perguntas de Tecnologia. Quem escolher
**Comercial** responde as de Comercial. Ninguém responde as duas.

---

## Como criar

Em **Vagas → Nova Vaga**:

1. Dê um título (ex: "Banco de Talentos") e escolha a Área (uso interno, para organizar a listagem).
2. Marque **"É um Banco de Talentos"**.
3. Marque as **áreas oferecidas ao candidato**. Nenhuma marcada = todas são oferecidas.

Tudo isso continua editável depois, em **Configurar Vaga → Banco de Talentos**.

---

## Como as perguntas mudam por área

Cada bloco da biblioteca pode ter uma **Área**:

| Área do bloco | Quem responde |
|---|---|
| *(vazio)* — "Todas as áreas" | Todo candidato (ex: Dados Básicos, Currículo, Fit Cultural) |
| Comercial, Tecnologia, ... | Só quem escolheu aquela área |

Definida em dois lugares:

- **Configurações → Biblioteca de Blocos → Área** — vale para todas as vagas que usarem o bloco.
- **Configurar Vaga → Blocos da Vaga → "Este bloco aparece para"** — só nessa vaga.

Ao adicionar um bloco da biblioteca a uma vaga, a área dele vem junto.

### Peso

Numa vaga comum os pesos somam 100%. Num banco de talentos **cada área** precisa
fechar 100% — a soma geral não significa nada, porque ninguém responde tudo.
A tela mostra o peso de cada área (blocos comuns + blocos da área) e marca em
vermelho a que não fechar.

O score final já é calculado só sobre as etapas que o candidato realmente
respondeu, então ninguém é penalizado por não responder a área dos outros.

---

## Onde o recrutador vê a escolha

Na ficha do candidato: **Área de interesse** e **Cargo de interesse**.
A análise de currículo pela IA também usa o cargo/área que a pessoa escolheu,
em vez do título administrativo da vaga.

---

## Áreas ficam no banco

A lista de áreas vive na tabela `areas` — não está escrita no código. Para
adicionar uma área nova (ex: "Jurídico"), basta inserir a linha; ela aparece
sozinha nos seletores, sem precisar de deploy.

```sql
insert into public.areas (name, sort_order) values ('Jurídico', 7);
```

Renomear uma área propaga para os blocos automaticamente (`on update cascade`).
As perguntas de cada área também vivem no banco (`block_template_questions`) e
são editáveis pela tela de Configurações.

---

## Ordem de instalação (importante)

**Aplique a migration ANTES de subir o site.** O seletor de áreas lê a tabela
`areas`; sem ela, a criação de vagas fica sem opções de área.

```bash
supabase db push   # aplica 20260715120000_banco_de_talentos.sql
```

A migration é aditiva: vagas existentes ficam com `is_talent_pool = false` e
continuam funcionando exatamente como antes.
