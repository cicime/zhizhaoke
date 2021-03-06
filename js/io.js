/**
 * Created by Toma on 2016/9/17.
 * 后台接口,微信接口
 */
var io = window.io || {};

// 请求信息 - 每次请求都会装载此数据
io.userInfo = {
  'openId':'sd1f211',
  'test':{
    name:'阿斯顿飞',
    diz: 132,
    arr: ['sdf','sd4']
  }
};

io.questionList = {
  // 列表页 - 分页返回全部问题
  content: './data/question_list.json'
};
io.questionDetail = {
  // 问题详情页
  content: './data/question_detail.json',
  // 加载更多的答案
  answers: './data/question_detail.json',
  // 提交答案
  submit: './data/question_detail.json'
};
io.question = {
  // 问题 - 点赞 收藏 举报 - 返回状态码
  collectCount: './data/question_list.json',
  praiseCount: './data/question_list.json',
  reportCount: './data/question_list.json'
};

io.quiz = {
  // 提交问题, 回答的地址
  content: './data/question_list.json'
};

io.specialist = {
  // 获取可用时间
  times: './data/specialist.json',
  // 提交地址
  form: './data/specialist.json'
};

io.userSubscribe = {
  // 我的订单
  content: './data/specialist.json',
  // 订单评价
  evaluate: './data/specialist.json'
}

io.user = {
  // 收藏
  userCollect: './data/question_list_collect.json',
  // 移除收藏
  userRmoveCollect: './data/question_list_collect.json'
};

io.userQuestionList = {
  // 我的问题列表
  content: './data/user_question_list.json'
};
io.userQuestionDetail = {
  // 我的问题详情
  content: './data/user_question_detail.json',
  // 设置最佳答案
  zjda: './data/user_question_detail.json',
  // 追问
  asked: './data/user_question_detail.json'
};
io.userZhizhao = {
  // 我的支招
  content: './data/user_zhizhao.json'
}
io.userListen = {
  // 我的偷听
  content: './data/user_listen.json'
}


/* ----------------------- 微信 remove start ----------------------------------*/

$.ajax({
  url: 'http://cloud.bmob.cn/bfc3efa954f1495f/signature',
  data: {url: location.href},
  dataType: 'jsonp',
  jsonp: 'callback',
  success: function (result) {
    init(result)
  }
});

function init(req) {
  wx.config({
    debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
    appId: 'wx07f1a296ba0edc13', // 必填，公众号的唯一标识
    timestamp: req.timestamp, // 必填，生成签名的时间戳
    nonceStr: req.nonceStr, // 必填，生成签名的随机串
    signature: req.signature, // 必填，签名，见附录1
    jsApiList: [
      'checkJsApi',
      'onMenuShareTimeline',
      'onMenuShareAppMessage',
      'onMenuShareQQ',
      'onMenuShareWeibo',
      'chooseImage',
      'startRecord',
      'stopRecord',
      'playVoice',
      'pauseVoice',
      'stopVoice',
      'onVoicePlayEnd',
      'translateVoice',
      'uploadVoice',
      'uploadImage',
      'previewImage'
    ] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
  });

  window.share_config = {
    "share": {
      "imgUrl": window.location.href + 'img/co.jpg', //分享图，默认当相对路径处理，所以使用绝对路径的的话，“http://”协议前缀必须在。
      "desc": '你对页面的描述', //摘要,如果分享到朋友圈的话，不显示摘要。
      "title": '分享卡片的标题', //分享卡片标题
      "link": window.location.href, //分享出去后的链接，这里可以将链接设置为另一个页面。
      "success": function () {
        //分享成功后的回调函数
      },
      'cancel': function () {
        // 用户取消分享后执行的回调函数
      }
    }
  };

  wx.ready(function () {
    // 获取“分享给朋友”按钮点击状态及自定义分享内容接口
    wx.onMenuShareAppMessage(share_config.share);//分享给好友
    wx.onMenuShareTimeline(share_config.share);//分享到朋友圈
    wx.onMenuShareQQ(share_config.share);//分享给手机QQ
  });

  wx.error(function (res) {
    alert(JSON.stringify(res))
  });
}

/* ----------------------- 微信 remove end   ----------------------------------*/