'use strict';
let koa          = require('koa');
let fs           = require('co-fs');
let router       = require('koa-router')();
let koaPg        = require('koa-pg');
let staticCache  = require('koa-static-cache');
let path         = require('path');
let os           = require('os');
let moment       = require('moment');

let app = koa();

const port = process.env.PORT || 1122;

let   cache = {};

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

router.get('/analysis', function *(next){
	if( !!cache.analysis && cache.analysis.expire > moment().format('X') && this.query.debug !== 'true' ){
		this.body = {
			error_code: 0,
			data: cache.analysis.content
		};
	} else {
		let start   = this.query.start;
		let end     = this.query.end;
		let result  = yield this.pg.db.client.query_(`SELECT * FROM analysis WHERE (date BETWEEN ${this.query.start} AND ${this.query.end}) AND type = 0 AND del_flag = '0'`);
		let dataObj = {
			pv: {},
			os: {},
			manufacturers: {},
			viewport: {}
		};
		const os = {
			android: function(u){ return u.indexOf('Android') > -1 || u.indexOf('Adr') > -1; },
			ios:     function(u){ return !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); },
			other:   function(u){ return true; }
		}
		const manufacturers = {
			//pc:      /windows|Macintosh/ig, // pc
			iPhone:  /iphone/ig,
			iPod:    /ipod/ig,
			iPad:    /ipad/ig,
			SAMSUNG: /GT-|SM-|SCH-/ig,
			MI:      /HM|RedMi|Mi/ig, // 小米
			Huawei:  /huawei|honor/ig,
			vivo:    /vivo/ig, 
			Google:  /nexus/ig, 
			Nokia:   /Nokia/ig,
			oppo:    /oppo/ig, // 完全没有正则可以匹配到，超级不完整的数据
			one:     /one/ig,  // 一加
			asus:    /asus/ig, // 华硕
			htc:     /htc/ig,  // 
			lenovo:  /lenovo/ig,
			meitu:   /meitu/ig, // 美图
			zte:     /zte/ig,   // 中兴
			//other:   /.*/ig
		}
		for(let item of result.rows){
			// pv
			let dateYMD = moment.unix(item.date).format('YYYY-MM-DD');
			dataObj.pv[ dateYMD ] = dataObj.pv[ dateYMD ] || 0;
			dataObj.pv[ dateYMD ]++;
			// manufacturers
			for(let mf in manufacturers){
				if( new RegExp(manufacturers[mf]).test(item.ua) ){
					dataObj.manufacturers[mf] = dataObj.manufacturers[mf] || 0;
					dataObj.manufacturers[mf]++;
					break;
				}
			}
			// os
			for(let i in os){
				dataObj.os[i] = dataObj.os[i] || 0;
				if( os[i](item.ua) ){
					dataObj.os[i]++;
					break;
				}
			}
			// viewport
			let vp = item.ua.replace(/like Mac OS X(;)?|U;|Linux;|Android[ |\/]\d\.\d(\.\d;)?|en-us|zh-cn(;)?|Mobile;|Touch;|ARM;|Browser\/AppleWebKit\d{3}\.\d{2}|Trident\/\d\.\d;|Release\/\d{2}\.\d{2}\.\d{4} |Windows Phone \d\.\d| rv:\d{2}\.\d;|IEMobile\/\d{2}\.\d;|Configuration\/CLDC-\d\.\d|Profile\/MIDP-\d\.\d/gi, '')
							.replace(/(^ )|; ;/gi, '')
							.match(/\([^\)]*\)/i);
			if( !!vp ){
				// windows pc太多，排除掉
				if( !vp[0].match(/Windows NT 6.1;/gi) ){
					vp = vp[0].replace(/[\(\)]/g, '');
					dataObj.viewport[vp] = dataObj.viewport[vp] || 0;
					dataObj.viewport[vp]++;
				}
			}
			
			// .match(/\([^\)]*\)/i)

		}

		let body = {}
		// 数据重构成数组
		for(let i in dataObj){
			for(let j in dataObj[i]){
				body[i] = body[i] || [];
				body[i].push({
					name:  j,
					value: dataObj[i][j]
				});
			}
		}

		// 缓存数据，数据库连接慢（暂定一个小时）
		cache.analysis = {
			expire: parseInt(moment().format('X'), 10) + 60*60,
			content: body
		}

		this.body = {
			error_code: 0,
			data: body,
			count: {
				viewport: body.viewport.length
			}
		};
	}
	
});

router.get('/sync', function *(next){
	let analysis = require('./analysis');
	// var a = 1;
	// for(let val of analysis){
	// 	// console.log( val.query );
	// 	let ip    = val.ip;
	// 	let type  = val.type;
	// 	let ua    = val.ua;
	// 	let query = val.query;
	// 	let date  = val.date;
	// 	console.log( `insert into analysis(ip, type, ua, query, date) values('${ip}', '${type}', '${ua}', '${query}', '${date}')` );
	// 	if(a>59) yield this.pg.db.client.query_(`insert into analysis(ip, type, ua, query, date) values('${ip}', '${type}', '${ua}', '${query}', ${date})`);
	// 	a++;
	// }
	this.body = 'ok';
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

app.use(staticCache(path.join(__dirname, 'views'), {
	maxAge: 365 * 24 * 60 * 60
}))

app.listen(port, function(){
	console.log(`listen to ${port}`);
});