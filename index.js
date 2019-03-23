var EventCenter = {
  on: function(type, handler){
    $(document).on(type, handler)
  },
  fire: function(type, data){
    $(document).trigger(type, data)
  }
}

// EventCenter.on('hello', function(e){
//   console.log(e.detail)
// })

// EventCenter.fire('hello', '你好')

var Footer = {
  init: function(){
    this.$footer = $('footer')
    this.$ul = $('footer ul')
    this.$box = $('footer .box')
    this.$leftBtn = $('footer .icon-back')
    this.$rightBtn = $('footer .icon-next')
    this.isToStart = true
    this.isToEnd = false
    this.isAnimate = false
    this.bind()
    this.render()
  },
  bind: function(){
    var _this = this;
    _this.$rightBtn.on('click',function(){
      if(_this.isAnimate){return}
      if(_this.isToEnd){return}
      _this.isAnimate = true;
      var moveDistance = Math.floor(_this.$box.width() / $('footer li').outerWidth(true)) * $('footer li').outerWidth(true)
      _this.$ul.animate({
        left: '-='+moveDistance
      },400,function(){
        _this.isToStart = false;
        _this.isAnimate = false
        if((_this.$box.width() - parseFloat(_this.$ul.css('left'))) >= _this.$ul.width()){
          _this.isToEnd = true;
        }
      })
    })
    _this.$leftBtn.on('click',function(){
      if(_this.isAnimate){return}   
      if(_this.isToStart){return}
      _this.isAnimate = true  
      var moveDistance = Math.floor(_this.$box.width() / $('footer li').outerWidth(true)) * $('footer li').outerWidth(true)
      _this.$ul.animate({
        left: '+='+ moveDistance
      },400,function(){
        _this.isAnimate = false
        _this.isToEnd = false;
        if(parseFloat(_this.$ul.css('left'))>=0){
          _this.isToStart = true;     
        }
      })

    })
    /*选择音乐分类 */
    this.$footer.on('click','li',function(){
      $(this).addClass('active')
        .siblings().removeClass('active')
      EventCenter.fire('select-albumn',({channelId:$(this).attr('data-channel-id'),channelName:$(this).attr('data-channel-name')}))
    })
  },
  render: function(){
    var _this = this
    $.getJSON('https://jirenguapi.applinzi.com/fm/getChannels.php')
    .done(function(ret){
      _this.renderFooter(ret.channels)
    }).fail(function(){
      console.log('error')
    })
  },
  renderFooter: function(data){
    var tpl = ''
    for(var i = 0 ; i < data.length;i++){
        tpl +=  '<li class="item" data-channel-id="' + data[i].channel_id + '" data-channel-name = "' + data[i].name +'">'
        tpl += '  <div class="img" style="background-image:url(' + data[i].cover_small + ')"></div>'
        tpl +=  '<h3>'+ data[i].name + '</h3>'
        tpl +=  '</li>'
    }
    this.$ul.append($(tpl))
    this.setStyle()
  },
  setStyle: function(){
    var count = this.$ul.find('li').length
    var width = this.$ul.find('li').outerWidth(true)       //outerWidth(true) 表示包括外边距的总宽度
    this.$ul.css({
      width: count * width + 20 + 'px'
    })
  }
}
Footer.init();

