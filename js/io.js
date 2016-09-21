/**
 * Created by Toma on 2016/9/17.
 * 后台接口,微信接口
 */
var io = window.io || {};

// 请求信息 - 每次请求都会装载此数据
io.userInfo = {
  'openId':'sd1f211'
};

io.question_list = {
  // 列表页 - 分页返回全部问题
  content: 'data/question_list.json'
};
io.question_detail = {
  // 问题详情页
  content: 'data/question_detail.json',
  // 加载更多的答案
  answers: 'data/question_detail.json'
};
io.question = {
  // 问题 - 点赞 收藏 举报 - 返回状态码
  collectCount: 'data/question_list.json',
  praiseCount: 'data/question_list.json',
  reportCount: 'data/question_list.json'
};