# Migração anexos canal pronto

Projeto para migrar todos os anexos do canal pronto (relatos,informacoes_adicionais,apuração).

Gera arquivo zipado na pasta /opt/migrate/ com todos os anexos dos protocolos do cliente passado por parametro.

Para executar o script:

- yarn start

modificar sempre o shema no package.json Exemplo:

- yarn start --schema={_d82e5b09_f46b_4857_b8e3_9c456dc2f422}