/*实现歌曲操作部分 */
var Fm = {
  init: function(){
    this.$container = $('#page-music')
    this.audio = new Audio()
    this.audio.autoplay = true

    this.bind()
  },
  bind: function(){
    var _this = this;
    EventCenter.on('select-albumn',function(e,channel){
      _this.channelId = channel.channelId
      _this.channelName = channel.channelName
      _this.loadMusic(function(){
        _this.setMusic()
      })
    })

    /*播放暂停 */
    _this.$container.find('.actions .play').on('click',function(){
      if($(this).hasClass('icon-play')){
        $(this).removeClass('icon-play').addClass('icon-pause')
        _this.audio.play()
      }else{
        $(this).removeClass('icon-pause').addClass('icon-play')
        _this.audio.pause()
      }
    })

    /*播放下一曲 */
    _this.$container.find('.actions .icon-next1').on('click',function(){
      _this.loadMusic(function(){
        _this.setMusic()
      })
    })

    /*音乐播放进度展示 */  /*_this.audio.onplay = function也行 */
    _this.audio.addEventListener('play',function(){
      console.log('play')
      _this.clock = setInterval(function(){
        _this.setTime()
      },1000)
    })

    /*音乐播放进度展示 */
    _this.audio.addEventListener('pause',function(){
      clearInterval(_this.clock)
      console.log('pause')
    })

    /*进度条被点击 */
    _this.$container.find('.bar').on('click',function(e){
      var a = e.offsetX;
      var b = a / parseInt($('.bar').width());
      _this.audio.currentTime = b * _this.audio.duration;
    })
  },
  /*加载歌词 */
  loadLyric: function(){
    $.getJSON('https://jirenguapi.applinzi.com/fm/getLyric.php',{sid: _this.song.sid}).done(function(ret){
      var lyric = ret.lyric
      var lyricObj = {}
      /*lyric.split('\n')让其成为数组 */
      lyric.split('\n').forEach(function(line){
        var str = line.replace(/\[.*\]/,'')
        var times = line.match(/\d{2}:\d{2}/g)
        if(!str){return}
        /*times可能为包含两个数的数组 */
        if(Array.isArray(times)){
          times.forEach(function(time){
            lyricObj[time] = str;
          })
        }
      })
      _this.lyricObj = lyricObj;
    })
  },
  /*设置时间进度 ，歌词和时间随播放时间而变化*/
  setTime: function(){
    _this = this
    var min = Math.floor(_this.audio.currentTime/60)
    var second = Math.floor(_this.audio.currentTime%60) + ''
    second = second.length ===2?second:('0'+second)
    _this.$container.find('.current-time').text(min+':'+ second)
    var percent = _this.audio.currentTime/_this.audio.duration*100 +'%'
    _this.$container.find('.bar-progress').css('width',percent)
    if(_this.lyricObj['0'+min+':'+second]){
      _this.$container.find('.lyric').text(_this.lyricObj['0'+min+':'+second]).boomText()
    }
  },
  /*加载音乐 */
  loadMusic: function(callback){
    _this = this
    clearInterval(_this.clock)
    $.getJSON('https://jirenguapi.applinzi.com/fm/getSong.php',{channel: _this.channelId})
    .done(function(ret){
      _this.song = ret.song[0]
      callback()
    })
  },

    /*渲染音乐内容到页面上 */
  setMusic: function(){
    this.audio.src = this.song.url
    $('.bg').css('background-image', 'url(' + this.song.picture + ')' )
    this.$container.find('figure').css('background-image', 'url(' + this.song.picture + ')' )
    this.$container.find('.detail .author').text(this.song.artist)
    this.$container.find('.detail h1').text(this.song.title)
    this.$container.find('.detail .tag').text(this.channelName)
    $('#page-music .aside .actions .play').removeClass('icon-play').addClass('icon-pause')
    _this.$container.find('.lyric').text('')
    _this.loadLyric()
  }
}

Fm.init()


/*jQuery插件实现歌词的炫酷效果 */
$.fn.boomText = function(type){
  type = type ||'rollIn'
  /*得到this中的内容*/
  this.html(function(){
    var arr = $(this).text().split('').map(function(word){
      return '<span>'+word+'</span>'
    })
    return arr.join('')
    
  })
  var index = 0
  var $boomTexts = $(this).find('span')
  var clock = setInterval(function(){
    $boomTexts.eq(index).addClass('animated ' + type)
 
    index++
    if(index >= $boomTexts.length){
      clearInterval(clock)
    }
  },300)
}