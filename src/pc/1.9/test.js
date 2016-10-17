var Chunk = require(__dirname + '/../../../')('1.9');
var fs = require('fs');
var chunk = new Chunk();
chunk.load(fs.readFileSync(__dirname + '/../../../chunk_-5_11.dump'));
module.exports = chunk;
