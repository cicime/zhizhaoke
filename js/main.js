/**
 * Created by Toma on 2016/9/19.
 */
var cc = window.cc || {};
cc.programs = new function () {
  "use strict";
  var pro = this;

  // 初始化页面
  $.init();
  // 动画完成后 重置页面
  Vue.use(VueAnimatedList);
  Vue.transition('qlitem', {
    afterEnter: function () { $.refreshScroller(); }
  });

  var Util = (function () {
    var prefix = 'ZZK_';
    return {
      // 写人浏览器缓存中
      sionFetch: function (key) {
        return JSON.parse(sessionStorage.getItem(prefix + key) || '{}');
      },
      sionSave: function (key, val) {
        return sessionStorage.setItem(prefix + key, JSON.stringify(val));
      },
      // 地址写入时间戳，防止再次加载时引用缓存
      state: function (title) {
        var cate = location.search;
        var hash = location.hash;
        var tag = /\?/.test(cate) && !/\?ref_c=/.test(cate) ? '&' : '?';
        cate = cate.replace(/(\?|&)ref_c=\d+/, '');
        history.replaceState({tit: title}, title, cate + tag + 'ref_c=' + new Date().getTime() + hash);
      },
      createURL: function (blob) {
        if (window.URL) {
          return window.URL.createObjectURL(blob);
        } else if (window.webkitURL) {
          return window.webkitURL.createObjectURL(blob);
        } else {
          return null;
        }
      },
      f: function (a, g) {
        var g = g || 'y-m-d',
          date = new Date(a),
          y = date.getFullYear(),
          m = date.getMonth() + 1,
          d = date.getDate(),
          m = m < 10 ? '0' + m : m,
          d = d < 10 ? '0' + d : d;
        return g.replace(/y/, y).replace(/m/, m).replace(/d/, d);
      },
      // 转换对象
      parseParam: function (par) {
        var pp = function (param, k) {
          var v = '';
          for(var p in param){
            if(param[p] instanceof Object){
              v += pp(param[p], k ? k + '[' + p + ']' : p);
            }else{
              v += '&' + (k ? k + '[' + p + ']=' : p + '=') + param[p];
            }
          }
          return v;
        };
        return encodeURI(pp(par));
      },
      hashTabs: function () {
        $('.tab-link').on('click', function () {
          window.location.hash = this.href.replace(/^.*#/,'');
        });
        $(window).on('hashchange', function () {
          hashed()
        });
        function hashed() {
          var ha = location.hash.substr(1) || 'tab1'
          $('.page').addClass('page-current');
          $('.J_' + ha).trigger('click');
        }
        hashed();
      }
    }
  })();


  /**
   * ====================================================================
   * 问题列表
   * ====================================================================
   */
  pro.questionList = function () {
    var self = {};
    var queItem = pro.que_item();

    // 读取session中的数据
    var stor = Util.sionFetch('LIST');
    var loadin = true;

    var vue = new Vue({
      el: 'body',
      data: {
        page: stor.page || 0,
        problemList: stor.problemList || []
      },
      components: [queItem],
      methods: {
        addProblemList: function (callback) {
          loadin && self.fetchData(this.page, function (data) {
            self.renderData(data);
            typeof callback == 'function' && callback();
          });
        },
        saveStr: function (url) {
          Util.sionSave('LIST', {
            top: $('.content').scrollTop(),
            page: this.page,
            problemList: this.problemList
          });
          Util.state('问题列表');
          window.location = url;
        }
      },
      events: {
        removecollect: function (index) {
          this.problemList.splice(index, 1);
        }
      }
    });

    self.data = {};
    self.data.info = io.userInfo;
    self.url = io.questionList.content;
    self.fetchData = function (page, callback) {
      loadin = false;
      self.data.page = page;
      $.ajax({
        url: self.url,
        type: 'get',
        data: self.data,
        dataType: 'json',
        beforeSend: function () {
          $('.J_que_list').append('<p class="preloader-line"><i class="preloader"></i></p>');
          $.refreshScroller();
        },
        success: function (data) {
          loadin = true;
          $('.preloader-line').remove();
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          loadin = true;
          $('.preloader-line').remove();
          $.alert('请求超时');
        }
      });
    };

    self.renderData = function (data) {
      vue.page++;
      data.problemList.forEach(function (ele) {
        vue.problemList.push(ele);
        vue.$nextTick(function () {
          $.refreshScroller();
          stor.top && $('.content').scrollTop(stor.top);
          Util.sionSave('LIST', {});
        });

      });
    };

    self.bindEvents = function () {
      // 上拉加载更多
      $(document).on('infinite', '.infinite-scroll-bottom', vue.addProblemList);
      // 普通下拉刷新
      $(document).on('refresh', '.pull-to-refresh-content', function (e) {
        vue.page = 0;
        setTimeout(function () {
          location.reload();
          $.pullToRefreshDone('.pull-to-refresh-content');
        }, 200)
      });
    };

    self.init = function () {
      self.bindEvents();
      vue.addProblemList();
    };

    return self;
  };

  /**
   * ====================================================================
   * 问题详情
   * ====================================================================
   */
  pro.questionDetail = function () {
    var self = {};
    var queListItem = pro.que_item();
    var loadin = true;
    // 主数据
    self.urlContent = io.questionDetail.content;

    var vue = new Vue({
      el: 'body',
      data: {
        page: 0,
        item: {},
        answers: [],
        imglist: [],
        imgsever: [],
        maxlen: 6,
        ans:'',
        videoUrl: '',
        nimin: false,
        voice: {}
      },
      components: [queListItem],
      methods: {
        addProblem: function () {
          var _this = this;
          self.fetchData(self.urlContent, function (data) {
            _this.item = data.problem;
            _this.answers = data.answers;
          });
        },
        // 更多的回答
        addAnswers: function () {
          var _this = this;
          this.page++;
          loadin && self.fetchData(io.questionDetail.answers, function (data) {
            data.answers.forEach(function (ele) { _this.answers.push(ele) });
          });
        },
        addimg: function () {
          // todo 图片上传接口
          var _this = this;
          var len = _this.maxlen - _this.imglist.length;
          wx.chooseImage({
            count: len, // 默认9
            sizeType: ['original', 'compressed'],
            sourceType: ['album', 'camera'],
            success: function (res) {
              var localIds = res.localIds;
              localIds.forEach(function (ele) {
                _this.imglist.push(ele)
              });
              if (_this.imglist.length >= 6) $('.J_addimg').hide();
            }
          });

        }
      }
    });
    self.vue = vue;

    self.fetchData = function (url, callback) {
      loadin = false;
      $.ajax({
        url: url,
        type: 'get',
        data: {
          info: io.userInfo,
          queId: vue.item.id,
          answerspage: vue.page
        },
        dataType: 'json',
        beforeSend: function () {
          $('.J_que_list').append('<p class="preloader-line"><i class="preloader"></i></p>');
          $.refreshScroller();
        },
        success: function (data) {
          loadin = true;
          $('.preloader-line').remove();
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          loadin = true;
          $('.preloader-line').remove();
          $.alert('请求超时');
        }
      });
    };

    self.bindEvents = function () {
      $(document).on('infinite', '.infinite-scroll-bottom',function() {
        vue.addAnswers();
      });
      // 录音
      pro.voice(function (v) {
        vue.voice = v;
      },function (v) {
        vue.voice = {};
      });
      $('#sub').on('click', self.submit);
    };

    // 提交验证
    self.submit = function () {
      if(!$.trim(vue.ans) && !vue.voice.localId){
        $.alert('请使用文字或语音回答');
        return;
      }
      if($.trim(vue.ans) && vue.ans.length < 20){
        $.alert('文字长度不能少于20字');
        return;
      }
      $(this).prop('disabled', true);

      // 如果有录音先上传录音
      var canuse = 1;
      if(vue.voice.localId){
        canuse++;
        wx.uploadVoice({
          localId: vue.voice.localId,
          isShowProgressTips: 1, // 默认为1，显示进度提示
          success: function (res) {
            vue.voice.serverId = res.serverId;
            canuseFoo();
          }
        });
      }
      // 如果有图片
      var i = 0;
      if(vue.imglist.length){
        canuse++;
        uploadImg();
      }

      function uploadImg() {
        wx.uploadImage({
          localId: vue.imglist[i],
          isShowProgressTips: 1,
          success: function (res) {
            i++;
            vue.imgsever.push(res.serverId);
            if (i < vue.imglist.length) {
              uploadImg();
            }else{
              canuseFoo();
            }
          },
          fail: function (res) {
            alert(JSON.stringify(res));
          }
        });
      }

      function canuseFoo() {
        canuse--;
        if(canuse == 0){
          self._resolveData(function () {
            // 提交完成
            $.alert('提交成功');
          });
        }
      }

      canuseFoo();
    };

    self._resolveData = function (callback) {
      $.ajax({
        url: io.questionDetail.submit,
        type: 'get',
        data: {
          info: io.userInfo,
          answer: vue.ans,
          voice: vue.voice.serverId,
          voicelen: vue.voice.len,
          images: vue.imgsever,
          video: vue.videoUrl,
          nimin: vue.nimin
        },
        dataType: 'json',
        beforeSend: function () {
          $.showIndicator();
          $.refreshScroller();
        },
        success: function (data) {
          $.hideIndicator();
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          $.hideIndicator();
          $.alert('请求超时');
        }
      });
    };

    self.init = function () {
      self.bindEvents();
      vue.addProblem();
    };

    // self.init();
    return self;
  };


  /**
   * ====================================================================
   * 录音接口
   * ====================================================================
   */
  pro.voice = function (add, remove) {
    var ele = '';
    var time = '';
    var touch = false;
    var voice = {
      localId: '',
      serverId: '',
      len: 0
    };
    var events = {
      touchstart: function () {
        document.body.style.webkitUserSelect = 'none';
        wx.startRecord({
          success: function () {
            touch = true;
            ele = $('.answer-voice');
            ele.find('.J_paly_voice').show();
            ele.addClass('play');
            time = setInterval(function () {
              voice.len++;
              $('.J_time').html(voice.len + 's');
            }, 1000);
          },
          cancel: function () {
            alert('已拒绝授权录音');
          }
        });

      },
      touchend: function () {
        if(!touch) return;
        wx.stopRecord({
          success: function (res) {
            voice.localId = res.localId;
            clearInterval(time);
            ele.removeClass('play').addClass('min');
            add(voice);
          },
          fail: function (res) {
            alert(JSON.stringify(res));
          }
        });
      }
    };
    $(document).on(events, '.answer-voice a');

    // 播放
    $(document).on('click','.J_paly_voice', function () {
      wx.playVoice({
        localId: voice.localId,
      });
      ele.find('.J_paly_voice').addClass('cc-audio-bg');
      wx.onVoicePlayEnd({
        success: function (res) {
          ele.find('.J_paly_voice').removeClass('cc-audio-bg');
        }
      });
    });
    // 移除
    $(document).on('click','.J_del_voice', function (e) {
      wx.stopVoice({
        localId: voice.localId
      });
      voice.len = 0;
      ele.removeClass('min');
      $('.J_time').html('0s');
      ele.find('.J_paly_voice').hide().removeClass('cc-audio-bg');
      remove(voice);
    });
  };


  /**
   * ====================================================================
   * 发布问题
   * ====================================================================
   */
  pro.issue = function () {
    var self = {};

    var vue = new Vue({
      el: '#formZhizhao',
      data:{
        imglist:[],
        imgsever: [],
        maxlen: 6,
        ans:'',
        tag: [],
        nimin: false,
        voice: {}
      },
      methods:{
        addimg: function (e) {
          var _this = this;
          var len = _this.maxlen - _this.imglist.length;
          wx.chooseImage({
            count: len, // 默认9
            sizeType: ['original', 'compressed'],
            sourceType: ['album', 'camera'],
            success: function (res) {
              var localIds = res.localIds;
              localIds.forEach(function (ele) {
                _this.imglist.push(ele)
              });
              if (_this.imglist.length >= 6) $('.J_addimg').hide();
            }
          });
        }

      }
    });

    self.bindEvents = function () {
      $('.tag-showall').on('click',function () {
        $('.tag-list').toggleClass('showall');
      });
      // 录音
      pro.voice(function (v) {
        vue.voice = v;
      },function (v) {
        vue.voice = {};
      });
      $('#sub').on('click', self.submit);
    };

    // 提交验证
    self.submit = function () {
      if($.trim(vue.ans)){
        $.alert('问题描述不能为空');
        return;
      }
      if(vue.ans.length < 20){
        $.alert('文字长度不能少于20字');
        return;
      }
      if(!vue.tag.length){
        $.alert('请添加问题标签');
        return;
      }
      $(this).prop('disabled', true);

      // 如果有录音先上传录音
      var canuse = 1;
      if(vue.voice.localId){
        canuse++;
        wx.uploadVoice({
          localId: vue.voice.localId,
          isShowProgressTips: 1, // 默认为1，显示进度提示
          success: function (res) {
            vue.voice.serverId = res.serverId;
            canuseFoo();
          }
        });
      }
      // 如果有图片
      var i = 0;
      if(vue.imglist.length){
        canuse++;
        uploadImg();
      }

      function uploadImg() {
        wx.uploadImage({
          localId: vue.imglist[i],
          isShowProgressTips: 1,
          success: function (res) {
            i++;
            vue.imgsever.push(res.serverId);
            if (i < vue.imglist.length) {
              uploadImg();
            }else{
              canuseFoo();
            }
          },
          fail: function (res) {
            alert(JSON.stringify(res));
          }
        });
      }

      function canuseFoo() {
        canuse--;
        if(canuse == 0){
          self._resolveData(function () {
            // 提交完成
            $.alert('提交成功');
          });
        }
      }

      canuseFoo();
    };

    self._resolveData = function (callback) {
      $.ajax({
        url: io.quiz.content,
        type: 'get',
        data: {
          info: io.userInfo,
          answer: vue.ans,
          voice: vue.voice.serverId,
          voicelen: vue.voice.len,
          images: vue.imgsever,
          tag: vue.tag,
          nimin: vue.nimin
        },
        dataType: 'json',
        beforeSend: function () {
          $.showIndicator();
          $.refreshScroller();
        },
        success: function (data) {
          $.hideIndicator();
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          $.hideIndicator();
          $.alert('请求超时');
        }
      });
    };

    self.init = function () {
      self.bindEvents();
    };

    self.init();
  };


  /**
   * ====================================================================
   * 专家支招
   * ====================================================================
   */
  pro.specialist = function () {
    var self = {};
    var chooseDate = pro.chooserDate();
    var timesAll = function () {
      var arr = {};
      var MINT = 8;
      var MAXT = 20;
      for (var i = MINT; i <= MAXT; i++) {
        arr[i + ':00-' + (i + 1) + ':00'] = {check: false, value: '', txt: ''};
      }
      return arr;
    };

    self.timeUrl = io.specialist.times;
    self.vue = new Vue({
      el: 'body',
      component: ['chooseDate'],
      data: {
        times: timesAll(),
        date: Util.f(new Date()),
        ans: '',
        tonyi: true
      },
      methods:{
        timesChange: function () {
          var _this = this;
          self.fetchData(self.timeUrl, {
            date: _this.date,
            info: io.userInfo
          },function (data) {
            $.extend(_this.times, data.times);
          });
        }
      },
      events: {
        "date": function (de) {
          this.date = de;
          this.times = timesAll();
          this.timesChange();
        }
      }
    });

    self.fetchData = function (url, data, callback) {
      $.ajax({
        url: url,
        type: 'get',
        data: data,
        dataType: 'json',
        beforeSend: function () {
          $.showIndicator();
          $.refreshScroller();
        },
        success: function (data) {
          $.hideIndicator();
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          $.hideIndicator();
          $.alert('请求超时');
        }
      });
    };

    self.bindEvents = function () {
      $('.cho-date').calendar({
        onClose:function () {
          $('.picker-calendar').remove();
        }
      });
      // 提交数据
      $('#sub').on('click',function () {
        var tr = 0;
        $('.cho-item input').each(function (i, ele) {
          var val = $(ele).val();
          val && val !='on' && tr++;
        });
        if(!tr){
          $.alert('请选择预约时间');
          return;
        }
        if(!$.trim(self.vue.ans)){
          $.alert('请填写咨询内容');
          return;
        }
        if(!self.vue.tonyi){
          $.alert('请同意咨询协议');
          return;
        }
        var formData = $('#formContent').serialize();
        formData = formData + Util.parseParam({
            info: io.userInfo,
            date: self.vue.date
          });
        self.fetchData(io.specialist.form, formData, function (data) {
          location.href = 'specialist-pay.html';
        });
      });
    };

    self.init = function () {
      self.vue.timesChange();
      self.bindEvents();
    };

    return self;
  };


  /**
   * ====================================================================
   * 我的问题
   * ====================================================================
   */
  pro.userQuestion = function () {
    var list = pro.questionList();
    list.url = io.userQuestionList.content;
    list.data.userQuestion = true;
    list.init();
  };
  // 我的问题详情
  pro.userQuestionDetail = function () {
    var detail = pro.questionDetail();
    detail.urlContent = io.userQuestionDetail.content;
    // 监听用户设置最佳答案
    detail.vue.$on('zjda',function () {
      this.item.zjda = true;
    });
    // 追问
    detail.vue.$on('tapAsked', function (que) {
      if(que && que.length < 20){
        alert('追加问题不能小于20字');
        return;
      }
      if(!que && !detail.vue.voice.serverId){
        alert('没有内容~');
        return;
      }
      $.ajax({
        url: io.userQuestionDetail.asked,
        type: 'get',
        data: {
          info: io.userInfo,
          que: que,
          id: detail.vue.item.id,
          voice: detail.vue.voice
        },
        dataType: 'json',
        beforeSend: function () {
          $.showIndicator();
          $.refreshScroller();
        },
        success: function (data) {
          $.hideIndicator();
          data.resultCode <= 1000 ? function (d) {
            $.closeModal();
            // todo 显示追问结果？
            console.log('追问-提交');
          }(data) : $.alert(data.message);
        },
        error: function () {
          $.hideIndicator();
          $.alert('请求超时');
        }
      });
    });

    detail.init();
  };


  /**
   * ====================================================================
   * 我的支招
   * ====================================================================
   */
  pro.userZhizhao = function () {
    var self = {};
    var queAns = pro.queAns();
    var vue;
    // 读取session中的数据
    var store = Util.sionFetch('ZHIZHAO');

    self.vue = function () {
      return new Vue({
        el: 'body',
        data: {
          page: store.page || 0,
          listBest: store.listBest || [],
          listLuck: store.listLuck || [],
          listListen: store.listListen || [],
          listOther: store.listOther || []
        },
        components: [queAns],
        methods: {
          addProblemList: function () {
            var _this = this;
            self.fetchData(this.page, function (data) {
              _this.listBest = data.list_best;
              _this.listLuck = data.list_luck;
              _this.listListen = data.list_listen;
              _this.listOther = data.list_other;
              _this.$nextTick(function () {
                $.refreshScroller();
                store.top && $('.content').scrollTop(store.top);
                Util.sionSave('ZHIZHAO', {});
              });
            });
          }
        },
        events: {
          linked: function (url) {
            Util.sionSave('ZHIZHAO', {
              top: $('.content').scrollTop(),
              page: this.page,
              listBest: this.listBest,
              listLuck: this.listLuck,
              listOther: this.listOther,
              listListen: this.listListen
            });
            Util.state('我的支招');
            window.location.href = url;
          }
        }
      });
    };

    self.url = io.userZhizhao.content;
    self.data = {};
    self.fetchData = function (page, callback) {
      self.data.info = io.userInfo;
      self.data.page = page;
      $.ajax({
        url: self.url,
        type: 'get',
        data: self.data,
        dataType: 'json',
        beforeSend: function () {
          $('.J_que_list').append('<p class="preloader-line"><i class="preloader"></i></p>');
          $.refreshScroller();
        },
        success: function (data) {
          $('.preloader-line').remove();
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          $('.preloader-line').remove();
          $.alert('请求超时');
        }
      });
    };

    self.bindEvents = function () {
      Util.hashTabs();
    };

    self.init = function () {
      vue = self.vue()
      vue.addProblemList();
      self.bindEvents();
    };

    return self;
  };


  /**
   * ====================================================================
   * 我的偷听
   * ====================================================================
   */
  pro.userListen = function () {
    var queAns = pro.queAns();
    var zhi = pro.userZhizhao()
    var store = Util.sionFetch('LISTEN');

    zhi.url = io.userListen.content;
    zhi.vue = function () {
      return new Vue({
        el: 'body',
        data: {
          page: store.page || 0,
          listMine: store.listMine || [],
          listLuck: store.listLuck || [],
        },
        components: [queAns],
        methods: {
          addProblemList: function () {
            var _this = this;
            zhi.fetchData(this.page, function (data) {
              _this.listMine = data.list_minelisten;
              _this.listLuck = data.list_lucklisten;
              _this.$nextTick(function () {
                $.refreshScroller();
                store.top && $('.content').scrollTop(store.top);
                Util.sionSave('LISTEN', {});
              });
            });
          }
        },
        events: {
          linked: function (url) {
            Util.sionSave('LISTEN', {
              top: $('.content').scrollTop(),
              page: this.page,
              listMine: this.listMine,
              listLuck: this.listLuck,
            });
            Util.state('我的支招');
            window.location.href = url;
          }
        }
      });
    };
    zhi.init();
  };


  /**
   * ====================================================================
   * 我的时间
   * ====================================================================
   */
  pro.userTimes = function () {
    var spe = pro.specialist();
    spe.timeUrl = io.specialist.times;
    spe.init();
  };


  /**
   * ====================================================================
   * 我的收藏
   * ====================================================================
   */
  pro.userCollect = function () {
    var self = {};
    var list = pro.questionList();
    list.url = io.user.userCollect;
    list.data.userCollect = true;
    list.init();
  };


  /**
   * ====================================================================
   * 我的预约
   * ====================================================================
   */
  pro.userSubscribe = function () {
    var self = {};

    self._resolveData = function (data, callback) {
      data.info = io.userInfo;
      $.ajax({
        url: io.userSubscribe.content,
        type: 'get',
        data: data,
        dataType: 'json',
        beforeSend: function () {
          $.refreshScroller();
        },
        success: function (data) {
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          $.alert('请求超时');
        }
      });
    };

    self.bindEvents = function () {
      $('.J_del').on('click',function () {
        var box = $(this).parents('.J_box');
        var id = box.data('id');
        $.confirm('确定要删除吗？', function () {
          self._resolveData({
            info: io.userInfo,
            indentId: id,
            type: 'remove'
          },function () {
            box.remove();
          });
        });
      });
      Util.hashTabs();
    };

    self.start = function () {
      var size = $('.start-box').data('size');
      function resizeStart(z) {
        $('.start-box').data('size', z);
        for(var i = 1; i<= 5; i++){
          var start = $('.start-box i[data-no="'+i+'"]');
          if(i <= z){
            start.removeClass('icon-favor').addClass('icon-biaoxingfill');
          }else{
            start.removeClass('icon-biaoxingfill').addClass('icon-favor');
          }
        }
      }
      resizeStart(size);
      $(document).on('click','.start-box i',function (e) {
        resizeStart($(e.target).data('no'));
      });
      $(document).on('click','#sub', self.submit);
    };

    self.submit = function () {
      var ans = $.trim($('#ans').val());
      var start = $('#start').data('size');
      if(!ans){
        $.alert('评价描述不能为空');
        return;
      }
      self.sub({
        ans: ans,
        start: start,
        info: io.userInfo
      },function () {
        $.alert('提交成功');
      });
    };

    self.sub = function (data, callback) {
      $.ajax({
        url: io.userSubscribe.evaluate,
        type: 'get',
        data: data,
        dataType: 'json',
        beforeSend: function () {
          $.refreshScroller();
        },
        success: function (data) {
          data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
        },
        error: function () {
          $.alert('请求超时');
        }
      });
    };

    self.init = function () {
      self.bindEvents();
    };

    return self;
  };


  /**
   * ====================================================================
   * 用户个人中心 - 设置
   * ====================================================================
   */
  pro.user = function () {
    var self = {};

    self.bindEvents = function () {
      $(document).on('click','#btnChangePho',function () {
        $.modal({
          extraClass: 'cc-modal',
          title: '更改手机号码 <i class="iconfont close-modal">&#xe61b;</i>',
          text: '<div class="input-pho-grop"><input type="text" class="cc-input" placeholder="请输入新的手机号"></div>' +
                '<div class="input-pho-grop"><div class="cc-cell"><input type="text" class="cc-input" placeholder="验证码"></div>' +
                '<div class="cc-cell"><a href="#" class="button button-warning cp-a">获取验证码</a></div></div>',
          buttons: [
            {
              text: '确认',
              onClick: function() {
                $.alert('提交');
              }
            },
          ]
        });
      });
      $(document).on('click','.modal-overlay, .close-modal',function () {
        $.closeModal();
      });
    };
    self.init = function () {
      self.bindEvents();
    };
    self.init();
  };



  /**
   * ====================================================================
   * vue 组件 1. 问题 item
   * ====================================================================
   */
  pro.que_item = function () {
    // 保存上一个音频的播放状态
    window.lastMedia = {};
    // 列表页 item
    return Vue.component('que-item', {
      template: pro.model.que_item_m,
      data: function () {
        return {
          item: {}
        }
      },
      /**
       * item: 数据
       * ctl: 下面按钮是否可用
       * com: 评论区
       * offermoney: 显示赏金
       * collect: 显示可删除收藏的图标
       * index: 数据下标
       * asked: 是否显示追问按钮
       * zjda: 是否拥有最佳答案
       * userqd: 我的问题详情
       * luckhandle: 显示幸运红包
       * xytt: 显示幸运偷听
       */
      props: ['item','ctl','com','offermoney','collect','index','asked','zjda','userqd','luckhandle','xytt'],
      computed: {
        media: function () {
          var media = new Audio();
          media.src = this.item.attachment.accessurl || null;
          return media;
        }
      },
      methods: {
        // 音频播放接口
        playAudio: function (src, event) {
          var _this = this;
          var ele = event.currentTarget;
          var media = this.media;

          var events = {
            loadstart: function () {
              $(ele).append('<i class="rotate-min iconfont">&#xe601;</i>');
            },
            playing: function () {
              $(ele).addClass('cc-audio-bg');
            },
            // canplaythrough
            canplay: function () {
              $(ele).find('.rotate-min').remove();
            },
            ended: function () {
              _this.pauseAudio(ele, media);
            }
          }

          if (media.paused) {
            lastMedia.media && _this.pauseAudio(lastMedia.ele, lastMedia.media);
            lastMedia.media = media;
            lastMedia.ele = ele;

            media.play();
            $(media).on(events);
          } else {
            _this.pauseAudio(ele, media);
          }
        },
        // 音频暂停
        pauseAudio: function (ele, media) {
          $(ele).removeClass('cc-audio-bg');
          media.pause();
        },
        // 图片浏览器
        photoBrowser: function (i) {
          var imgarr = []
          this.item.aList.forEach(function (el) {
            imgarr.push(el.filenamestring);
          });
          var photoBrowser = $.photoBrowser({
            photos: imgarr,
            initialSlide: i,
            navbar: false,
            toolbar: false,
            theme: 'exposed',
            type: 'popup',
            onOpen: function () {
              $('.swiper-container').append('<i class="iconfont close-swiper">&#xe61b;</i>');
            },
            onClose: function () {
              photoBrowser = null;
              var popup = $('.popup');
              popup.addClass('modal-out');
              $('.popup-overlay').remove();
              setTimeout(function () {
                popup.remove();
              },200);
            },
            onClick: function () {
              photoBrowser.close();
            }
          });
          photoBrowser.open();
        },
        // 收藏
        collectCount: function (e) {
          var _this = this;
          var ele = $(e.currentTarget);
          if(_this.ctl) return false;
          if (!ele.hasClass('J_colled')) {
            ele.addClass('J_colled').find('i').html('&#xe622;');
            _this.item.collectCount++;
            _this.fetchData(io.question.collectCount,{ type:'collect', ctr: 1 },function () { });
          } else {
            ele.removeClass('J_colled').find('i').html('&#xe600;');
            _this.item.collectCount--;
            _this.fetchData(io.question.collectCount,{ type:'collect', ctr: 0 },function () { });
          }
        },
        // 点赞
        praiseCount: function (e) {
          var _this = this;
          var ele = $(e.currentTarget);
          if(_this.ctl) return false;
          if (!ele.hasClass('J_praised')) {
            ele.addClass('J_praised').find('i').html('&#xe620;');
            _this.item.praiseCount++;
            _this.fetchData(io.question.praiseCount,{ type:'praise', ctr: 1 },function () { });
          } else {
            ele.removeClass('J_praised').find('i').html('&#xe621;');
            _this.item.praiseCount--;
            _this.fetchData(io.question.praiseCount,{ type:'praise', ctr: 0 },function () { });
          }
        },
        fetchData: function (url, data, callback) {
          data.info = io.userInfo;
          data.id = this.item.id;
          $.ajax({
            url: url,
            type: 'get',
            data: data,
            dataType: 'json',
            success: function (data) {
              data.resultCode <= 1000 ? callback(data) : $.alert(data.message);
            },
            error: function () {
              $.alert('请求超时');
            }
          });
        },
        // 举报
        reportCount: function () {
          var _this = this;
          if(_this.ctl) return false;
          $.modal({
            extraClass: 'cc-modal',
            title: '举报 <i class="iconfont close-modal">&#xe61b;</i>',
            text: pro.model.jubao_m,
            buttons: [
              {
                text: '确认',
                onClick: function() {
                  $.alert('提交')
                }
              },
            ]
          });
          $(document).on('click','.modal-overlay, .close-modal',function () {
            $.closeModal();
          });
        },
        // todo 解锁 微信支付接口
        lockon: function () {
          var _this = this;
          $.confirm('<p class="fz-m">偷听需要一元费用，确认偷听吗？</p>', '<i class="logo-ico"></i>', function () {
            $.alert('支付接口');
            // 异步解锁
            _this.item.lock = false;
            setTimeout( $.refreshScroller, 200);
          });
        },
        // 移除收藏
        removecollect: function (id) {
          var _this = this;
          _this.fetchData(io.user.userRmoveCollect, {type:'removecollect'}, function () {
            _this.$dispatch('removecollect',_this.index);
          });
        },
        // 设置最佳答案
        bestAns: function () {
          var _this = this;
          $.confirm('<p class="fz-m">确定设为最佳答案吗？</p>', '<i class="logo-ico"></i>', function () {
            _this.item.zjda = true;
            _this.$dispatch('zjda');
            _this.fetchData(io.userQuestionDetail.zjda,{ type:'zjda', ctr: 1 },function () { });
          });
        },
        // 追问
        tapAsked: function () {
          var _this = this;
          $.modal({
            title: '追问 <i class="iconfont close-modal">&#xe61b;</i>',
            extraClass: 'cc-modal asked-box',
            text: pro.model.tapAsked_m
          });
          $(document).on('click','.modal-overlay, .close-modal',function () {
            $.closeModal();
          });
          $(document).on('click','#sub',function () {
            var que = $.trim($('#queAsk').val());
            _this.$dispatch('tapAsked', que);
          });
        },
        // 打开红包
        openPacker: function () {
          var _this = this;
          if(_this.item.luck.open) return;
          $.modal({
            extraClass: 'red-packer',
            text: '<a href="javascript:" class="user-head-min" style="background-image: url('+ _this.item.headimgurl +')"></a>' +
                  '<span class="user-name">'+ (_this.item.userName || _this.item.nickname) +'</span>' +
                  '<a href="javascript:" class="J_redpacker"></a><a href="javascript:" class="J_closeModal"></a>',
          });
          $(document).on('click','.modal-overlay, .J_closeModal',function () {
            $.closeModal();
          });
          $(document).on('click','.J_redpacker',function () {
            // todo 打开微信红包
            console.log('微信红包');
            $.closeModal();
          });
        }
      }
    });
  };

  // 时间选择器
  pro.chooserDate = function () {
    return Vue.component('chooser-date', {
      template: pro.model.chooserDate_m,
      data: function () {
        return {};
      },
      props: ['date','times','sel'],
      methods: {
        dateChange: function (de) {
          this.$dispatch('date', de);
        },
        nextDate: function () {
          var date = new Date(this.date);
          var newDate = date.setDate(date.getDate() + 1);
          this.$dispatch('date', Util.f(newDate));
        },
        prevDate: function () {
          var date = new Date(this.date);
          var newDate = date.setDate(date.getDate() - 1);
          this.$dispatch('date', Util.f(newDate));
        },
        reser: function (e, use) {
          if(!use) return false;
          if(this.sel){
            // todo 点击时间
            console.log('链接');
            return;
          }
          var _this = $(e.currentTarget);
          var thischeck = _this.find('input');
          if(thischeck.prop('checked')){
            thischeck.val('').prop('checked', false);
            _this.find('.cho-text').html('');
            return;
          }
          $.modal({
            title: '选择咨询的类型 <i class="iconfont close-modal">&#xe61b;</i>',
            extraClass: 'cc-modal',
            text: pro.model.chooser_m,
            buttons: [{
                text: '确认',
                onClick: function() {
                  var check = $('.J_zixun .item-content').find('input:checked');
                  var val = check.val();
                  var txt = check.siblings('.item-inner').text();
                  if(val){
                    thischeck.val(val).prop('checked', true);
                    _this.find('.cho-text').html(txt);
                  }
                }
              }]
          });
          $(document).on('click','.modal-overlay, .close-modal',function () {
            $.closeModal();
          });
        }
      }
    });
  };

  // 单个 问题+答案组合
  pro.queAns = function () {
    var queItem = pro.que_item();
    return Vue.component('que-ans', {
      template: '<que-item :item="ele.question" ctl="true" class="next-ans" @click.stop.prevent="url(ele.question.url)"></que-item>' +
                '<que-item :item="ele.answer" ctl="true" com="true" :luckhandle="luckhandle" :xytt="xytt" :class="{ \'next-ans\': lihandle}"></que-item>' +
                '<div class="cc-minlist" v-if="lihandle"><div class="cc-list-hd"><span class="cc-li-l">偷听({{ele.listen.len}})</span> <span class="cc-li-r">共{{ele.listen.allmoney}}元</span></div>' +
                '<ul class="cc-list-con" :class="{ \'hidemore\' : showmore }">' +
                  '<li v-for="i in ele.listen.list">' +
                    '<span class="cc-li-l"><i class="user-head-min sx"style="background-image: {{\'url(\'+i.headimgurl+\')\'}}"></i> {{ i.userName || i.nickname }}</span>' +
                    '<span class="cc-li-r"><i class="iconfont">&#xe613;</i> {{i.money}}</span></li>' +
                  '' +
                '</ul><span v-if="ele.listen.len > 3" @click="showMore()" class="showmore">' +
                  '<i class="iconfont" v-if="hidemore">&#xe616;</i><i v-else class="iconfont">&#xe61a;</i></span></div>',
      data: function () {
        return {
          showmore: false,
          hidemore: true,
        }
      },
      computed: {
        showmore: function () {
          return this.ele.listen.len > 3 && this.hidemore;
        }
      },
      props: ['ele','luckhandle','lihandle','xytt'],
      component: ['queItem'],
      methods: {
        url: function (url) {
          this.$dispatch('linked', url);
        },
        showMore: function () {
          this.hidemore = !this.hidemore;
        }
      }
    })
  };
//

  /**
   * ====================================================================
   * HTML 模板
   * ====================================================================
   */
  pro.model = {};
  // 列表
  pro.model.que_item_m =
    '<article class="cc-card" :class="[{\'zjda\': item.zjda && com},{\'xytt\': item.xytt && com && xytt}]">' +
      '<div class="cc-card-hd">' +
        '<span v-if="!item.isSecret"><i class="user-head-min" v-if="item.headimgurl" style="{{\'background-image: url(\'+item.headimgurl+\')\'}}"></i> {{ item.userName || item.nickname }}</span>' +
        '<span v-else><i class="user-head-min"></i> 匿名</span><span v-if="collect" @click.stop.prevent="removecollect(item.id)" class="iconfont cc-card-delet">&#xe60c;</span>' +
        '<time v-if="!com && !offermoney">{{item.createTimeString}}</time>' +
        '<span v-if="offermoney" class="cc-card-row"><i class="iconfont">&#xe613;</i> {{item.offerMoney.toFixed(2)}}</span>' +
        '<span v-if="com && userqd && !zjda" class="cc-card-row min" @click="bestAns()">设为最佳答案</span>' +
        '<span v-if="luckhandle && item.luck.own" class="cc-card-row min" @click="openPacker()"><i class="iconfont">&#xe612;</i>{{item.luck.open? item.luck.money+\'元包\': \'未开红包\'}}</span></div>' +
      '<div class="cc-card-con" v-if="!item.lock">' +
          '<p v-if="item.contentText">{{item.contentText}}</p><a href="javascript:" class="cc-asked" v-if="asked" @click="tapAsked()">追问</a>' +
        '<div class="cc-audio" v-if="item.attachment.accessurl" @click.stop.prevent="playAudio(item.attachment.accessurl, $event)">' +
          '<span>{{item.attachment.accesslen}}s</span> <i class="iconfont">&#xe603;</i></div>' +
        '<div class="cc-card-imglist" v-if="item.aList.length > 0">' +
          '<a class="imglist-i" v-for="img in item.aList" @click.stop.prevent="photoBrowser($index)" style="{{\'background-image: url(\'+img.filenamestring+\')\'}}" href="javascript:"></a>' +
        '</div>' +
          '<a class="cc-card-stu" href="javascript:" v-if="item.typeId"><i class="iconfont">&#xe619;</i> {{item.typeId}}</a>' +
      '</div><div v-else class="cc-lockin" @click="lockon()">' +
          '<span class="iconfont">&#xe623;</span>' +
      '</div>' +
      '<div class="cc-card-footer">' +
        '<a href="javascript:" @click.stop.prevent="collectCount($event)" v-if="!com"><i class="iconfont">&#xe600;</i> {{item.collectCount}}</a>' +
        '<a href="javascript:" @click.stop.prevent="praiseCount($event)"><i class="iconfont">&#xe621;</i> {{item.praiseCount}}</a>' +
        '<a href="javascript:" v-if="!com"><i class="iconfont">&#xe602;</i> {{item.replyCount}}</a>' +
        '<a href="javascript:"><i class="iconfont">&#xe606;</i> {{item.eavesdropCount}}</a>' +
        '<a href="javascript:" @click.stop.prevent="reportCount($event)">举报 {{item.reportCount}}</a>' +
      '</div>' +
    '</article>';

  // 举报弹窗
  pro.model.jubao_m = '<div class="list-block cc-list-b">' +
    '<h4 class="cc-common-title">请选择举报该用户的原因</h4><ul>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">发布不适当的内容对我造成骚扰</div></div></label></li>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">存在欺诈骗钱行为</div></div></label></li>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">此账号可能被盗用了</div></div></label></li>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">存在侵权行为</div></div></label></li>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">发布恶意广告信息</div></div></label></li></ul>' +
    '<h4 class="cc-common-title">举报内容描述</h4><textarea name="jb-ms" placeholder="请描述举报内容"></textarea></div>';

  // 时间选择器
  pro.model.chooserDate_m =
    '<div class="chooser-date">' +
      '<div class="cho-hd">' +
        '<input type="text" class="cho-date" v-model="date" readonly @change="dateChange(date)">' +
        '<a href="javascript:" class="prev iconfont" @click="prevDate()">&#xe611;</a>' +
        '<a href="javascript:" class="next iconfont" @click="nextDate()">&#xe610;</a>' +
      '</div><div class="cho-con row">' +
    '<label class="cho-item col-33" v-for="t in times" @click.stop.prevent="reser($event, t.usable)">' +
      '<input type="checkbox" :disabled="!t.usable" name="times[{{date}}][{{$key}}]" :checked="t.check" :value="t.value">' +
      '<span class="cho-chekbox">{{$key}}</span><span class="cho-text" v-html="t.txt"></span>' +
    '</label></div></div>';

  // 咨询弹窗
  pro.model.chooser_m = '<div class="list-block cc-list-b J_zixun">' +
    '<ul>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text" value="phone"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">电话咨询</div></div></label></li>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text" value="video"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">视频咨询</div></div></label></li>' +
    '<li><label class="label-checkbox item-content"><input type="radio" name="jb-text" value="toface"><div class="item-media"><i class="icon icon-form-checkbox"></i></div><div class="item-inner"><div class="item-subtitle">面对面咨询</div></div></label></li></ul>' +
    '</div>';

  // 追问 弹窗
  pro.model.tapAsked_m = '<h4 class="cc-common-title">输入提问的内容</h4>' +
    '<div class="answer-text"><textarea rows="5" name="que" id="queAsk" placeholder="详细描述您的问题(不少于20字)"></textarea></div><span></span>' +
    '<h4 class="cc-common-title">语音回答</h4><div class="answer-voice"><div class="cc-audio J_paly_voice" hidden>' +
    '<span class="J_time">0s</span><i class="iconfont">&#xe603;</i><span class="iconfont J_del_voice">&#xe609;</span></div>' +
    '<a href="javascript:" class="iconfont J_startRecord">&#xe61f;</a></div>' +
    '<div class="modal-buttons"><span class="cc-m-btn" id="sub">确认</span></div>';
};
