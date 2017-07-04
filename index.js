require('dotenv').config()
var path = require('path')
var fs = require('fs')
var Q = require('bluebird')
var SABNZB = require('./sabnzb')
var readDir = require('readdir')
var watch = require('node-watch');
const exec = require('child_process').exec

console.log(process.env);

const SUPPORTED_FORMATS = [".mov", ".mpeg4", ".mp4", ".avi", ".wmv", ".mpegps", ".flv", ".3gpp", ".webm", ".mkv"]

const IGNORE_STRINGS = ["UNPACK", 'sample']

function uploadVideo(filePath) {
  return new Q((yes, no) => {
    const { PRIVACY, CLIENT_SECRETS, CLIENT_CREDENTIALS, DELETE_AFTER_UPLOAD } = process.env;
    const credentials = CLIENT_CREDENTIALS ? `--credentials-file=${CLIENT_CREDENTIALS}` : ""
    const { name, base } = path.parse(filePath)
    const cmd = `youtube-upload --title="${name}" --privacy=${PRIVACY} ${credentials} --client-secrets=${CLIENT_SECRETS} "${filePath}"`
    console.log(cmd);
    exec(cmd, function(err, stdout, stderr) {
      console.log(`youtube id ${stdout}`);
      //a video id
      if (stdout.indexOf(" ") < 0) {
        yes(filePath)
        SABNZB.next()
      } else {
        no(filePath)
      }
    });
  })
}

let processing = {

}

function processTrigger(name) {


  const ext = path.parse(name).ext;
  const rootDir = name.replace(process.env.DOWNLOAD_DIR, "").split(path.sep)[1]
  const containerFolder = path.join(process.env.DOWNLOAD_DIR, rootDir)

  const dlFolder = path.parse(name).dir;

  console.log("containerFolder", containerFolder);
  console.log("dlFolder", dlFolder);

  if(processing[dlFolder]) return
  processing[dlFolder] = true

  //if (fs.lstatSync(name).isDirectory()) {
  const files = readDir.readSync(dlFolder, SUPPORTED_FORMATS.map(p => (`**${p}`)), readDir.ABSOLUTE_PATHS);

  const ordered = files.map(f => ({
    file: f,
    stat: fs.lstatSync(f)
  })).sort((a, b) => (b.stat.size > a.stat.size))

  console.log(ordered);

  console.log(`Got ${name}`);

  function _uploadVideo(name) {
    return uploadVideo(name)
      .then(filePath => {
        const { dir } = path.parse(filePath)
        const { DELETE_AFTER_UPLOAD } = process.env;
        if (Boolean(DELETE_AFTER_UPLOAD)) {
          const fileToDelete = containerFolder || filePath
          exec(`rm -rf "${fileToDelete}"`, function(err, stdout, stderr) {
            console.log(`Deleted ${fileToDelete}`);
            delete processing[dlFolder]
            if (dlFolder) {
              try {
                fs.rmdir(dlFolder, function(err, data) {
                  console.log(`Deleted directory${fileToDelete}`);
                })
              } catch (e) {

              }
            }
          })
        }
      })
      .catch(err => {

      })
  }

  if(ordered.length){
    name = ordered[0].file
    _uploadVideo(name)
  }

}

let timeouts = {

}


watch(process.env.DOWNLOAD_DIR, { recursive: true }, function(evt, name) {
  switch (evt) {
    case 'update':
      const { ext, base } = path.parse(name);
      if (timeouts[base]) {
        clearTimeout(timeouts[base])
      }
      if (SUPPORTED_FORMATS.indexOf(ext) === -1) {
        console.log("rejected");
        return
      }
      console.log(name);
      if(name.indexOf('complete') < 0){
        return
      }
      timeouts[base] = setTimeout(processTrigger, 10000, name)
      break;
  }
});
