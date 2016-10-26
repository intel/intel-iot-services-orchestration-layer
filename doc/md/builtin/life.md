life
================

## baidu_weather

### Description

This service provides ability to get weather report using baidu weather api.

At this page, not all city are supported because of baidu weather api is not supported.

### Config

`city`: String. The query city. Not all city are supported. 

`key`: String. The baidu weather api access_key.

### Inport

`switch`: Boolean. The switching signal of baidu weather. If it's true, this service will send request and output data.

### Outport

`out`: Object. The weather data. The format of data is Object.

### Example

There is a simple example. If it will rain tomorrow, turn on the light.

![](./pic/baidu_weather.png)

The first funtion code :

```javascript
return x['results'][0]['weather_data'][0]['date'] + x['results'][0]['weather_data'][0]['weather']

```

The second function code :
```javascript
 if(x.indexOf("雨") === -1) {
     return false;
 } else {
     return true;
 }

```

### Output Format

```javascript
{
    "error": "0",
    "status": "success",
    "date": "2013-07-17",
    "results": [{
        "currentCity": "北京市",
        "pm25": "166",
        "index": [{
            "title": "穿衣",
            "zs": "舒适",
            "tipt": "穿衣指数",
            "des": "建议着长袖T恤、衬衫加单裤等服装。年老体弱者宜着针织长袖衬衫、马甲和长裤。"
        }, {
            "title": "洗车",
            "zs": "不宜",
            "tipt": "洗车指数",
            "des": "不宜洗车，未来24小时内有雨，如果在此期间洗车，雨水和路上的泥水可能会再次弄脏您的爱车。"
        }, {
            "title": "感冒",
            "zs": "较易发",
            "tipt": "感冒指数",
            "des": "相对今天出现了较大幅度降温，较易发生感冒，体质较弱的朋友请注意适当防护。"
        }, {
            "title": "运动",
            "zs": "较不宜",
            "tipt": "运动指数",
            "des": "有降水，推荐您在室内进行健身休闲运动；若坚持户外运动，须注意携带雨具并注意避雨防滑。"
        }, {
            "title": "紫外线强度",
            "zs": "弱",
            "tipt": "紫外线强度指数",
            "des": "紫外线强度较弱，建议出门前涂擦SPF在12-15之间、PA+的防晒护肤品。"
        }],
        "weather_data": [{
            "date": "周三(今天, 实时：24℃)",
            "dayPictureUrl": "http://api.map.baidu.com/images/weather/day/duoyun.png",
            "nightPictureUrl": "http://api.map.baidu.com/images/weather/night/duoyun.png",
            "weather": "多云",
            "wind": "微风",
            "temperature": "23℃~ 15℃"
        }, {
            "date": "明天（周四）",
            "dayPictureUrl": "http://api.map.baidu.com/images/weather/day/leizhenyu.png",
            "nightPictureUrl": "http://api.map.baidu.com/images/weather/night/zhongyu.png",
            "weather": "雷阵雨转中雨",
            "wind": "微风",
            "temperature": "29～22℃"
        }, {
            "date": "后天（周五）",
            "dayPictureUrl": "http://api.map.baidu.com/images/weather/day/yin.png",
            "nightPictureUrl": "http://api.map.baidu.com/images/weather/night/duoyun.png",
            "weather": "阴转多云",
            "wind": "微风",
            "temperature": "31～23℃"
        }, {
            "date": "大后天（周六）",
            "dayPictureUrl": "http://api.map.baidu.com/images/weather/day/duoyun.png",
            "nightPictureUrl": "http://api.map.baidu.com/images/weather/night/duoyun.png",
            "weather": "多云",
            "wind": "微风",
            "temperature": "31～24℃"
        }]
    }]
}
```


