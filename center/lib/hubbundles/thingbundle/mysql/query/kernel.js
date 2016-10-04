var mysql=require('mysql');



var pool=mysql.createPool({
	host:IN.host,
	port:IN.port,
	database:IN.database,
	user:IN.user,
	password:IN.password,
	insecureAuth: true

});


var connection;
pool.getConnection(function(err,connect){
	if(err) {
		sendOUT({s:'connect failed'});
        console.log(err);
}
	else {
		sendOUT({s:'connect succeed'});
		connection=connect;
        queryData();
        

	}
});
 

function queryData(){
	connection.query("select "+IN.field+" from "+IN.table+" where "+IN.condition,function(err,result){
       if(err) {	
           sendOUT({q:'query fail'});console.log(err);
           
       }
       else {
	    sendOUT({result:result});
		connection.release();
	}
	});
}




