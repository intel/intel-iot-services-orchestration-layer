shared.sensor.update();

shared.sensor.getAccelerometer(x, y, z);
var ax= shared.sensorObj.floatp_value(shared.x);
var ay= shared.sensorObj.floatp_value(shared.y);
var az= shared.sensorObj.floatp_value(shared.z);

shared.sensor.getGyroscope(x, y, z);
var gx= shared.sensorObj.floatp_value(shared.x);
var gy= dhared.sensorObj.floatp_value(shared.y);
var gz= shared.sensorObj.floatp_value(shared.z);

shared.sensor.getMagnetometer(x, y, z);
var mx= shared.sensorObj.floatp_value(shared.x);
var my= shared.sensorObj.floatp_value(shared.y);
var zz= shared.sensorObj.floatp_value(shared.z);

function  ComplementaryFilter(ax,ay,az,gx,gy,gz,mx,my,mz,dt,K1){
    var pitch,yaw,roll;
    var angleAx_P,gyroGy_P,angle_P;
    var angleAx_R,gyroGy_R,angle_R;
    
    angleAx_P = -Math.atan2(ax,az)*180/Math.PI;
    gyroGy_P = gy;
    angle_P = K1 * angleAx_P+ (1-K1) * (angle_P + gyroGy_P * dt);
    pitch = angle_P+5;
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
}


ComplementaryFilter(ax,ay,az,gx,gy,gz,mx,my,mz,Dt,K);