For more inforation about the api, you can visit [baidu weather api](http://lbsyun.baidu.com/index.php?title=car/api/weather)


## rss

### Description

This service provides ability to subscribe rss. this service just like a simple rss reader.
Now ATOM and RSS are supported.

### Config

`url`: String. rss source url.
'proxy': String. Optional. You can set the proxy manually.

### Inport

`switch`: Boolean. The switching signal of rss service. If it's true, this service will send request and format returned data.

### Outport

`out`: Object. Rss content from config `url`. Attention:The format of data is Object which means that you can't simply show it using `Text` widget. You may need use `f`(user-defined) to show it.

### Example 

There is a simple example of subscribing rss of [zhihu](https://www.zhihu.com). The Rss url is 
```javascript
http://www.zhihu.com/rss
```

![](./pic/rss.png)

The function code:
```javascript
 return JSON.stringify(x);
```


### Output Format

```javascript
[
    { 
        "title": "NBA明星们的专属logo有哪些？",
        "content": "作为一个Sneaker，很多球星logo都是烂熟于心。<br>有些logo的设计令人叹为观止，在icon设计上的水平，完全不啻于球鞋的工业设计水准...",
        "published": "2016-08-04T10:30:00.000Z",
        "link": 'http://www.zhihu.com/question/49195604/answer/114767321?utm_campaign=rss&utm_medium=rss&utm_source=rss&utm_content=title' 
    }

    ...
]
```


## alidayu_sms

### Description

This service provides ability for send message by alidayu_sms service.
You may visit [alidayu](https://api.alidayu.com/doc2/apiDetail?spm=a3142.7791109.1999204071.19.vgOpNe&apiId=25450) to learn how to use and get config.

### Config

`app_key`: String. The same as public param of alidayu.

`sms_free_sign_name`: String. The same as request param of alidayu.

`sms_template_code`: String. The same as request param of alidayu.

`secret`: String. The app secret to produce sign.

`proxy`: String. Optinal. You can set the proxy manually.

### Inport

`to_number`: String. The number that this service will send message to.

`sms_param`: Object or String. If it's String, this service will translate it to Object. You must make sure the format of sms_param satisfy the app's setting on alidayu.

### Outport

`out`: Object. Send status. More detail see `Output Format`.

### Example

![](./pic/alidayu.png)

### Output Format

```javascript
//success
{
    "status": true,
    "detail": {
        "alibaba_aliqin_fc_sms_num_send_response":{
            "result":{
                "err_code":"0",
                "model":"134523^4351232",
                "success":false,
                "msg":"成功"
            }
        }
    }
}

//fail
{
    "status": false,
    "detail"; "fail reason"
}

```

</br>

## ms_face

### Description

Ask for microsoft face API easily by this service, it returns the face and other features of a man. The link:https://www.azure.cn/cognitive-services/zh-cn/face-api. This is the face detection and it need not any training.

### Config

`keys`: String,the Ocp-Apim-Subscription-Key of you microsoft face API.

### Inport

`filepath`: String, the absolute path of an image. 

### Outport

`data`: String, it shows the response data in JSON String. A successful call returns an array of face entries ranked by face rectangle size in descending order. An empty response indicates no faces detected. A face entry may contain the following values depending on input parameters:

| Fields        | Type           | Description  |
| ------------- |:-------------:|:----- |
| faceId      | String | Unique faceId of the detected face, created by detection API and it will expire in 24 hours after detection call. |
| faceRectangle     | Object | A rectangle area for the face location on image. |
| faceLandmarks | Object | An array of 27-point face landmarks pointing to the important positions of face components. |
| faceAttributes | Object | Face Attributes:<br />* `age`: an age number in years.<br />* `gender`: male or female.<br />* `smile`: smile intensity, a number between [0,1]<br />* `facialHair`: consists of lengths of three facial hair areas: moustache, beard and sideburns.<br />* `headPose`: 3-D roll/yew/pitch angles for face direction. Pitch value is a reserved field and will always return 0.<br />* `glasses`: glasses type. Possible values are 'noGlasses', 'readingGlasses', 'sunglasses', 'swimmingGoggles'.|

### Example

Config:

```javascript
keys:'a507fafe438643329b2dc3c2ed9*****'
```

Inport: 

```javascript
filepath:'/Users/User/Documents/Emotion_Recognition/test.jpg'
```

Outport:

```javascript
[
  {
    "faceId": "48cdf8c8-841c-4d33-b875-1710a3fc6542",
    "faceRectangle": {
      "width": 228,
      "height": 228,
      "left": 460,
      "top": 125
    },
    "faceLandmarks": {
      "pupilLeft": {
        "x": 507,
        "y": 204.9
      },
      "pupilRight": {
        "x": 609.8,
        "y": 175.4
      },
      "noseTip": {
        "x": 596.4,
        "y": 250.9
      },
      "mouthLeft": {
        "x": 531.4,
        "y": 301
      },
      "mouthRight": {
        "x": 629,
        "y": 273.7
      },
      "eyebrowLeftOuter": {
        "x": 463.2,
        "y": 201.2
      },
      "eyebrowLeftInner": {
        "x": 547.4,
        "y": 177.1
      },
      "eyeLeftOuter": {
        "x": 496.8,
        "y": 212
      },
      "eyeLeftTop": {
        "x": 508.8,
        "y": 199.4
      },
      "eyeLeftBottom": {
        "x": 513.2,
        "y": 214
      },
      "eyeLeftInner": {
        "x": 528.2,
        "y": 203.2
      },
      "eyebrowRightInner": {
        "x": 584.2,
        "y": 165.4
      },
      "eyebrowRightOuter": {
        "x": 630.3,
        "y": 148.3
      },
      "eyeRightInner": {
        "x": 598,
        "y": 183.7
      },
      "eyeRightTop": {
        "x": 609.5,
        "y": 170.1
      },
      "eyeRightBottom": {
        "x": 615.2,
        "y": 181.2
      },
      "eyeRightOuter": {
        "x": 627.6,
        "y": 171.3
      },
      "noseRootLeft": {
        "x": 558.2,
        "y": 198.7
      },
      "noseRootRight": {
        "x": 583.5,
        "y": 192.2
      },
      "noseLeftAlarTop": {
        "x": 558.6,
        "y": 235.7
      },
      "noseRightAlarTop": {
        "x": 601.1,
        "y": 224.9
      },
      "noseLeftAlarOutTip": {
        "x": 549.2,
        "y": 259.4
      },
      "noseRightAlarOutTip": {
        "x": 615,
        "y": 240.9
      },
      "upperLipTop": {
        "x": 591.4,
        "y": 278.3
      },
      "upperLipBottom": {
        "x": 592,
        "y": 287.7
      },
      "underLipTop": {
        "x": 591.7,
        "y": 296.7
      },
      "underLipBottom": {
        "x": 594.8,
        "y": 313.3
      }
    },
    "faceAttributes": {
      "age": 23.5,
      "gender": "female",
      "headPose": {
        "roll": -16.5,
        "yaw": 22.1,
        "pitch": 0
      },
      "smile": 0.998,
      "facialHair": {
        "moustache": 0,
        "beard": 0,
        "sideburns": 0
      },
      "glasses": "ReadingGlasses"
    }
  }
]
```
