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
			env: {
				PORT:         process.env.PORT || 0,
				DATABASE_URL: process.env.DATABASE_URL || ''
			},
			node: {
				version: process.version
			}
		}
	});
});

var pg = require('pg');

pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err){
  	return console.log( err );
  } 
  console.log('Connected to postgres! Getting schemas...');

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables;')
    .on('row', function(row) {
      console.log(43, JSON.stringify(row));
    });
});

app.use('/', express.static(__dirname + '/views'));

app.listen(app.get('port'), function(){
	console.log('listen to ' + app.get('port'));
});