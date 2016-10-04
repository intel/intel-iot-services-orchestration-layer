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
        insertData();
        

	}
});
 

function insertData(){
	connection.query("insert into "+IN.table+" values "+IN.values,function(err,result){
       if(err) {	
            sendOUT({q:'query fail'});console.log(err);
           
       }
       else {
	        sendOUT({result:result});
		    connection.release();
	    }
	});
}




