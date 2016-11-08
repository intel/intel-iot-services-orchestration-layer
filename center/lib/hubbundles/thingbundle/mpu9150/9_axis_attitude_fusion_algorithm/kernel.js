
var sensor = new shared.sensorObj.MPU9150();
sensor.init();

var x = new shared.sensorObj.new_floatp();
var y = new shared.sensorObj.new_floatp();
var z = new shared.sensorObj.new_floatp();
var pitch,yaw,roll;
var angle_P=0,angle_R=0;
var angleAx_P,gyroGy_P;
var angleAx_R,gyroGy_R;
    
function  ComplementaryFilter(ax,ay,az,gx,gy,gz,mx,my,mz,dt,K1){
    
    angleAx_P = -Math.atan2(ax,az)*180/Math.PI;
    
    gyroGy_P = gy;
   
    angle_P = K1 * angleAx_P+ (1-K1) * (angle_P + gyroGy_P * dt);
    
    pitch = angle_P + 5;
    console.log(K1 * angleAx_P+ (1-K1) * (angle_P + gyroGy_P * dt));
    angleAx_R = Math.atan2(ay,az)*180/Math.PI;
    gyroGy_R = gx;
    angle_R = K1 * angleAx_R+ (1-K1) * (angle_R + gyroGy_R * dt);
    roll = angle_R;    
    yh=my*Math.cos(roll)+mz*Math.sin(roll);
    xh=mx*Math.cos(pitch)+my*Math.sin(pitch)*Math.sin(roll)-mz*Math.cos(roll)*Math.sin(pitch);
    yaw=Math.atan(yh/xh);
    sendOUT({
      pitch:pitch,
      yaw:yaw,
      roll:roll
    });
    console.log(pitch,yaw);
}

 var Dt = parseFloat(IN.dt);
 var K = parseFloat(IN.K);
 if(IN.trigger===1){

    sensor.update();

sensor.getAccelerometer(x, y, z);
var ax= shared.sensorObj.floatp_value(x);
var ay= shared.sensorObj.floatp_value(y);
var az= shared.sensorObj.floatp_value(z);


sensor.getGyroscope(x, y, z);
var gx= shared.sensorObj.floatp_value(x);
var gy= shared.sensorObj.floatp_value(y);
var gz= shared.sensorObj.floatp_value(z);


sensor.getMagnetometer(x, y, z);
var mx= shared.sensorObj.floatp_value(x);
var my= shared.sensorObj.floatp_value(y);
var mz= shared.sensorObj.floatp_value(z)

ComplementaryFilter(ax,ay,az,gx,gy,gz,mx,my,mz,Dt,K);
}
