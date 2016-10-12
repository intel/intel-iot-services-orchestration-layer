shared.pool.getConnection(function(err,connect){
  if(err) {
    sendERR(err);
  }
  else {
    sendOUT({info:'connect succeed'});
    shared.connection = connect;
    query();
  }
});


function query(){
  shared.connection.query(IN.SQL_statement,function(err,result){
    if(err) {	
      sendERR(err);
      shared.connection.release();
    }
    else {
      sendOUT({result:result});
      shared.connection.release();
    }
  });
}

