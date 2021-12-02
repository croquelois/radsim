console.log("Server launched with the following arguments: ", process.argv);

const path = require('path');
const resim = require("./database.js");
const express = require('express');
const app = express();
const port = parseInt(process.argv[2]);

if(process.argv[4] == "reset")
  resim.reset();
resim.setCurrentEpoch();
console.log("Publishing the blueprint, it make take a while...");
let pkg = resim.publish(process.argv[3]);

const matchArgRe = new RegExp("^[0-9A-Za-z\-_,\.\+]+$");
function sanitizeArg(str){
  if(str === undefined)
    throw new Error("expecting an argument, got an undefined value");
  str = ""+str;
  if(!matchArgRe.test(str))
    throw new Error("expecting an argument, got something else: '" + str + "'");
  return str;
}

const matchOnlyNameRe = new RegExp("^[0-9A-Za-z\-_]+$");
function sanitizeName(str){
  if(str === undefined)
    throw new Error("expecting a name, got an undefined value");
  str = ""+str;
  if(!matchOnlyNameRe.test(str))
    throw new Error("expecting a name, got something else: '" + str + "'");
  return str;
}

const matchOnlyAddressRe = new RegExp("^[0-9A-Fa-f]+$");
function sanitizeAddr(str){
  if(str === undefined)
    throw new Error("expecting an address, got an undefined value");
  str = ""+str;
  if(!matchOnlyAddressRe.test(str))
    throw new Error("expecting an address, got something else: '" + str + "'");
  return str;
}

const matchOnlyNumberRe = new RegExp("^(-?(?:\\d+|\\d*\\.\\d+)(?:[E|e][+|-]?\\d+)?)$");
function sanitizeNumber(str){
  if(str === undefined)
    throw new Error("expecting a number, got an undefined value");
  str = ""+str;
  if(!matchOnlyNumberRe.test(str))
    throw new Error("expecting a number, got something else: '" + str + "'");
  return str;
}

function sanitizeArguments(args){
  if(args === undefined)
    throw new Error("expecting a list, got an undefined value");
  if(!args.map)
    throw new Error("expecting a list, got something else: '" + args + "'");
  return args.map(sanitizeArg);
}

function post(path, processor){
  app.post(path, (req,res) => {
    let epoch = resim.setCurrentEpoch();
    try {
      let ret = processor(req);
      ret.epoch = epoch;
      res.send(ret);
    }catch(ex){
      res.send({epoch, error: ex.message || "unknown error"});
    }
  });
}

app.use(express.json());

post('/new-account', () => ({account: resim.newAccount()}));
post('/new-set-default-account', (req) => {
  resim.setDefaultAccount(sanitizeAddr(req.body.addr));
  return {};
});
post('/addr/:addr', (req) => ({out: resim.show(sanitizeAddr(req.params.addr))}));
post('/addr', () => ({out: resim.showLedger()}));

post('/new-token-fixed', (req) => {
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  return {token: resim.newTokenFixed(sanitizeNumber(req.body.supply))};
});
post('/new-token-mutable', (req) => {
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  return {token: resim.newTokenMutable(sanitizeAddr(req.body.minter))};
});
post('/new-badge-fixed', (req) => {
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  return {token: resim.newBadgeFixed(sanitizeNumber(req.body.supply))};
});
post('/new-badge-mutable', (req) => {
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  return {token: resim.newBadgeMutable(sanitizeAddr(req.body.minter))};
});
post('/mint/:resourceDef', (req) => {
  let supply = sanitizeNumber(req.body.supply);
  let resourceDef = sanitizeAddr(req.params.resourceDef);
  let minter = sanitizeAddr(req.body.minter);
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  resim.mint(supply,resourceDef,minter);
  return {};
});
post('/transfer/:resourceDef/:recipient', (req) => {
  let amount = sanitizeNumber(req.body.amount);
  let resourceDef = sanitizeAddr(req.params.resourceDef);
  let recipient = sanitizeAddr(req.params.recipient);
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  resim.transfer(amount,resourceDef,recipient);
  return {};
});
post('/call-function/:blueprint/:fctName', (req) => {
  let blueprint = sanitizeName(req.params.blueprint);
  let fctName = sanitizeName(req.params.fctName);
  let args = req.body.args ? sanitizeArguments(req.body.args) : [];
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  return resim.callFunction(pkg, blueprint, fctName, args);
});
post('/call-method/:component/:methodName', (req) => {
  let component = sanitizeAddr(req.params.component);
  let methodName = sanitizeName(req.params.methodName);
  let args = req.body.args ? sanitizeArguments(req.body.args) : [];
  if(req.body.currentAccount)
    resim.setDefaultAccount(sanitizeAddr(req.body.currentAccount));
  return resim.callMethod(component, methodName, args);
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(port, () => console.log(`listening on ${port}`));