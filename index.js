require('dotenv').config();

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const archiver = require('archiver');
const yargs = require('yargs');
const pgp = require('pg-promise')();

const { DB_HOST,DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, isLocal, UNIX_USERNAME } = process.env;

const db = pgp(`postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`);

// Parse command-line arguments
const argv = yargs.argv;

const SQL = `
    SELECT
        c.protocol as PROTOCOLO,
        array_to_string(array_agg(DISTINCT c.id), '') AS "id_relato",
        array_to_string(array_agg(DISTINCT '/var/www/html/case_light/public/storage/complaint-conclusion/' || c.id),',') AS "PATH_apuracao",
        array_to_string(array_agg(DISTINCT '/var/www/html/case_light/storage/app/complaints/' || c.protocol),',') AS "PATH_anexos_relato"
    FROM ${argv.schema}.complaints c
        INNER JOIN ${argv.schema}.complaint_additional_informations ai ON ai.complaint_id = c.id
    GROUP BY PROTOCOLO
    ORDER BY c.protocol
`;

const targetSchemaDir = `${__dirname}/migrations/${argv.schema}`;
const complaintDir = `${__dirname}/public/storage/complaint-conclusion`;

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

const makeTargetDir = async (path) => {  
    if (!fs.existsSync(path)) {      
        fs.mkdir(path, { recursive: true }, (err) => {
          if(err) throw console.log('Erro ao criar diretório de migração' + err);
          console.log(`Diretorio de migração criado: ${path}`);
        });    
    }  
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

const replaceBasePath = (path, isInvestigation) => {
  if(isInvestigation) {
    return path.replace(
        '/var/www/html/case_light/public/storage/complaint-conclusion/',
        `/home/${UNIX_USERNAME}/Documents/Projects/case-light-backend/public/storage/complaint-conclusion/`
    );
  } 

  return path.replace(
    '/var/www/html/case_light/storage/app/complaints/',
    `/home/${UNIX_USERNAME}/Documents/Projects/case-light-backend/storage/app/complaints/`
  );

};

const makeInvestigationTree = (investigationAttachments) => {
  return new Promise((resolve, reject) => {
    let targetDir = '';
    investigationAttachments.map((item,value) => {
        const { protocolo , PATH_apuracao } = item;
        let localPath = '';
        
        targetDir = `${targetSchemaDir}/${protocolo}/apuracao`;
        makeTargetDir(targetDir);

        if(isLocal) {
          localPath = replaceBasePath(PATH_apuracao,true);
        }

        const workDir = (isLocal) ? localPath : PATH_apuracao;        
        const zipFileName = `${protocolo}.zip`;
        const zipFilePath = path.join(targetDir, zipFileName);

        isDirectory(workDir).then(async (_) => {
          await zipDirectory(workDir,zipFilePath);
          resolve("InvestigationAttachments successful compressed.")
        }).catch((err) => {
          reject(err);
        });        
    });
  })
}

const makeReportTree = (reportAttachment) => {
  return new Promise((resolve, reject) => {
    let targetDir = '';
    reportAttachment.map((item,value) => {
        const { protocolo , PATH_anexos_relato } = item;
        let localPath = '';
        
        targetDir = `${targetSchemaDir}/${protocolo}/relatos`;
        makeTargetDir(targetDir);

        if(isLocal) {
          localPath = replaceBasePath(PATH_anexos_relato);
        }

        const workDir = (isLocal) ? localPath : PATH_anexos_relato;        
        const zipFileName = `${protocolo}.zip`;
        const zipFilePath = path.join(targetDir, zipFileName);

        isDirectory(workDir).then(async (_) => {
          await zipDirectory(workDir,zipFilePath);
          resolve("reportAttachment successful compressed.")
        }).catch((err) => {
          reject(err);
        });        
    });
  })
}

const gzipPaths = async (filePaths) => {
  await makeInvestigationTree(filePaths.anexos_apuracao);
  // await makeReportpreplaceBasePathrotocoloTree(filePaths.anexos_relatos);
}

const filePaths = {
  'anexos_apuracao' : [],
  'anexos_relatos' : []
};

db.query(SQL)
  .then((data) => {
    data.map((item,value) => {
      const {protocolo,PATH_apuracao,PATH_anexos_relato} = item;
      filePaths['anexos_apuracao'].push({protocolo, PATH_apuracao});
      filePaths['anexos_relatos'].push({protocolo,PATH_anexos_relato});
    })  
  })
  .then(async () => {    
    await gzipPaths(filePaths);
  })
.catch((error) => {
    console.log('ERROR:', error)
})