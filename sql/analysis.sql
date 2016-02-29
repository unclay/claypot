TRUNCATE analysis;
drop table analysis;
create table analysis(
	id         SERIAL NOT NULL,
	ip         varchar(1000),
	type       int,
	ua         varchar(1000),
	query      varchar(1000),
	date       int,
	del_flag   int default(0)
);

create index analysis_id_index on analysis (id);

alter table analysis alter column date type int

select * from analysis
where date between 1455358655 and 1456761600
limit 10


update analysis
set del_flag = 1
where type = 1
and query like '%=Script%20error.&%'

GRANT ALL PRIVILEGES ON TABLE analysis TO phzxoeqkocdqjv;
alter table analysis alter column query varchar(100000);

alter table analysis nocheck CONSTRAINT all;
Alter Table analysis ALTER column query VARCHAR(100000);
alter table analysis check constraint all;