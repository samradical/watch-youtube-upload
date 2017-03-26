const exec = require('child_process').exec
var fs = require('fs')

const SABNZB = (()=>{
  const avengers = JSON.parse(fs.readFileSync('avengers.json'))
  let INDEX = 0
  console.log(avengers);

  function next(argument) {
    exec(`sabnzb add --nzb ${avengers[INDEX]}`)
    if(INDEX < avengers.length -1){
      INDEX++
    }
  }

  return {
    next:next
  }
})()