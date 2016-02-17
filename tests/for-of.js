'use strict';
let obj = {
	a: 1,
	b: 2,
}
for( let key of Object.keys(obj) ){
	console.log( 'key: ' + key + '=' + obj[key] );
}

let obj1 = [3,5,7,];
for( let key of obj1 ){
	console.log( key )
}

function* generators(name){
	yield `help ${name}`;
	yield 'Wish you love it';
	if( name.startsWith('x') ){
		yield 'good name ${name}';
	}
	yield 'goodlbye';
}

var g = generators('wangcl');
g.next();
g.next();
g.next();
g.next();