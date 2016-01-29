var express = require('express');
var os      = require('os');

var app = express();

app.set('port', process.env.PORT || 1122);

// 服务器信息
app.get('/version', function(req, res){
	res.json({
		code: 0,
		data: {
			os: {
				freemem:           os.freemem(),
				hostname:          os.hostname(),
				networkInterfaces: os.networkInterfaces(),
				platform:          os.platform(),
				type:              os.type(),
				cpus:              os.cpus()
			},
			node: {
				version: process.version
			}
		}
	});
});

app.use('/', express.static(__dirname + '/views'));

app.listen(app.get('port'), function(){
	console.log('listen to ' + app.get('port'));
});