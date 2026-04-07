# Guia de configuração e teste da feature de live

Este guia cobre o que precisa ser configurado fora do código para testar a funcionalidade de transmissão ao vivo com AWS IVS + OBS.

## 1. Aplicar a migration no banco

Antes de testar no app, aplique a migration que adiciona a tabela `lesson_live_sessions` e habilita o tipo `live` em `lessons.type`.

Arquivo:

- `supabase/migrations/20260407000100_add_lesson_live_sessions.sql`

Se vocês usam Supabase CLI:

```bash
supabase db push
```

Se aplicam manualmente, executem o SQL da migration no projeto Supabase.

## 2. Confirmar permissões AWS

As credenciais AWS já usadas pelo backend precisam conseguir chamar:

- Amazon IVS `CreateChannel`
- Amazon IVS `GetStreamKey`
- Amazon IVS `GetStream`
- Amazon IVS `StopStream`

Permissões mínimas sugeridas para a IAM user/role usada pelo backend:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ivs:CreateChannel",
        "ivs:GetStreamKey",
        "ivs:GetStream",
        "ivs:StopStream"
      ],
      "Resource": "*"
    }
  ]
}
```

## 3. Configurar gravação automática no AWS IVS

A gravação da live agora é tratada como padrão no sistema. Para o replay funcionar depois do término, vocês precisam criar uma Recording Configuration no Amazon IVS apontando para um bucket S3.

Passos no console AWS:

1. Acesse `Amazon IVS`.
2. Entre em `Recording configurations`.
3. Crie uma nova configuração.
4. Escolha o bucket S3 de destino.
5. Copie o ARN da Recording Configuration.

Depois, no arquivo `backend/.env`, preencham:

```env
AWS_IVS_REGION=sa-east-1
AWS_IVS_ENDPOINT=https://ivs.sa-east-1.amazonaws.com
AWS_IVS_LATENCY_MODE=LOW
AWS_IVS_CHANNEL_TYPE=STANDARD
AWS_IVS_RECORDING_CONFIGURATION_ARN=cole-aqui-o-arn-da-recording-configuration
```

Observação:

- Sem `AWS_IVS_RECORDING_CONFIGURATION_ARN`, a transmissão ao vivo ainda sobe, mas o replay automático não fica garantido.
- O sistema agora marca a live como gravável por padrão.

## 4. Subir backend e frontend

Em desenvolvimento:

```bash
cd backend
npm run start:dev
```

```bash
cd frontend
npm run dev
```

## 5. Criar uma aula ao vivo no painel do professor

No app:

1. Entre em `Professor > Minha área > [área]`.
2. Abra um módulo.
3. Clique em `Nova aula`.
4. Escolha o tipo `Ao vivo`.
5. Informe o título.
6. Defina a data e horário da live.
7. Salve.

Depois:

1. Abra `Editar` na aula criada.
2. Clique em `Preparar`.
3. O sistema vai criar o canal no AWS IVS.
4. O painel vai exibir:
   - `Servidor`
   - `Stream key`

Como a gravação é padrão, esse canal já deve nascer vinculado à Recording Configuration do IVS.

## 6. Configurar o OBS

No OBS Studio:

1. Abra `Configurações`.
2. Vá em `Transmissão`.
3. Em `Serviço`, selecione `Custom...`.
4. Em `Servidor`, cole o campo `Servidor` mostrado no painel da aula.
5. Em `Chave de transmissão`, cole a `Stream key`.
6. Salve.

Configuração de vídeo recomendada para o primeiro teste:

- Resolução de saída: `1280x720`
- FPS: `30`
- Encoder: `x264` ou hardware encoder disponível
- Bitrate de vídeo: `2500 a 4000 kbps`
- Bitrate de áudio: `128 kbps`

## 7. Iniciar um teste ponta a ponta

Fluxo recomendado:

1. Deixe a aula ao vivo aberta no painel do professor.
2. Entre também com uma conta de aluno assinante da área.
3. No aluno, abra a área de membros e navegue até o módulo da live.
4. No OBS, clique em `Iniciar transmissão`.
5. Volte ao painel do professor e clique em `Atualizar`.
6. Confirme que o status mudou para `Transmitindo agora`.
7. No aluno, recarregue a aula ou reabra a live.
8. Verifique se o player começou a tocar a transmissão.

## 8. O que validar no teste

Checklist mínimo:

- O professor consegue criar uma aula do tipo `Ao vivo`.
- A data e horário aparecem salvos.
- O professor consegue preparar a live e copiar os dados do OBS.
- O aluno visualiza a aula agendada dentro da área de membros.
- Quando a transmissão começa, o aluno consegue assistir pelo player.
- O status muda corretamente entre `Agendada`, `Pronta para OBS`, `Transmitindo agora` e `Encerrada`.

## 9. Encerrar a live

Ao terminar:

1. No OBS, clique em `Encerrar transmissão`.
2. No painel do professor, clique em `Atualizar`.
3. Se precisar forçar o encerramento lógico no sistema, use `Encerrar`.

Após isso, o AWS IVS conclui a gravação no bucket configurado. Dependendo do tempo da live, os arquivos podem levar alguns instantes para aparecer.

## 10. Problemas comuns

### A live não entra no ar no app

Verifique:

- se o OBS está com o `Servidor` correto
- se a `Stream key` é exatamente a exibida
- se a região da AWS usada no backend está correta
- se a conta AWS tem permissão para IVS

### O aluno vê a aula, mas não toca vídeo

Verifique:

- se o status da live já está como `Transmitindo agora`
- se a transmissão realmente foi iniciada no OBS
- se a área do aluno está com assinatura ativa

### Erro ao preparar a live

Verifique:

- credenciais AWS válidas
- permissões IAM para IVS
- conectividade do backend até a AWS
- `AWS_IVS_RECORDING_CONFIGURATION_ARN` preenchido corretamente

## 11. Importante sobre replay

O canal já nasce com gravação ligada por padrão, mas o `replay_url` ainda depende de como vocês vão expor os arquivos gravados do bucket.

Hoje o fluxo está assim:

- a live é criada com gravação habilitada por padrão
- o AWS IVS grava no S3 se a Recording Configuration estiver configurada
- o app já está pronto para priorizar `replay_url` quando esse endereço for persistido

Se vocês quiserem fechar o replay 100% automático no produto, o próximo passo ideal é adicionar:

- evento/webhook para detectar fim da gravação
- rotina para descobrir o manifesto/arquivo gravado
- persistência automática do `replay_url` na `lesson_live_sessions`

## 12. Melhorias recomendadas depois do primeiro teste

Depois que o fluxo principal estiver validado, vale adicionar:

- atualização automática de status via eventos da AWS
- countdown no player do aluno
- aviso/banner de live próxima na área de membros
- chat ao vivo dedicado por aula
