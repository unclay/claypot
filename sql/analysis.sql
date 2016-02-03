drop table analysis;
create table analysis(
	id    SERIAL NOT NULL,
	ip    varchar(40),
	type  varchar(20),
	ua    varchar(1000),
	url   varchar(1000),
	ref   varchar(1000)
);