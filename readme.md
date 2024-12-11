# Migração anexos canal pronto

Projeto para migrar todos os anexos do canal pronto (relatos,informacoes_adicionais,apuração).

Gera arquivo zipado na pasta /opt/migrate/ com todos os anexos dos protocolos do cliente passado por parametro.

Para executar o script:

- yarn start

modificar sempre o shema no package.json Exemplo:

- yarn start --schema={_d82e5b09_f46b_4857_b8e3_9c456dc2f422}

Sempre modificar o .env com os apontamentos segundo o ambiente


# Instalação

cd /opt 

git clone [git@github.com](mailto:git@github.com):ChristianGalloicts/case-light-attachment-migrate.git

chmod 777 -R case-light-attachment-migrate

cd case-light-attachment-migrate

vi .env

modificar as variaveis de ambiente de acordo com os apontos do .env do projeto case-light (/var/www/html/case-light/)

```
DB_HOST={host}
DB_DATABASE=case_light
DB_USERNAME={db_username}
DB_PASSWORD={db_password}
CASE_LIGHT_PATH=/var/www/html/case_light
```

Comentar as mesmas variáveis locais.

sudo vi package.json

Apontar para o schema do cliente para realizar a migração

(Ex: Apontar para VivSaude)

"start": "node index.js --schema _5bb7ed79_059a_455d_a462_fc6f3b0717ce”

instalar as dependências do projeto, na raiz do projeto execute

yarn

após isso let’s play

yarn start

As migrações serão geradas com a seguinte árvore de diretórios (migrations -> {schema do cliente} -> {protocolo}

```
/home/gallodev/Documents/Projects/case-light-attachment-migrate/migrations
└── _d82e5b09_f46b_4857_b8e3_9c456dc2f422
   ├── 6GILTEWZ
       ├── apuracao
          ├── 6GILTEWZ.zip
       ├── relatos
          ├── 6GILTEWZ.zip
   ├── GE69X5V4
       ├── apuracao
          ├── GE69X5V4.zip
       ├── relatos
          ├── GE69X5V4.zip
```

Os anexos das informações adicionais dos relatos são zipados dentro do próprio relato.
