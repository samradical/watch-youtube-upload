require('dotenv').config()
var path = require('path')
var fs = require('fs')
var watch = require('node-watch');
const exec = require('child_process').exec

const SUPPORTED_FORMATS = [".mov", ".mpeg4", ".mp4", ".avi", ".wmv", ".mpegps", ".flv", ".3gpp", ".webm", ".mkv"]

function uploadVideo(filePath) {
  const { PRIVACY, CLIENT_SECRETS, DELETE_AFTER_UPLOAD } = process.env;
  const { name, base } = path.parse(filePath)
  const cmd = `youtube-upload --title="${name}" --privacy=${PRIVACY} --credentials-file=credentials.json --client-secrets=${CLIENT_SECRETS} "${filePath}"`

  exec(cmd, function(err, stdout, stderr) {

    //a video id
    if(stdout.indexOf(" ") < 0){
      if(Boolean(DELETE_AFTER_UPLOAD)){
        fs.unlinkSync(filePath)
      }
    }
  });

}

watch(process.env.DOWNLOAD_DIR, { recursive: true }, function(evt, name) {
  switch (evt) {
    case 'created':
    case 'update':
      const ext = path.parse(name).ext;
      if (SUPPORTED_FORMATS.indexOf(ext) > -1) {
        uploadVideo(name)
      }
      break;
  }
});
