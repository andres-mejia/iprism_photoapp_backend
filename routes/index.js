var express = require('express');
var router = express.Router();
const log4js = require('log4js');
const { promisify } = require('util')
var fs = require('fs');
var _ = require('lodash');
var multer  = require('multer');

const cv = require('opencv4nodejs');
const services = require('../services');
const agentkeepalive = require('agentkeepalive');

const unlinkAsync = promisify(fs.unlink);

const myagent = new agentkeepalive({
  maxSockets: 100,
  maxKeepAliveRequests: 0,
  maxKeepAliveTime: 30000
});

const upload = multer({ dest: 'uploads/' });
 

router.post('/api/scan', upload.single('board'), function (req, res, next) {
    

    console.log("fil received!");
    console.dir(req.body.uuid);
    console.dir(req.file);

    const img = cv.imread(req.file.path);
    const uuid = req.body.uuid;
    const ext = req.file.originalname.substring(req.file.originalname.lastIndexOf(".")) ;
    const information = services.startAnalysis(img, uuid, ext);
    
    

    services.renderPreview(information, uuid).then(async (info) => {
      
      delete info.filePath;

      await unlinkAsync(req.file.path);

      res.send({ data: info });
    }).catch(async (info)=>{
      
      await unlinkAsync(req.file.path);

      res.send({ data: info });
    });
    
    
    //information.url = !information.url ? null : req.protocol + '://' + req.get('host') + information.url ;
    //information.urlPreview = !information.url ? null : req.protocol + '://' + req.get('host') + information.urlPreview ;
    //console.dir(information);

    

}); 




module.exports = router;
