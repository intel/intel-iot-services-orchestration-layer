生活服务
==================

##　百度天气服务

### 描述

百度天气服务通过使用百度天气ＡＰＩ获取天气预报。

我们的百度天气服务只支持百度天气API支持的城市查询天气。

###　配置

‘city’：　字符串，　要查询天气的某个城市名（精确值），　并不是所有的城市都支持。

‘key’：　字符串，　百度天气API的权限key。

### 输出

‘out’：　对象，　查询到的天气数据，　格式为对象。

### 例子

下面这个简单的例子，展示的是，如果明天下雨，则开灯。

![](./pic/baidu_weather.png)

第一个函数的代码是：

```javascript
return x['results'][0]['weather_data'][0]['date'] + x['results'][0]['weather_data'][0]['weather']

```

第二个函数的代码是：

```javascript
 if(x.indexOf("雨") === -1) {
     return false;
 } else {
     return true;
 }

```

### 输出格式

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
想要了解更多关于百度API的信息，　可以访问[baidu weather api](http://lbsyun.baidu.com/index.php?title=car/api/weather)

## rss服务

### 描述

通过rss服务可以订阅rss消息，　就像一个简单的rss阅读器。
支持ATOM和RSS。

### 配置

‘url’：　字符串，　rss源url。
‘proxy’：　字符串，　可选参数，　可以配置代理。

### 输入

‘switch’：　布尔型，　判断是否启动rss服务，　如果值为‘true’，则会发送订阅消息请求，并格式化返回数据。

### 输出

‘out’：　对象，　来自配置参数‘url’网站的Rss内容，　注意：　返回的格式化数据是对象类型，所以不能简单的用‘Text’widget来显示它，而应该用用户自定义的‘f’去显示。

### 例子

下面是一个关于订阅[知乎](https://www.zhihu.com)上rss信息的例子。RSS　url　是：
```javascript
http://www.zhihu.com/rss
```
![](./pic/rss.png)

函数代码是：
```javascript
 return JSON.stringify(x);
```

### 输出格式

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

## 阿里大于短信服务

### 描述

通过阿里大于短信服务可以发送信息。
可以访问[阿里大于](https://api.alidayu.com/doc2/apiDetail?spm=a3142.7791109.1999204071.19.vgOpNe&apiId=25450)去了解怎样使用阿里大于和获得配置。

### 配置

‘app_key’：　字符串，与阿里大于的公共参数一样。

’sms_free_sign_name‘：　字符串，　与阿里大于的请求参数一样。

’sms_template_code‘：字符串，　与阿里大于的请求参数一样。

’secret‘：字符串，用于产生签名的app密钥。

‘proxy’：字符串，可选参数，可以手动配置代码。

### 输入

`to_number`：字符串，　阿里大于短信服务发送信息的目的地。

`sms_param`：对象或者字符串，　如果它是字符串，本服务便会将它转化为对象，　使用时必须确保sms_param满足在阿里大于上的配置。

### 输出

‘out’：对象，　发送状态，　更多的细节，可以查看‘output Format’。

### 例子

![](./pic/alidayu.png)

### 输出格式

```javascript
//成功
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

//失败
{
    "status": false,
    "detail"; "fail reason"
}

```

</br>

## 微软人脸识别服务

### 描述

通过封装好的请求来访问微软的人脸识别服务并获得返回结果，可以识别出人以及其表情和外貌特征。官网连接：https://www.azure.cn/cognitive-services/zh-cn/face-api。这里是使用了其识别人脸特征的功能，无需训练。

### 配置

`keys`: 字符串类型，该配置项需要填写在微软API服务中申请的认证码，即实际填写的是微软人脸识别服务的Ocp-Apim-Subscription-Key的值。

### 输入

`filepath`: 字符串类型，发送的文件路径。最好填写绝对路径以免发送未知的错误。

### 输出

`data`: 字符串类型，将云服务返回的结果处理成json字符串的形式显示。识别成功会返回一个数组，里面根据识别框大小的递减顺序排列。空的返回值说明没有识别到任何人脸信息。 人脸的返回值包含了如下属性:

| 名称        | 类别           | 描述  |
| ------------- |:-------------:|:----- |
| faceId      | String | 检测出的人脸的唯一标示，24小时之后会过期。 |
| faceRectangle     | Object | 图片中显示人脸位置的矩形区域。 |
| faceLandmarks | Object | 由27个点组成的数组，对应人脸中27个重要的标志位。 |
| faceAttributes | Object | 人脸的属性:<br />* `age`: 年龄。<br />* `gender`: 男或者女<br />* `smile`: 微笑的程度，返回值在0到1之间。<br />* `facialHair`: 由三种毛发特征组成，主要来描述不同的胡须位置。<br />* `headPose`: 人脸的三种位置姿态， 第三个参数为保留参数通常为0。<br />* `glasses`: 眼镜的类型，有四种可能的结果。|

### 例子

配置:

```javascript
keys:'a507fafe438643329b2dc3c2ed9*****'
```

输入: 

```javascript
filepath:'/Users/User/Documents/Emotion_Recognition/test.jpg'
```

输出:

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
