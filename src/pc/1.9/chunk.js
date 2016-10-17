const w=16;
const l=16;
const h=256;

var { readUInt4LE, writeUInt4LE } = require('uint4');
var proto = require('./proto');

module.exports = loader;

function loader(mcVersion) {
  Block = require('prismarine-block')(mcVersion);
  Chunk.w=w;
  Chunk.l=l;
  Chunk.h=h;
  return Chunk;
}

var Block;

var exists = function (val) {
  return val !== undefined;
};


var getArrayPosition = function (pos) {
  return pos.x+w*(pos.z+l*pos.y);
};

var getBiomeCursor = function (pos) {
  return (w * l * h * 3) + (pos.z * w) + pos.x;
};

class Chunk {

  constructor() {
    this.blockData = Buffer.alloc(w * h * l * 2, 0);
    this.blockLight = Buffer.alloc(w * h * l / 2, 0);
    this.skyLight = Buffer.alloc(w * h * l / 2, 0);
    this.biomes = Buffer.alloc(w * l, 0);
  }

  initialize(iniFunc) {
    const skylight=w * l * h/2*5;
    const light=w * l * h*2;
    let biome=(w * l * h * 3)-1;
    let n=0;
    for(let y=0;y<h;y++) {
      for(let z=0;z<w;z++) {
        for(let x=0;x<l;x++,n++) {
          if(y==0)
            biome++;
          const block=iniFunc(x,y,z,n);
          if(block==null)
            continue;
          this.blockData.writeUInt16BE(block.type<<4 | block.metadata,n*2);
          writeUInt4LE(this.data, block.light, n*0.5+light);
          writeUInt4LE(this.data, block.skyLight, n*0.5+skylight);
          if(y==0) {
            this.data.writeUInt8(block.biome.id || 0, biome);
          }
        }
      }
    }
  }

  getBlock(pos) {
    var block = new Block(this.getBlockType(pos), this.getBiome(pos), this.getBlockData(pos));
    block.light = this.getBlockLight(pos);
    block.skyLight = this.getSkyLight(pos);
    return block;
  }

  setBlock(pos, block) {
    if (exists(block.type))
      this.setBlockType(pos, block.type);
    if (exists(block.metadata))
      this.setBlockData(pos, block.metadata);
    if (exists(block.biome))
      this.setBiome(pos, block.biome.id);
    if (exists(block.skyLight))
      this.setSkyLight(pos, block.skyLight);
    if (exists(block.light))
      this.setBlockLight(pos, block.light);
  }

  getBiomeColor(pos) {
    return {
      r: 0,
      g: 0,
      b: 0
    }
  }

  setBiomeColor(pos, r, g, b) {

  }

  getBlockType(pos) {
    let cursor = getArrayPosition(pos) * 2;
    return this.blockData.readUInt16BE(cursor) >> 4;
  }

  getBlockData(pos) {
    let cursor = getArrayPosition(pos) * 2;
    return this.blockData.readUInt16BE(cursor) & 15;
  }

  getBlockLight(pos) {
    var cursor = getArrayPosition(pos) * 0.5;
    return readUInt4LE(this.blockLight, cursor);
  }

  getSkyLight(pos) {
    var cursor = getArrayPosition(pos) * 0.5;
    return readUInt4LE(this.skyLight, cursor);
  }

  getBiome(pos) {
    // TODO: Make sure that's the correct order
    var cursor = pos.z * 16 + pos.x;
    return this.biomes.readUInt8(cursor);
  }

  setBlockType(pos, id) {
    var cursor = getArrayPosition(pos) * 2;
    var data = this.getBlockData(pos);
    this.blockData.writeUInt16BE((id << 4) | data, cursor);
  }

  setBlockData(pos, data) {
    var cursor = getArrayPosition(pos) * 2;
    var id = this.getBlockType(pos);
    this.blockData.writeUInt16BE((id << 4) | data, cursor);
  }

  setBlockLight(pos, light) {
    var cursor = getArrayPosition(pos) * 0.5;
    writeUInt4LE(this.blockLight, light, cursor);
  }

  setSkyLight(pos, light) {
    var cursor = getArrayPosition(pos) * 0.5;
    writeUInt4LE(this.skyLight, light, cursor);
  }

  setBiome(pos, biome) {
    var cursor = pos.z * 16 + pos.x;
    this.biomes.writeUInt8(biome, cursor);
  }

  dump() {
    var buffer = new Buffer(0);
    var i = 0;
    while (i < 16) {
      buffer = Buffer.concat([buffer, proto.createPacketBuffer('section', {
        bitsPerBlock: 16,
        palette: [],
        blockData: Buffer.alloc(16 * 16 * 16 * 2, 0),//this.blockData.slice(w * l * h * 2 * i, w * l * h * 2 * (i + 1)),
        blockLight: Buffer.alloc(16 * 16 * 16 / 2, 0),//this.blockLight.slice(w * l * h * i / 2, w * l * h * (i + 1) / 2),
        skyLight: Buffer.alloc(16 * 16 * 16 / 2, 0)//this.skyLight.slice(w * l * h * i / 2, w * l * h * (i + 1) / 2)
      })]);
      i++;
    }
    return Buffer.concat([buffer, this.biomes]);
  }

  // By default, assume bitmask is 0xffff
  load(data, bitMask = 0xffff) {
    if (!Buffer.isBuffer(data))
      throw(new Error('Data must be a buffer'));
    this.blockData = Buffer.alloc(w * l * h * 2, 0); // This way, we can make slices when dumping
    let chunkY = 0;
    let offset = 0;
    while (chunkY < 16) {
      if (bitMask & (1 << chunkY)) {
        let { size, data: decodedData } = proto.parsePacketBuffer('section', data.slice(offset));
        offset += size;
        for (let i = 0; Math.floor(i * decodedData.bitsPerBlock / 8) < decodedData.blockData.length; i++) {
          let cursorInData = Math.floor(i * decodedData.bitsPerBlock / 8);
          let startAtBit = (i * decodedData.bitsPerBlock) % 8;
          if (cursorInData >= decodedData.blockData.length - 4) {
            startAtBit += 8 * (decodedData.blockData.length - cursorInData);
            cursorInData = decodedData.blockData.length - 4;
          }
          // TODO: Get the last few bytes correctly...
          let got = (decodedData.blockData.readUInt32BE(cursorInData) << (startAtBit)) >> (startAtBit + (32 - startAtBit - decodedData.bitsPerBlock));
          if (decodedData.bitsPerBlock < 9)
            this.blockData.writeUInt16BE(got < decodedData.palette.length ? decodedData.palette[got] : 0, (i + chunkY * 16 * 16 * 16) * 2);
          else
            this.blockData.writeUInt16BE(got, (i + chunkY * 16 * 16 * 16) * 2);
        }
        decodedData.blockLight.copy(this.blockLight, chunkY * w * l * 16 * 0.5);
        decodedData.skyLight.copy(this.skyLight, chunkY * w * l * 16 * 0.5);
      }
      chunkY++;
    }
    // The rest should be the biome data...
    this.biomes = data;
  }
}
