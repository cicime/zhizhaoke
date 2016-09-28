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
        var tag = /\?/.test(cate) && !/\?ref_c=/.test(cate) ? '&' : '?';
        cate = cate.replace(/(\?|&)ref_c=\d+/, '');
        history.replaceState({tit: title}, title, cate + tag + 'ref_c=' + new Date().getTime());
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

    window.vue = new Vue({
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
          self.fetchData(io.questionDetail.content, function (data) {
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
        addimg: function (e) {
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
      // 提交
      $('#sub').on('click', self.submit);
    };

    self.submit = function () {
      if(!vue.ans && !vue.voice.localId){
        $.alert('请使用文字或语音回答');
        return;
      }
      $(this).prop('disabled', true);
      // 如果有录音先上传录音
      if(vue.voice.localId){
        wx.uploadVoice({
          localId: vue.voice.localId,
          isShowProgressTips: 1, // 默认为1，显示进度提示
          success: function (res) {
            vue.voice.serverId = res.serverId;
          }
        });
      }
      // 如果有图片
      var i = 0;
      if(vue.imglist.length){
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
            }
          },
          fail: function (res) {
            alert(JSON.stringify(res));
          }
        });
      }

      alert('ol');
    };

    self.init = function () {
      self.bindEvents();
      vue.addProblem();
    };

    self.init();
  };


  /**
   * ====================================================================
   * 录音接口
   * ====================================================================
   */
  pro.voice = function (add, remove) {
    var ele = $('.answer-voice');
    var voice = {
      localId: '',
      serverId: '',
      len: 0
    };
    var time;

    var events = {
      touchstart: function () {
        wx.startRecord({
          cancel: function () {
            alert('已拒绝授权录音');
          }
        });
        ele.find('.J_paly_voice').show();
        time = setInterval(function () {
          voice.len++;
          $('.J_time').html(voice.len+'s');
        }, 1000);
      },
      touchend: function () {
        wx.stopRecord({
          success: function (res) {
            voice.localId = res.localId;
            ele.addClass('min');
            clearInterval(time);
            add(voice);
          },
          fail: function (res) {
            alert(JSON.stringify(res));
          }
        });
      }
    };

    ele.find('a').on(events);
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
   * 评论回答 & 发布问题
   * ====================================================================
   */
  pro.issue = function () {
    var self = {};

    new Vue({
      el: '#formZhizhao',
      data:{
        imglist:[]
      },
      methods:{
        addimg: function (e) {
          var file = e.target.files[0];
          this.imglist.push(Util.createURL(file));
          if (this.imglist.length >= 6) $('.J_addimg').hide();
          // todo 图片上传接口 返回服务器地址

        }
      }
    });

    self.bindEvents = function () {
      $('.tag-showall').on('click',function () {
        $('.tag-list').toggleClass('showall');
      });
      $('#sub').on('click',function () {
        self._resolveData({
          // 上传数据

        },function (data) {
          console.log(data);
        });
      });
    };

    self._resolveData = function (data, callback) {
      data.info = io.userInfo;
      $.ajax({
        url: io.quiz.content,
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

    var vue = new Vue({
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
          self.fetchData(io.specialist.times, {
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
        if(!vue.ans){
          $.alert('请填写咨询内容');
          return;
        }
        if(!vue.tonyi){
          $.alert('请同意咨询协议');
          return;
        }
        var formData = $('#formContent').serialize();
        formData = formData + Util.parseParam({
            info: io.userInfo,
            date: vue.date
          });
        self.fetchData(io.specialist.form, formData, function (data) {
          // location.href = 'specialist-pay.html';
        });
      });
    };

    self.init = function () {
      vue.timesChange();
      self.bindEvents();
    };

    self.init();
  };


  /**
   * ====================================================================
   * 我的问题
   * ====================================================================
   */
  pro.userQuestion = function () {
    var list = pro.questionList();
    list.url = io.questionList.content;
    list.data.userQuestion = true;
    list.init();
  };


  /**
   * ====================================================================
   * 我的支招
   * ====================================================================
   */
  pro.userZhizhao = function () {

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
        url: io.quiz.content,
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
        self._resolveData({

        },function () {

        });
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
      props: ['item','ctl','com','offermoney','collect','index'],
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
        }
      }
    });
  };

  // 时间选择器
  pro.chooserDate = function () {
    return Vue.component('chooser-date', {
      template: pro.model.chooserDate_m,
      data: function () {
        return {
        };
      },
      props: ['date','times'],
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


  /**
   * ====================================================================
   * HTML 模板
   * ====================================================================
   */
  pro.model = {};
  // 列表
  pro.model.que_item_m =
    '<article class="cc-card" :class="{\'zjda\': item.zjda}">' +
    '<div class="cc-card-hd">' +
    '<span v-if="!item.isSecret"><i class="user-head-min" v-if="item.headimgurl" style="{{\'background-image: url(\'+item.headimgurl+\')\'}}"></i> {{item.userName ? item.userName : item.nickname}}</span>' +
    '<span v-else><i class="user-head-min"></i> 匿名</span><span v-if="collect" @click.stop.prevent="removecollect(item.id)" class="iconfont cc-card-delet">&#xe60c;</span>' +
    '<time v-if="!com && !offermoney">{{item.createTimeString}}</time>' +
    '<span v-if="offermoney" class="cc-card-row"><i class="iconfont">&#xe613;</i> {{item.offerMoney.toFixed(2)}}</span></div>' +
    '<div class="cc-card-con" v-if="!item.lock">' +
    '<p v-if="item.contentText">{{item.contentText}}</p>' +
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
};
