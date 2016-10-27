var text = IN.text;
var outputFolder = CONFIG.outputFolder;
var fileName = CONFIG.fileName;
var type = CONFIG.type.toLowerCase();
var size = CONFIG.size;
try{
  if((type!='png')&&(type!='svg')&&(type!='eps')&&(type!='pdf')){
    sendOUT({
      status: false
    });
  }else{
    var imageFilePath = service_shared.createQrcodeImage(text,outputFolder,fileName,type,size);
    sendOUT({
      status: true,
      imageFilePath:imageFilePath
    });
  }
} catch(err) {
  sendOUT({
    status: false
  });
  sendERR(err);
}
