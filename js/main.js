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
    afterEnter: function (ele) { $.refreshScroller(); }
  });

  // 写人浏览器缓存中
  var Util = (function () {
    var prefix = 'ZZK_'
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
      }
    }
  })();

  /**
   * ====================================================================
   * 问题列表
   * ====================================================================
   */
  pro.question_list = function () {
    var self = {};
    var queItem = pro.que_item();

    // 读取session中的数据
    var stor = Util.sionFetch('LIST');
    // 检查用户是否从详情页退回列表页
    var looked = Util.sionFetch('LOOKED');

    window.vue = new Vue({
      el: 'body',
      data: {
        page: stor.page || 0,
        problemList: stor.problemList || []
      },
      components: [queItem],
      methods: {
        addProblemList: function (callback) {
          self.fetchData(this.page, function (data) {
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

    self.fetchData = function (page, callback) {
      $.ajax({
        url: io.question_list.content,
        type: 'get',
        data: {page: page, info: io.userInfo},
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

    self.renderData = function (data) {
      vue.page++;
      data.problemList.forEach(function (ele) {
        vue.problemList.push(ele);
        vue.$nextTick(function () {
          $.refreshScroller();
          stor.top && $('.content').scrollTop(stor.top);
          Util.sionSave('LIST', {});
          Util.sionSave('LOOKED', {i: 0});
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
      /* JS 下拉刷新 --------------------------------------------------------------------
       $(document).on('scroll', '.content', function () {
         var _this = $(this);
         if (_this.scrollTop() <= -50) {
           $('.pull-to-refresh-layer').addClass('cc-pull-up');
           _this.on('touchend', function () {
             $('.pull-to-refresh-arrow').hide();
             _this.find('.preloader').css('visibility', 'visible');
             setTimeout( location.reload, 300)
           });
         }
       });
       ------------------------------------------------------------------------------ */
    };

    // 对地址写入时间戳, 防止缓存

    self.init = function () {
      self.bindEvents();
      vue.addProblemList();
    };

    self.init()
  };

  /**
   * ====================================================================
   * 问题详情
   * ====================================================================
   */
  pro.question_detail = function () {
    var self = {};
    var queListItem = pro.que_item();
    Util.sionSave('LOOKED', { i: 1 });

    var vue = new Vue({
      el: 'body',
      data: {
        page: 1,
        item: {},
        answers: []
      },
      components: [queListItem],
      methods: {
        addProblem: function () {
          var _this = this;
          self.fetchData(io.question_detail.content, function (data) {
            _this.item = data.problem;
            _this.answers = data.answers;
          });
        },
        // 更多的回答
        addAnswers: function () {
          var _this = this;
          self.fetchData(io.question_detail.answers, function (data) {
            data.answers.forEach(function (ele) { _this.answers.push(ele) });
          });
        }
      }
    });

    self.fetchData = function (url, callback) {
      $.ajax({
        url: url,
        type: 'get',
        data: {info: io.userInfo, answerspage: vue.page},
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
      $(document).on('infinite', '.infinite-scroll-bottom',function() {
        vue.addAnswers();
      });
    };

    self.init = function () {
      self.bindEvents();
      vue.addProblem();
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
      props: ['item','ctl','com'],
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
            $(ele).addClass('cc-audio-bg');
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
            _this.fetchData(io.question.collectCount,{ type:'collect', ctr: 1 },function () {
              ele.addClass('J_colled').find('i').html('&#xe622;');
              _this.item.collectCount++;
            });
          } else {
            _this.fetchData(io.question.collectCount,{ type:'collect', ctr: 0 },function () {
              ele.removeClass('J_colled').find('i').html('&#xe600;');
              _this.item.collectCount--;
            });
          }
        },
        // 点赞
        praiseCount: function (e) {
          var _this = this;
          var ele = $(e.currentTarget);
          if(_this.ctl) return false;
          if (!ele.hasClass('J_praised')) {
            _this.fetchData(io.question.praiseCount,{ type:'praise', ctr: 1 },function () {
              ele.addClass('J_praised').find('i').html('&#xe620;');
              _this.item.praiseCount++;
            });
          } else {
            _this.fetchData(io.question.praiseCount,{ type:'praise', ctr: 0 },function () {
              ele.removeClass('J_praised').find('i').html('&#xe621;');
              _this.item.praiseCount--;
            });
          }
        },
        // 举报
        reportCount: function () {

        },
        // 解锁
        lockon: function () {
          this.item.lock = false;
          setTimeout( $.refreshScroller, 200);
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
        '<time v-if="!com">{{item.createTimeString}}</time></div>' +
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

};
