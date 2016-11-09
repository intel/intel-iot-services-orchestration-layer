shared.sensor.init();
shared.sensor.update(0);
sendOUT({temp : shared.sensor.getTemperature(0)})
