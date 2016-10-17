//const fs=require("fs");


// based on http://wiki.vg/SMP_Map_Format#Format
// testing data from https://download.rom1504.fr/minecraft/chunks/chunks-1.9/
// see http://lunarco.de/minecraft/chunks/ for explanations
// also see https://gist.github.com/Gjum/0375b643ec13a42ab3c0
// and https://github.com/SpockBotMC/SpockBot/blob/0535c31/spockbot/plugins/tools/smpmap.py



/*const data=JSON.parse(fs.readFileSync('./packet_-10_-1.data'));
const chunk=fs.readFileSync('./chunk_-10_-1.dump');*/
const ProtoDef=require('protodef').ProtoDef;



function readLongToByte(buffer,offset,typeArgs) {
  var results = this.read(buffer, offset, typeArgs.type, {});
  return {
    value:Math.ceil(results.value*8),
    size:results.size
  };
}

function writeLongToByte(value, buffer,offset,typeArgs) {
  if (value % 8 !== 0)
    throw new Error("Invalid buffer length, should be a multiple of 8");
  return this.write(value/8, buffer, offset, typeArgs.type, {});
}

function sizeOfLongToByte(value, typeArgs) {
  if (value % 8 !== 0)
    throw new Error("Invalid buffer length, should be a multiple of 8");
  return this.sizeOf(value/8, typeArgs.type, {});
}

const longToByte=[readLongToByte,writeLongToByte,sizeOfLongToByte];

const p=["container",[
  {
    "name":"bitsPerBlock",
    "type":"u8"
  },
  {
    "name":"palette",
    "type":["array",{
      "type":"varint",
      "countType":"varint"
    }]
  },
  {
    "name":"blockData",
    "type":["buffer",{
      "countType":"longToByte",
      "countTypeArgs":{"type":"varint"}
    }]
  },
  {
    "name":"blockLight",
    "type":["buffer",{
      "count":16*16*16/2
    }]
  }, // Only if in the overworld.... URGH
  {
    "name":"skyLight",
    "type":["buffer",{
      "count":16*16*16/2
    }]
  }
]];

const proto=new ProtoDef();
proto.addType('longToByte',longToByte);
proto.addType('section',p);

module.exports = proto
/*
function readSection(section)
{
  try {
    return proto.read(section, 0, 'section', {});
  }
  catch(e) {
    e.message=`Read error for ${e.field} : ${e.message}`;
    throw e;
  }
}


console.log(chunk);
console.log(data);

console.log(readChunk(chunk,data['bitMap']));


function readChunk(chunk,bitMap)
{
  let offset=0;
  let biomes;
  let sections={};
  for(let y=0;y<16;y++)
  {
    if(((bitMap>> y ) & 1) == 1) {
      const {size,value} = readSection(chunk.slice(offset));
      offset+=size;
      sections[y]=value;
    }

    biomes=chunk.slice(offset,offset+256);
  }
  return {sections,biomes};
}
*/
