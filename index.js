require('dotenv').config();

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const yargs = require('yargs');
const pgp = require('pg-promise')();

// Parse command-line arguments
const argv = yargs.argv;

const { DB_HOST,DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, CASE_LIGHT_PATH } = process.env;
const db = pgp(`postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`);

const SQL = `
    SELECT
        c.protocol as PROTOCOLO,
        array_to_string(array_agg(DISTINCT c.id), '') AS "id_relato",
        array_to_string(array_agg(DISTINCT '${CASE_LIGHT_PATH}/public/storage/complaint-conclusion/' || c.id),',') AS "PATH_apuracao",
        array_to_string(array_agg(DISTINCT '${CASE_LIGHT_PATH}/storage/app/complaints/' || c.protocol),',') AS "PATH_anexos_relato"
    FROM ${argv.schema}.complaints c
    GROUP BY PROTOCOLO
    ORDER BY c.protocol
`;

const targetSchemaDir = `${__dirname}/migrations/${argv.schema}`;

function isDirectory(pathToCheck) {
  return new Promise((resolve,reject) => {
    fs.stat(pathToCheck, (err, stats) => {
      if(err) {
        return reject(`O diretório ${pathToCheck} não foi encontrado.`);
      }
      return resolve(true)
    });  
  });
  
}

const makeTargetDir = (path) => {
  return new Promise((resolve,reject) => {
    if (!fs.existsSync(path)) {      
      fs.mkdirSync(path, { recursive: true }, (err) => {
        if(err) reject('Erro ao criar diretório de migração' + err.message);
        console.log(`Diretorio de migração criado: ${path}`);
        resolve(true)
      });    
    }
    resolve(true);
  });  
}

async function zipDirectory(sourceDir, zipFilePath) {
  return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(zipFilePath));
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false); // Add all files in the directory to the zip
      archive.finalize();      
  });
}

const makeDir = async (protocol,suffix) => {      
    return new Promise((resolve,_) => {
      let targetDir = '';
                
      targetDir = `${targetSchemaDir}/${protocol}/${suffix}`;
      const hasCreated = makeTargetDir(targetDir);      

      return resolve({
        created: hasCreated,
        targetDir
      });      
    });
}


const makeAttachmentFiles = (investigationAttachments, suffix) => {  
  return investigationAttachments.map(async (item,_) => { 
    const { protocolo, work_path } = item;
    const { targetDir } = await makeDir(protocolo,suffix);

    return new Promise((resolve, reject) => {      
      const zipFileName = `${protocolo}.zip`;        
      const zipFilePath = path.join(targetDir, zipFileName);      
    
      isDirectory(work_path).then(async (_) => {
        zipDirectory(work_path,zipFilePath);
      }).catch((err) => {
        console.log("Diretorio não existe");
        console.log(err);
        reject(err);
      });        
    });
  });
}

const gzipReports = async (reports) => {
  const suffix = 'relatos';
  return Promise.all([makeAttachmentFiles(reports,suffix)]);
}

const gzipInvestigations = async (apuracoes) => {
  const suffix = 'apuracao';
  return Promise.all([makeAttachmentFiles(apuracoes,suffix)]);
}

const filePaths = {
  'anexos_apuracao' : [],
  'anexos_relatos' : []
};

db.query(SQL)
  .then((data) => {
    data.map((item,value) => {
      const { protocolo, PATH_apuracao, PATH_anexos_relato } = item;
  
      filePaths['anexos_apuracao'].push({protocolo, work_path: PATH_apuracao});
      filePaths['anexos_relatos'].push({protocolo, work_path: PATH_anexos_relato});
    })  
  })
  .then(async () => {        
    await gzipInvestigations(filePaths.anexos_apuracao);
  }).finally(async () => {
    await gzipReports(filePaths.anexos_relatos);
  })
.catch((error) => {
    console.log('ERRO ao efetuar migração:', error);
})