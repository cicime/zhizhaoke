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
  answers: './data/question_detail.json'
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

io.user = {
  userCollect: './data/question_list_collect.json',
  userRmoveCollect: './data/question_list_collect.json',
};