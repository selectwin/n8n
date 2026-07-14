# E2E interno — n8n + mock da API Selectwin

Harness para testar o pacote de ponta a ponta no Docker Desktop, sem chave real
e sem depender da API pública: um mock fiel ao contrato (mesmas validações do
`POST /v1/webhooks` — incluindo a regra **endpoint https-only**, que o spec
público não mostra — e entregas assinadas byte a byte como o dispatcher real:
JSON canônico + `x-selectwin-signature` legado + `x-selectwin-signature-v1`).

## Rodar (fluxo feliz)

```powershell
# 1. Compilar e empacotar o plugin local para dentro da imagem do n8n
npm run build
npm pack --pack-destination e2e/n8n
Move-Item e2e/n8n/n8n-nodes-selectwin-*.tgz e2e/n8n/plugin.tgz -Force

# 2. Subir com WEBHOOK_URL https (obrigatório: a API só registra endpoints https)
cd e2e
$env:E2E_WEBHOOK_URL = 'https://n8n.e2e.local/'
docker compose build
docker compose up -d

# 3. Importar credencial + workflow e ativar (aguarde o n8n subir antes)
docker compose exec n8n n8n import:credentials --input=/fixtures/credentials.json
docker compose exec n8n n8n import:workflow --input=/fixtures/workflow.json
docker compose exec n8n n8n update:workflow --id=SwE2EWorkflow001 --active=true
docker compose restart n8n   # a ativação registra o webhook no mock

# 4. Disparar entregas e conferir
curl -X POST http://localhost:3999/_mock/fire -H "content-type: application/json" -d '{"type":"transaction.approved","mode":"both"}'
curl http://localhost:3999/_mock/state
```

Resultados esperados:

- `_mock/state` → 1 endpoint `wbe_…` registrado com o endpoint https e os eventos do workflow.
- `mode: both` e `mode: legacy` → HTTP 200 e um novo item em `echoes` (o workflow executou).
- `mode: bad` (assinatura errada) → HTTP 401 `invalid signature` e nenhum echo novo.
- `docker compose restart n8n` → reativação via `GET /v1/webhooks/{id}` sem criar duplicado.

## Reproduzir o erro de criação de webhook (http://)

Suba **sem** `E2E_WEBHOOK_URL` (`Remove-Item Env:E2E_WEBHOOK_URL`; recrie o
container). O n8n gera `http://localhost:5678/…` e a criação falha — o node
agora explica a causa e a correção (definir `WEBHOOK_URL` https no n8n) em vez
do genérico "Bad request - please check your parameters".

## Notas

- O DB do n8n fica dentro do container (sem volume): recriar o container zera
  tudo — reimporte as fixtures (passo 3).
- `DELIVERY_REWRITE_FROM/TO` no compose reescreve o host https registrado para
  o endereço interno `http://n8n:5678` na hora da entrega (rede docker).
- Endpoints de controle do mock: `POST /_mock/fire` (`mode`: `both` | `v1` |
  `legacy` | `bad`), `POST /_mock/echo`, `GET /_mock/state`, `POST /_mock/reset`.
- Encerrar: `docker compose down`.
