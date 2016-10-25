var qr = require('qr-image');
var fs = require('fs');
var path = require('path');
service_shared.createQrcodeImage=function(text,outputFolder,fileName,type,size){
  var qr_svg = qr.image(text, {
    type: type,
    size: size
  });
		
  if(!(fs.existsSync(outputFolder)&&fs.statSync(outputFolder).isDirectory())){
    fs.mkdirSync(outputFolder);
  }
  var imageFilePath = path.normalize(outputFolder+'/'+fileName+'.'+type);
  qr_svg.pipe(fs.createWriteStream(imageFilePath));
  return imageFilePath;
}
done();
