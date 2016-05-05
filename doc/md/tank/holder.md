# Camera Holder

## up

### Description

pitch up the holder for 10 degree

### Input

`trigger`: any type. It is a trigger signal, and whenever it comes, the holder will pitch up

### Output

`angle`: number. The current pitch-angle after pitching up

## down

### Description

pitch down the holder for 10 degree

### Input

`trigger`: any type. It is a trigger signal, and whenever it comes, the holder will pitch down

### Output

`angle`: number. The current pitch-angle after pitching down

## left

### Description

turn left the holder for 10 degree

### Input

`trigger`: any type. It is a trigger signal, and whenever it comes, the holder will turn left

### Output

`angle`: number. The current level-angle after turning left

## right

### Description

turn right the holder for 10 degree

### Input

`trigger`: any type. It is a trigger signal, and whenever it comes, the holder will turn right

### Output

`angle`: number. The current level-angle after turning right

## horizon

### Description

set the level-angle of the camera-holder

### Input

`angle`: number. level-angle 0-180

### Output

`status`: boolean. if succeeds, send true.

## vertical

### Description

set the pitch-angle of the camera-holder

### Input

`angle`: number. pitch-angle 40-150

### Output

`status`: boolean. if succeeds, send true.