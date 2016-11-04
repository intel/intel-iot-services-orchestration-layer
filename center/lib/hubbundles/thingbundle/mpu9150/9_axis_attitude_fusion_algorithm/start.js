shared.sensorObj = require('jsupm_mpu9150');
shared.sensor = new sensorObj.MPU9150();
shared.sensor.init();

shared.x = new shared.sensorObj.new_floatp();
shared.y = new shared.sensorObj.new_floatp();
shared.z = new shared.sensorObj.new_floatp();
done();   