var fs = require('fs')

var ssl = {}
ssl.key = fs.readFileSync('/path/to/server.key')
ssl.cert = fs.readFileSync('/path/to/server.crt')
ssl.ca = [].map(function (val) {
  return fs.readFileSync(val)
})

exports.ssl = ssl
exports.port = process.env.PORT || 80
exports.ssl_port = process.env.SSL_PORT || 443
exports.hostname = process.env.HOSTNAME || 'yoursecondphone.co'
