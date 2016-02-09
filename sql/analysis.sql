TRUNCATE analysis;
drop table analysis;
create table analysis(
	id       SERIAL NOT NULL,
	ip       varchar(40),
	type     varchar(1),
	ua       varchar(1000),
	query    varchar(1000),
	date     varchar(10),
	del_flag varchar(1) default(0)
);


