const colorNamer = require("chroma-js");
const colorNameDetector = require("ntc");
var convert = require('color-convert');

const convertToCm = function(val, width){

  if(val == 0){
      return 0;
  }

  /*

      DIN A4: Scales by PPI:
        72 = 595 x 842
        96  = 794 x 1123
        150 = 1240 x 1754
        300 = 2480 x 3508

  */
  var w1= 3508;	// DIN A4 Width (px) 	29.7cm
  var h1= 2480; 	// DIN A4 Height (px)	21.0cm
  var ppp = 300;	// resolution of print
  var cpp = 2.54;	// this constant is deppending of resolution selected
  var w2 = width;
  //var h2 = board.height();

  // (w1 / w2) is the scale on horizontal region
  var cm = ((val / ppp) * cpp) * (w1 / w2);

  cm = cm.toFixed(1);

  return parseFloat(cm);
};

const getAngle = (anchor, point, normalized) => {
  if(normalized){
    return Math.atan2(anchor.y - point.y, anchor.x - point.x) * 180 / Math.PI + 180;
  }else{
    return Math.atan2(anchor.y - point.y, anchor.x - point.x) * 180 / Math.PI;
  }
};

const getColorInformation = (target, radius, center, width, height) =>{
    // another option is only to detect certain circles by color presset.. (https://solarianprogrammer.com/2015/05/08/detect-red-circles-image-using-opencv/)

    let halfR = radius / 2;
    let diameterX = radius * 2;
    let diameterY = radius * 2;
    let dx = center.x - radius;
    let dy = center.y - radius;
    
    dy = dy < 0 ? 0 : dy;
    dx = dx < 0 ? 0 : dx;

    if(dx + diameterX > width){
      diameterX = width - dx;
    }
    
    if(dy + diameterY > height){
      diameterY = height - dy;
    }
    
    let rect = new cv.Rect(dx, dy  , diameterX , diameterY );
    let roi = target.getRegion(rect);

    
    // Getting RGB collor of disc
    
    // [B, G, R] [74, 39, 13 ]
    let pointColor = roi.at(halfR, halfR);
    let rgbColor = [pointColor.z, pointColor.y, pointColor.x];
    
    let color = colorNamer(rgbColor);

    let colorInfo = {
        rgb: rgbColor.join(","),
        hex: color.hex(),
        ligth:  color.brighten().hex(),
        dark: color.darken().hex(),
        hsv: convert.rgb.hsv(rgbColor).join(","),
        keyword: convert.rgb.keyword(rgbColor), 
        name: color.name(),
        hexName: colorNameDetector.name(color.hex())[1],
        ligthName: colorNameDetector.name(color.brighten().hex())[1],
        darkName: colorNameDetector.name(color.darken().hex())[1],
    };
    
    return colorInfo;
};

const getMainCircle = (target, circles, frameWidth, frameHeight) => {
  
  let maxRadius = 0;
  let mainCircle = null;
  let limitX = frameHeight;

  for (let i = 0; i < circles.length; ++i) {
      let x0 = circles[i].x;
      let y0 = circles[i].y;
      let radius = circles[i].z;

      let x1 = limitX - y0;
      let y1 = x0;

      if(radius > maxRadius)
      {
          maxRadius = radius;
          mainCircle = {
            radius: radius,
            center: {
              x: x0,
              y: y0
            },
            index: i
          };
      }

  }

  if(mainCircle) {
    mainCircle.colorInfo = getColorInformation(target, mainCircle.radius, mainCircle.center, frameWidth, frameHeight);
  }

  return mainCircle;
};

const getDistanceToPoint = (target, source, width) =>{

  // point 1
  let x1 = target.center.x; // target.x1;
  let y1 = target.center.y; // target.y1;
  //let r1 = target.radius;

  // point 2
  let x2 =  source.center.x;
  let y2 = source.center.y;
  //let r2 = source.radius;

  let distance = Math.sqrt( Math.pow(( x1 - x2 ),2) +  Math.pow(( y1 - y2 ), 2 ) );
  let angle = getAngle( { x:x1, y:y1 }, { x:x2, y:y2 }, false) ;
  let angleNormalized = getAngle({ x:x1, y:y1 }, { x:x2, y:y2 }, true) ;
  let slope = 0;

  if(x2 > 0 || x1 > 0){
      slope = (y2 - y1) / (x2 -x1);
  }
	
	angleNormalized = parseFloat(angleNormalized.toFixed(1));
	
  return {
    distance: distance,
    distanceCm: convertToCm(distance, width),
    slope: slope,
    angle: angle,
    angleNormalized: angleNormalized
  };
};

const flipImage = (image, type) =>{
  console.log("flipping image");
  /**
   * Flip codes:
   * 0 = CW
   * 1 = CCW
   * -1 = 180
   */

  image.transpose ();
  image = image.flip(type);
  return image;  
}

