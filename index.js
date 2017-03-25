require('dotenv').config()
var path = require('path')
var fs = require('fs')
var Q = require('bluebird')
var readDir = require('readdir')
var watch = require('node-watch');
const exec = require('child_process').exec

console.log(process.env);

const SUPPORTED_FORMATS = [".mov", ".mpeg4", ".mp4", ".avi", ".wmv", ".mpegps", ".flv", ".3gpp", ".webm", ".mkv"]

const IGNORE_STRINGS = ["UNPACK"]

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
      } else {
        no(filePath)
      }
    });
  })
}


function processTrigger(name) {
  const ext = path.parse(name).ext;
  const containerFolder = fs.lstatSync(name).isDirectory() ? name : null

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
            if (containerFolder) {
              try {
                fs.rmdir(containerFolder, function(err, data) {
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

  if (SUPPORTED_FORMATS.indexOf(ext) > -1 && IGNORE_STRINGS.filter(ingor => (name.indexOf(ingor) > -1)).length === 0) {
    if (fs.lstatSync(name).isDirectory()) {
      setTimeout(() => {
        const files = readDir.readSync(name, SUPPORTED_FORMATS.map(p => (`**${p}`)), readDir.ABSOLUTE_PATHS);
        Q.map(files, p => {
            return _uploadVideo(p)
          }, { concurrency: 1 })
          .finally()
      }, 1000)
    } else {
      _uploadVideo(name)
    }
  }

}

let to;

watch(process.env.DOWNLOAD_DIR, { recursive: true }, function(evt, name) {
  switch (evt) {
    case 'update':
      if (to) {
        clearTimeout(to)
      }
      console.log(name);
      to = setTimeout(processTrigger, 3000, name)
      break;
  }
});
