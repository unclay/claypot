'use strict';
const koa          = require('koa');
const fs           = require('co-fs');
const router       = require('koa-router')();
const koaPg        = require('koa-pg');
const staticCache  = require('koa-static-cache');
const path         = require('path');
const os           = require('os');

const app = koa();



const port = process.env.PORT || 1122;

// logger
app.use(function *(next){
	let start = new Date;
	yield next;
	let ms = new Date - start;
	console.log('%s %s - %sms', this.method, this.url, ms);
});

app.use(koaPg(process.env.DATABASE_URL));

// 系统信息
router.get('/version', function *(next){
	console.log( this );
	let ip = this.request.ip.match(/(\d{1,3}\.){1,3}\d{1,3}/gi)
	this.body = {
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
			},
			client: {
				ip: !!ip ? ip[0] : this.request.ip
			}
		}
	}
});

// 数据库测试
router.get('/pg', function *(next){
	var result = yield this.pg.db.client.query_('SELECT * from test')
	// console.log('result: ', result);
	this.body = {
		error_code: 0,
		data: {
			list: result.rows
		}
	};
});

router.get('/c.gif', function *(next){
	let ip    = this.ip;
	let type  = this.query.t || '';
	let ua    = this.request.header['user-agent'];
	let query = this.url.replace('/c.gif?', '');
	let date  = parseInt(Date.now()/1000, 10);
	yield this.pg.db.client.query_(`insert into analysis(ip, type, ua, query, date) values('${ip}', '${type}', '${ua}', '${query}', '${date}')`)
	// let result = yield this.pg.db.client.query_(`insert into analysis(ip, type, ua, url, ref) values('${ip}',2,3,4,5)`);
	this.status = 204;
});
// var pg = require('pg');
// pg.connect(process.env.DATABASE_URL, function(err, client) {
//   if (err){
//   	return console.log( err );
//   } 
//   console.log('Connected to postgres! Getting schemas...');

//   client
//     .query('SELECT table_schema,table_name FROM information_schema.tables;')
//     .on('row', function(row) {
//       console.log(43, JSON.stringify(row));
//     });
// });

app.use(router.routes());

app.use(staticCache( __dirname + '/views', {
	maxAge: 365 * 24 * 60 * 60
}));

app.listen(port, function(){
	console.log(`listen to ${port}`);
});