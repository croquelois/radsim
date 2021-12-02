const execSync = require('child_process').execSync;
let g_keys = {};

function exec(cmd){
  console.log(cmd);
  let out = ""+execSync(cmd)
  console.log(out);
  return out;
}

function reset(){
  exec("resim reset");
  g_keys = {};
}

function parse(txt, type, uniqueKey){
  let lines = txt.split("\n");
  let nb = 0;
  let i = 0;
  for(;i<lines.length;i++){
    let line = lines[i];
    if(line.startsWith(type + ":")){
      nb = parseInt(line.split(":")[1]);
      break;
    }
  }
  let ret = {};
  while(nb--){
    let line = lines[++i].split(":");
    let key = line[0].substr(3);
    let value = line[1].trim();
    if(uniqueKey){
        ret[key] = value;
    }else{
      if(!ret[key])
        ret[key] = [];
      ret[key].push(value);
    }
  }
  return ret;
}

function retrievePublicKey(txt){
  return txt.split("\n").filter(line => line.startsWith("Public key: ")).map(line => line.split(":")[1].trim());
}

function parseNewEntities(txt){
  return parse(txt, "New Entities");
}

function parseMetadata(txt){
  return parse(txt, "Metadata", true);
}

function getMetaData(addr){
  return parseMetadata(exec("resim show " + addr));
}

function getTheExpected(entities, type, out){
  if(!entities[type] || entities[type].length != 1){
    if(out){
      console.log(out);
    }else{
      console.log(entities);
    }
    throw new Error("Expecting one '" + type + "' to be returned");
  }
  return entities[type][0];
}

function newAccount(){
  let out = exec("resim new-account");
  let entities = parseNewEntities(out);
  let addr = getTheExpected(entities, "Component", out);
  g_keys[addr] = retrievePublicKey(out);
  return addr;
}

function newTokenFixed(nb){
  let out = exec("resim new-token-fixed " + nb);
  let entities = parseNewEntities(out);
  return getTheExpected(entities, "ResourceDef", out);
}

function newTokenMutable(minter){
  let out = exec("resim new-token-mutable " + minter);
  let entities = parseNewEntities(out);
  return getTheExpected(entities, "ResourceDef", out);
}

function newBadgeFixed(nb){
  let out = exec("resim new-badge-fixed " + nb);
  let entities = parseNewEntities(out);
  return getTheExpected(entities, "ResourceDef", out);
}

function newBadgeMutable(minter){
  let out = exec("resim new-badge-mutable " + minter);
  let entities = parseNewEntities(out);
  return getTheExpected(entities, "ResourceDef", out);
}

function mint(supply, resourceDef, minter){
  exec("resim mint " + supply + " " + resourceDef + " " + minter);
}

function transfer(amount,resourceDef,recipient){
  exec("resim transfer " + amount + " " + resourceDef + " " + recipient);
}

function setDefaultAccount(addr){
  exec("resim set-default-account " + addr + " " + g_keys[addr]);
}

function publish(path){
  let out = exec("resim publish " + (path || "."));
  let entities = parseNewEntities(out);
  return getTheExpected(entities, "Package", out);
}

function callFunction(pkg, blueprint, fctName, args){
  let cmd = "resim call-function " + pkg + " " + blueprint + " " + fctName + " " + args.join(" ");
  let out = exec(cmd);
  return parseNewEntities(out);
}

function callMethod(component, methodName, args){
  let cmd = "resim call-method " + component + " " + methodName + " " + args.join(" ");
  let out = exec(cmd);
  return parseNewEntities(out);
}

const initialEpoch = Date.now();
function setCurrentEpoch(){
  let epoch = Math.floor((Date.now() - initialEpoch)/1000);
  exec("resim set-current-epoch " + epoch);
  return epoch;
}

function show(addr){
  return exec("resim show " + addr);
}

function showLedger(){
  return exec("resim show-ledger");
}

function getEntitiesWhichMatchTheMetadata(entities, type, key, value){
  if(!entities[type]){
    console.log(entities);
    throw new Error("no entities of type '" + type + "'");
  }
  let ret = entities[type]
    .map(addr => ({addr, metadata: getMetaData(addr)}))
    .filter(entity => entity.metadata[key] == value);
  if(ret.length > 1){
    console.log(ret);
    throw new Error("was expecting a single entity to match, found multiples");
  }
  if(!ret.length){
    console.log(entities);
    throw new Error("no matching entities found");
  }
  return ret[0];
}

module.exports = {
  reset,
  newAccount,
  newTokenFixed,
  newTokenMutable,
  newBadgeFixed,
  newBadgeMutable,
  mint,
  transfer,
  setDefaultAccount,
  publish,
  callFunction,
  callMethod,
  setCurrentEpoch,
  show,
  showLedger,
  getTheExpected,
  getEntitiesWhichMatchTheMetadata
}
