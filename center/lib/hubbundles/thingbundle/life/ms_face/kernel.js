
shared.ms_face(IN.filepath, CONFIG.key, function(data) {
  sendOUT({
    out:data
  });
  }, function(err) {
  sendERR(err);
});

