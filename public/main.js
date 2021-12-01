let g_currentAccount;

function changeCurrentAccount(addr){
  $("#current-account").removeClass("alert-danger").addClass("alert-info").text("Current account: " + addr);
  g_currentAccount = addr;
}

function getCurrentAccount(){
  return g_currentAccount;
}

const request = function(){
  const serverurl = "/";
  return function(url,data,cb,noAccountNeeded){
    if(!noAccountNeeded){
      data.currentAccount = getCurrentAccount();
      if(!data.currentAccount)
        return cb("current account not defined");
    }
    $.ajax(
      { 
        type: "POST",
        url: serverurl+url,
        data: JSON.stringify(data),
        contentType: "application/json; charset=UTF-8",
        processData: false
      }
     ).done(function(ret){
       if(cb) cb(null,ret);
     }).fail(function(err){ 
       if(cb) cb(err,null); 
     });
  }
}();

function replaceEol(txt){
  return txt.split("\n").join("<br/>");
}

function addToResult(cmd, onSuccess, err, txt){
  let div = $("<div>").addClass("alert alert-dismissible fade show").attr("role","alert");
  div.append($("<h4>").addClass("alert-heading").text(cmd));
  let content = $("<div>").addClass("clearFix");
  if(err){
    div.addClass("alert-danger");
    content.append($("<div>").text(err));
  }else{
    if(txt.epoch){
      content.append($("<div>").addClass("float-end").text("(time: " + txt.epoch + ")"));
    }
    if(txt.error){
      div.addClass("alert-danger");
      content.append($("<pre>").text(txt.error));
    }else{
      div.addClass("alert-success");
      let fmtRes = onSuccess(txt);
      if(typeof fmtRes == "string")
        fmtRes = $("<pre>").text(fmtRes);
      content.append(fmtRes);
    }
  }
  div.append(content);
  div.append($("<button>").attr("type", "button").addClass("btn-close").attr("data-bs-dismiss", "alert").attr("aria-label", "Close"));
  $("#result").prepend(div);
}

function sendCommand(path, data, cmd, onSuccess, noAccountNeeded){
  cmd = cmd || "undefined command";
  onSuccess = onSuccess || (v => $("<pre>").text(JSON.stringify(v,"",2)));
  request(path, data, (err, res) => addToResult(cmd, onSuccess, err, res), noAccountNeeded);
}

function getAndClear(rootName, names){
  try {
    return names.map(name => {
      let element = $("#"+rootName+"-"+name);
      let value = element.val();
      if(!value)
        throw new Error("Empty input for '" + name + "'");
      return {value,element};
    }).map(arg => {
      arg.element.val("");
      return arg.value;
    });
  }catch(ex){
    addToResult("Parsing input", null, ex.message);
    throw ex;
  }
}

function bucket(nb, token){
  return [nb,token].join(",");
}

function newAccount(){
  sendCommand("new-account", {}, "New account", res => {
    if(!getCurrentAccount())
      changeCurrentAccount(res.account);
    return res.account;
  },true);
}

function setDefaultAccount(){
  let [addr] = getAndClear("cmd-set-default-account",["addr"]);
  sendCommand("new-set-default-account", {addr}, "Set default account", res => {
    changeCurrentAccount(addr);
    return addr;
  },true);
}

function newTokenFixed(){
  let [supply] = getAndClear("cmd-new-token",["supply"]);
  sendCommand("new-token-fixed", {supply}, "New token", res => res.token);
}

function show(){
  if($("#cmd-show-addr").val() == ""){
    sendCommand("addr", {}, "Show ledger", res => res.out,true);
  }else{
    let [addr] = getAndClear("cmd-show",["addr"]);
    sendCommand("addr/" + addr, {}, "Show: " + addr, res => res.out,true);
  }
}

function newAccumulatingVault(){
  let [rate] = getAndClear("cmd-new-accumulating-vault",["rate"]);
  sendCommand("call-function/AccumulatingVault/new", {args: [rate]}, "New Accumulating Vault", res => {
    return ["Badge: " + res["ResourceDef"][1],
    "Token: " + res["ResourceDef"][2],
    "Accumulating Vault: " + res["Component"][0]].join("\n");
  });
}

function refresh(){
  let [accumulatingVault] = getAndClear("cmd-refresh",["accumulating-vault"]);
  sendCommand("call-method/" + accumulatingVault +"/refresh", {}, "Refresh", res => "Ok");
}

function withdraw(){
  let [accumulatingVault, badge, amount] = getAndClear("cmd-withdraw",["accumulating-vault", "badge", "amount"]);
  sendCommand("call-method/" + accumulatingVault +"/withdraw", {args: [amount, "1,"+badge]}, "Buyer Withdraw", res => "Ok");
}

$(function(){
  $("#cmd-new-account").click(newAccount);
  $("#cmd-set-default-account").click(setDefaultAccount);
  $("#cmd-new-token-fixed").click(newTokenFixed);
  $("#cmd-show").click(show);
  $("#cmd-new-accumulating-vault").click(newAccumulatingVault);
  $("#cmd-refresh").click(refresh);
  $("#cmd-withdraw").click(withdraw);
});
