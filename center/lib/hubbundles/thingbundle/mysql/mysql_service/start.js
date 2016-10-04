var mysql=require('mysql');


shared.pool=mysql.createPool({
  host:CONFIG.host,
  port:CONFIG.port,
  database:CONFIG.database,
  user:CONFIG.user,
  password:CONFIG.password,
  insecureAuth: true
});


done();
