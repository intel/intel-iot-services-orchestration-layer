
function getIPStatus(){
    var interfaces = service_shared.os.networkInterfaces();
    for(var devName in interfaces){
          var iface = interfaces[devName];
          for(var i=0;i<iface.length;i++){
               var alias = iface[i];
               if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){
                     return alias;
               }
          }
    }
}

if(IN.switch) {
  var status = getIPStatus();
  if(typeof(status) == "undefined"){
    sendOUT({
	    status:null
    });
  }else if(typeof(status) == "object"){
    sendOUT({
	    status:status
    });
  }else{
    sendERR("Unknown error!");
  }
}