const rotateImage = (image, angle) =>{
  console.log("rotate image!!");
  image.transpose ();
  /*
  codes: 
    ROTATE_90_CLOCKWISE
    ROTATE_90_COUNTERCLOCKWISE
    ROTATE_180
  */
  image = image.rotate(cv.ROTATE_90_CLOCKWISE);
  return image;  
}

const resize = (image) => {
  
  const limit = 500;
  let ratio =  limit / image.rows;
  let height =  ratio * image.cols;
  let width = limit;

  if(image.rows < image.cols){
    ratio = limit / image.cols;
    height = limit;
    width = ratio * image.rows;
  }
  
  return image.resize(parseInt(width), parseInt(height));
};

const getCircles = (target) => {
  
   let mat = target.bgrToGray();

   // this parameters work fine on images of max 500px (height or width)
   const method = cv.HOUGH_GRADIENT;
   const dp= 1; // accumulator resolution (size of image / 2)
   const minDist= 61; // minimum dist between two circles
   const param1 = 100; //Canny high threshold
   const param2 = 25;  // minimum number of votes
   const minRadius = 38;
   const maxRadius = 90;

   
   // detect the circles
   const circles = mat.houghCircles (method, dp , minDist, param1, param2, minRadius, maxRadius);

   return circles;
};

const startAnalysis = (img, uuid, ext) => {
  
  
  let information = {
    discs: []
  };
  console.log("detecting circles...");
  console.log("size... w:"+ img.rows + " h: " + img.cols);
  try{
    
    let target; 
    
    if(img.cols < img.rows){
      // 0= CW, 1 = CCW, -1 = 180
      // todo: we wil need detect the type, but per now always rotate as CW 
      target = rotateImage(img, -1);
    }else{
      target = img;
    }
    
    if(img.rows > 500 ){
      target = resize(target);
      console.log("new size... w:"+ target.rows + " h: " + target.cols);
    }

    information.width = target.cols;
    information.height = target.rows;
 
    let circles = getCircles(target);    
    
    information.mainCircle = getMainCircle(target, circles, information.width, information.height);

    if(!information.mainCircle){
      // main disc was not found!
      information.error = "the main disc was not found";
      return information;
    }

    if(information.mainCircle.center.x < (information.width * 0.5) ){
        
        // we need flip the image, then get again the circles.
        // 0= CW, 1 = CCW, -1 = 180
        // todo: we wil need detect the type, but per now always rotate as CW 
        target = flipImage(target, -1);                                 

        information.width = target.cols;
        information.height = target.rows;
     
        circles = getCircles(target);    

        information.mainCircle = getMainCircle(target, circles, information.width, information.height);

        if(!information.mainCircle){
          // main disc was not found!
          information.error = "the main disc was not found";
          return information;
        }
    
    }

    information.widthCm = convertToCm(information.width, information.width);
    information.heightCm = convertToCm(information.height, information.width);

    let discs = [];

    for (let i = 0; i < circles.length; ++i) {
        
        
        let disc = {
            center: {
              x: circles[i].x,
              y: circles[i].y,
            },
            position: {
              x:0,
              y:0
            },
            radius: circles[i].z,
            diameter: 0,
        };
        
        disc.position.x = disc.center.x - disc.radius;
        disc.position.y = disc.center.y - disc.radius;
        disc.diameter = disc.radius * 2;
        disc.radiusCm = convertToCm(disc.radius, information.width);

        disc.diameterCm = convertToCm(disc.diameter, information.width);
         
        let isMainCircle = i == information.mainCircle.index;
        
        if(!isMainCircle){
          disc.distanceToMain = getDistanceToPoint(disc, information.mainCircle, information.width);  
          disc.colorInfo = getColorInformation(target, disc.radius, disc.center, information.width, information.height);
          discs.push(disc);
        }else{
          information.mainCircle.diameter = disc.diameter;
          information.mainCircle.diameterCm = disc.diameterCm;
          information.mainCircle.radiusCm = disc.radiusCm;
          information.mainCircle.position = disc.position;

          // set the default yellow color for main Circle
          if(information.mainCircle.colorInfo){
            information.mainCircle.colorInfo.ligth =  "#f09d00";
            information.mainCircle.colorInfo.hex =  "#f09d00";
            information.mainCircle.colorInfo.dark =  "#f09d00";
          }
          
        }

        // draw bounders of circle
        let center = new cv.Point(disc.center.x, disc.center.y);

        // check if we need draw thed circles on disk:         
        target.drawCircle(center, disc.radius, new cv.Vec(0, 255, 0), 1, cv.LINE_8);
    
    }
	
	// we need sor the disc by distance nearest first
	discs.sort((a,b) => a.distanceToMain.distanceCm > b.distanceToMain.distanceCm);
    
    const filePath = './public/scanned/'+ uuid + ext;

    //save the image scanned on disk
    cv.imwrite(filePath, target);
    
    //prepare response
    information.discs = discs;
    information.filePath = filePath;
    
   // console.dir(information);


  }catch(e){
    information.error = "error processing image ";
    console.error(e);
  }
  
  return information;
};



exports.startAnalysis = (img, uuid, ext ) => startAnalysis(img, uuid, ext);