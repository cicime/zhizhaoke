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

  // 写人浏览器缓存中
  var Util = (function () {
    var prefix = 'ZZK_';
    return {
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
      createURL: function () {
        if (window.URL) {
          return window.URL.createObjectURL(blob);
        } else if (window.webkitURL) {
          return window.webkitURL.createObjectURL(blob);
        } else {
          return null;
        }
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
        answers: []
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
    };

    self.init = function () {
      self.bindEvents();
      vue.addProblem();

      pro.issue();
    };

    self.init();
  };



  /**
   * ====================================================================
   * 评论回答 & 发布问题
   * ====================================================================
   */
  pro.issue = function () {
    var self = {};


    self.bindEvents = function () {
      $('.tag-showall').on('click',function () {
        $('.tag-list').toggleClass('showall');
      });
      $('#sub').on('click',function () {
        self._resolveData(function (data) {

        });
      });
      $('.J_addimg').on('click',function () {

      });
    };


    self._resolveData = function (callback) {
      $.ajax({
        url: io.quiz.content,
        type: 'get',
        data: {
          info: io.userInfo
        },
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

    var timesAll = function () {
      var arr = {};
      var MINT = 8;
      var MAXT = 20;
      for (var i = MINT; i <= MAXT; i++) {
        arr[i + ':00-' + (i + 1) + ':00'] = {};
      }
      return arr;
    }

    Vue.component('chooser-date', {
      template: pro.model.chooserDate_m,
      data: function () {
        return {
          date: '2016-09-30',
          times: timesAll()
        };
      }
    });

    new Vue({ el: 'body' });

    self.fetchData = function () {

    };

    self.bindEvents = function () {
      $('.cho-date').calendar({
        onClose:function () {
          $('.picker-calendar').remove();
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
   * 我的问题
   * ====================================================================
   */
  pro.userQuestion = function () {
    var self = {};
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
    var self = {};
    var queListItem = pro.que_item();

    new Vue({ el: 'body' });
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
      props: ['item','ctl','com','offermoney'],
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
        '<span v-else><i class="user-head-min"></i> 匿名</span>' +
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
  pro.model.jubao_m =
    '<div class="list-block cc-list-b">' +
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
        '<input type="text" class="cho-date" v-model="date" readonly>' +
        '<a href="javascript:" class="prev iconfont">&#xe611;</a>' +
        '<a href="javascript:" class="next iconfont">&#xe610;</a>' +
      '</div><div class="cho-con row">' +
    '<label class="cho-item col-33" v-for="t in times">' +
      '<input type="checkbox" :disabled="!t.usable">' +
      '<span class="cho-chekbox">{{$key}}</span>' +
    '</label></div></div>';

};
