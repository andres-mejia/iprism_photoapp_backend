const fs = require('fs');
const PIXI = require('node-pixi').PIXI;
var Minio = require('minio')

const minioClient = new Minio.Client({
    endPoint: 'minio.teamcloud.com.co',
    port: 9100,
    useSSL: true,
    accessKey: 'DQQRXW886FPNU37TBOM2',
    secretKey: 'CNkiaTzr6xf6bfNNN0MrNNrfZbw6BQhxgcYSxwjU',
    signatureVersion: 'v4', 
    api: 'sigv4', 
});


const getValue = (value) =>{
    let scale = 2;
    return value * scale; 
  };
  
  const getFloat = (value) => {
    return parseFloat(value).toFixed(2);
  };

  const renderCircle = (circle, stage) => {
      
      let circleGragphic = new PIXI.Graphics();
      
      // set a fill color and an opacity
      circleGragphic.beginFill(circle.colorInfo.hex.replace("#", "0X"),1);
  
      // draw a rectangle using the arguments as:  x, y, radius
      circleGragphic.drawCircle(getValue(circle.center.x), getValue(circle.center.y), getValue(circle.radius));
  
      // create an item..
      // the below code does not work on nodejs with pixijs (so we will use the canvas context directly to write the texts)
      /*if(circle.distanceToMain){
        console.debug("printing text!!! " + circle.distanceToMain.distanceCm);
        let textDistance = new PIXI.Text(circle.distanceToMain.distanceCm + "cm", {
                                         fontFamily : 'Arial',
                                         fontSize: 24,
                                         fill : 0xff1010,
                                         align : 'center'
                                     });   
          textDistance.anchor.set(0.5, 0.5);
          textDistance.position.set(getValue(circle.center.x), getValue(circle.center.y)); 
        
         let textAngle  = new PIXI.Text("angle: " + getFloat(circle.distanceToMain.angleNormalized), {
                                         fontFamily : 'Arial',
                                         fontSize: 24,
                                         fill : 0xff1010,
                                         cacheAsBitmap:true,
                                         align : 'center'
                                     });   
          textAngle.anchor.set(0.5, 0.5);
          textAngle.position.set(getValue(circle.center.x), getValue(circle.center.y) + 25); 
        
          circleGragphic.addChild(textDistance);
          circleGragphic.addChild(textAngle);
      }*/
      
      // add it to your scene
      stage.addChild(circleGragphic);
  };

  const renderCircleTexts = (circle, context) => {
      if(circle.distanceToMain){
        context.fillText("distance: " + circle.distanceToMain.distanceCm + "cm", getValue(circle.center.x) - (getValue(circle.radius) * 0.9 ), getValue(circle.center.y));
        //context.fillText("color: " + circle.colorInfo.ligth, getValue(circle.center.x) - (getValue(circle.radius) * 0.7 ), getValue(circle.center.y) +25);
        //context.fillText("angle: " + getFloat(circle.distanceToMain.angleNormalized), getValue(circle.center.x) - (getValue(circle.radius) * 0.5 ), getValue(circle.center.y) +25);
      }
};
  

  const renderPreview = (info, uuid) => {
    
    return new Promise(function(resolve, reject){
        const app = new PIXI.Application({backgroundColor: 0xe7e7e7, forceCanvas: false, width: getValue(info.width), height: getValue(info.height)});

        PIXI.loader.onComplete.add(() => {
    //  const renderer = PIXI.autoDetectRenderer(getValue(info.width), getValue(info.height), {backgroundColor : 0xe7e7e7/*, view: app.view*/});
            //document.body.appendChild(renderer.view);
            
            // create the root of the scene graph
            // var stage = new PIXI.Container();
            //var view = renderer.view; 
            var stage = app.stage;
            
            // render the main circle as first
            renderCircle(info.mainCircle, stage);

            for(const circle of info.discs ){
                renderCircle(circle, stage);
            }

            //let text  = new PIXI.Text("TEST!!!! " );   
            //text.anchor.set(0.5);
            //text.position.set(10, 10); 
            
            //stage.addChild(text);
            
            // render the container
            //renderer.render(stage);
            app.render();
            
            // render the texts directly from contex of current canvas view because pixijs have the limit printing texts no nodejs
            var view = app.view;
            var cnv = view.getContext().canvas;
            var context =  cnv.getContext('2d');
            context.font = "bold 14px verdana, sans-serif";
            context.fillStyle = "#8a8787";

            for(const circleText of info.discs ){
                renderCircleTexts(circleText,context);
            }

            const filePreview = './public/scanned/'+uuid+'_preview.jpg';
            const fileName = uuid +"_preview.jpg";
            const minioBucket = "iprism";
            // save the jpg image to fs
            const out = fs.createWriteStream(filePreview);
            context.canvas.createJPEGStream().pipe(out); 
            out.on('finish', () => {
                //save to minio (storage server)
                var metaData = {
                    'Content-Type': 'application/octet-stream',
                    'uuid': uuid
                };

                minioClient.fPutObject(minioBucket,  fileName, filePreview, metaData, function(err, etag) {

                    if (err) {
                        reject(info);
                    }else{

                        var publicUrl = minioClient.protocol + '//' + minioClient.host + ':' + minioClient.port + '/' + minioBucket + '/' + fileName;
                        info.url = publicUrl;
                        console.log(publicUrl);

                        // delete temporal files
                        // from upload

                        // from opencv
                        
                        if(info.filePath){
                            console.log(info.filePath);
                            fs.unlinkSync(info.filePath);
                        }
                        
                       // delete info.filePath;
                        
                        // from node-pixi
                        fs.unlinkSync(filePreview);

                        resolve(info);
                    }

                });

            });

            // we saw that below image size is greater that createJPEGStream generated
            /*view.toBuffer('jpg', 1).then(buffer => {
                console.log("............................file created");
                fs.writeFileSync('./public/scanned/'+uuid+'_preview.jpg', buffer);
            }).catch(err => {
                console.error(err);
            });*/

        });
        
        PIXI.loader.onError.add((err) => {
            console.error(err);
            reject(info);
        });
        
        PIXI.loader.load();
    });
};

exports.renderPreview = (info, uuid ) => renderPreview(info, uuid);