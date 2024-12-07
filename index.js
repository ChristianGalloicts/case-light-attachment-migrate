require('dotenv').config();
const yargs = require('yargs');
const pgp = require('pg-promise')();

const { DB_HOST,DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE } = process.env;
const db = pgp(`postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`);

// Parse command-line arguments
const argv = yargs.argv;

const SQL = `
    SELECT
        c.protocol as PROTOCOLO,
        array_to_string(array_agg(DISTINCT c.id), '') AS "id_relato",
        '"' || array_to_string(array_agg(DISTINCT '/var/www/html/case_light/public/storage/complaint-conclusion/' || c.id),',') || '"' AS "PATH_apuracao",
        '"' || array_to_string(array_agg(DISTINCT '/var/www/html/case_light/storage/app/complaints/' || c.protocol),',') || '"' AS "PATH_anexos_relato",
        '"' || array_to_string(array_agg(DISTINCT '/var/www/html/case_light/storage/app/complaints/' || c.protocol || '/additional_information/' || ai.id),',') || '"' AS "PATH_informacoes_adicionais"
    FROM ${argv.schema}.complaints c
        INNER JOIN ${argv.schema}.complaint_additional_informations ai ON ai.complaint_id = c.id
    GROUP BY PROTOCOLO
    ORDER BY c.protocol
`
// change to SQL when int turn on
// TODO: fetch data and find path and zip these files and store in /opt/migrate
db.one('SELECT $1,$2,$3 AS value',['"/var/www/html/case_light/public/storage/complaint-conclusion/"','"/var/www/html/case_light/storage/app/complaints/protocolo"','"/var/www/html/case_light/storage/app/complaints/protocolo/aditional_information"'])
  .then((data) => {
    console.log(data);
    console.log('DATA:', data.value)
  })
.catch((error) => {
    console.log('ERROR:', error)
})