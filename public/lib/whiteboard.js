/**
 * 작성일: 2017.10
 */
let Whiteboard = (function (window) {
    'use strict';
    
    /**
     * 화이트보드 객체를 생성할 때 Option 인자로 기본값을 세팅할 수 있으며 
     * 별도로 세팅을 하지 않았을 경우
     * 다음의 값으로 화이트보드 툴바를 세팅
     */
    const DEFAULT_TEXT_SIZE = 10,
          DEFAULT_ERASER_SIZE = 10,
          DEFAULT_COLOR = '#000000',
          DEFAULT_THICKNESS = 1;
    
    /**
     * Window 객체의 가로와 세로길이를 지정
     * 해당 값은 해상도에 따라 점 위치값을 모두 동일하게 가져가기 위해 필요
     * 메세지를 보낼 때 점 위치값을 다음과 같음
     * e.clientX (마우스 위치값) / width 
     */      
    const width = window.innerWidth,
          height = window.innerHeight;

    /**
     * 생성자를 통해 받은 캔버스와 소켓을 전역으로 사용하기 위해
     * 별도로 변수에 저장
     */
    let _canvas = null, _ctx = null, _socket = null
    
    /**
     * Ginie App 성능을 위한 변수를 지정
     * mousemove 이벤트가 발생할 때 마다 지니에게 보내면 Ginie App에 과부화를 줄 여지가 있음
     * Interval 변수를 이용해 몇번 째 마다 보낼 것인지 정함 
     */
    let _system = {
        interval  : 3, 
        roop_time : 0 
    }

    /**
     * 화이트 보드 툴바를 정의한 객체
     * 생성자 함수에서 값 초기화
     */
    let _toolbar = {
        type: null, 
        color: null, 
        pen: { thickness: null },
        eraser: { color: null, size: null },
        text: { isExist : false, contents: null, size: null }
    }    

    /**
     * 마우스 객체
     */
    let _mouse = { 
        click: null, 
        status: null,
        event: null,
        pos: { x: 0, y: 0 }
    };

    function Whiteboard (canvas, socket, option) {
        /**
         * 객체 생성 시 3번째 인자로 option을 보내지 않았을 경우
         */
        if ( !option ) option = {};
       
        /**
         * Toolbar 초기화
         */
        _toolbar.type = (typeof option.type !== 'undefinde') ? option.type : 'pen'
        _toolbar.color = (typeof option.color !== 'undefinde') ? option.color : DEFAULT_COLOR
        _toolbar.pen.thickness = (typeof option.thickness !== 'undefinde') ? option.thickness : DEFAULT_THICKNESS
        _toolbar.eraser.size = (typeof option.eraser_size !== 'undefinde') ? option.eraser_size : DEFAULT_ERASER_SIZE,
        _toolbar.text.size = (typeof option.text_size !== 'undefined') ? option.text_size : DEFAULT_TEXT_SIZE

        if ( !(this instanceof Whiteboard) ) throw new TypeError("Cannot call a class as a function");
        
        /**
         * Canvas, Socket 전역변수화
         */
        _canvas = canvas;
        _ctx    = canvas.getContext('2d');
        _socket = socket;

        _canvas.onmousedown = function(mouseEvt) {
            /**
             * 텍스트 입력은 mouseup에서 처리
             */ 
            if (_toolbar.type === 'text') return;

            _mouse.click = true;
            _mouse.status = 'start';
            _mouse.event = mouseEvt;

            _socket.emit('gigaginie', JSON.stringify(getMessage()));
        };

        _canvas.onmouseup = function(mouseEvt) { 
            
            _mouse.click = false;
            _mouse.status = 'end';
            _mouse.event = mouseEvt;
            
            /**
             * 텍스트 입력 기능 
             */
            if ( _toolbar.type === 'text' ) {
                if ( _toolbar.text.isExist ) return;

                _mouse.status = 'end & text';
                addTextarea();

            } else {
                _socket.emit('gigaginie', JSON.stringify(getMessage()));
            }
        }
     
        _canvas.onmousemove = function(mouseEvt) {
            
            if ( _toolbar.type === 'text' ) return;
           
            _mouse.status = 'move';
            _mouse.event = mouseEvt;
            
            if ( _mouse.click ) {

                /**
                 * 텀을 두고 소켓을 보낸다 (지니 과부화 방지)  
                 */
                if ( (_system.roop_time ++ % _system.interval) === 0 ) {
                    _socket.emit('gigaginie', JSON.stringify(getMessage()));
                }
            }
        };

        /**
         * Signal 서버에서 메세지를 받아 처리하는 부분
         * 펜 기능, 지우개 기능, 텍스트 입력 기능  
         */
        socket.on('gigaginie', function (data) {
            const msg = JSON.parse(data)
            
            let signalOp = msg.signalOp;
            let signalCheck = /start/gi;
            
            /**
             * Start 부분에서만 보내는 정보들을 별도로 처리
             */
            if ( signalCheck.test(signalOp) ) {
                _toolbar.pen.thickness = msg.lineSize;
                _toolbar.color = msg.textColor || msg.lineColor;
                _toolbar.eraser.size = msg.eraserSize;
                _toolbar.text.size = msg.textSize;
            }
            _mouse.pos.x = msg.axisX
            _mouse.pos.y = msg.axisY
            _toolbar.text.contents = msg.contents
            
            /**
             * signalOp에 따라 분기처리
             */
            switch ( msg.signalOp ) {
                case 'DrawStart':   _ctx.lineWidth = _toolbar.pen.thickness;
                                    _ctx.strokeStyle = _toolbar.color;
                                    _ctx.globalCompositeOperation = 'source-over';
                                    _ctx.beginPath();
                                    _ctx.moveTo(_mouse.pos.x * width, _mouse.pos.y * height);
                                    break;
                
                case 'DrawMove':    _ctx.lineTo(_mouse.pos.x * width, _mouse.pos.y * height);
                                    _ctx.stroke();
                                    break;

                
                case 'DrawEnd':     _ctx.closePath();
                                    break;                
                
                case 'EraseStart':  _ctx.globalCompositeOperation = 'destination-out';
                                    _ctx.fillStyle = _toolbar.eraser.color; // #fffff지우개는 항상 하얀색 !
                                    _ctx.beginPath();
                                    _ctx.moveTo(_mouse.pos.x * width, _mouse.pos.y * height);
                                    break;

                case 'EraseMove':   _ctx.arc(_mouse.pos.x * width, _mouse.pos.y * height, _toolbar.eraser.size, 0, Math.PI * 2, false);
                                    _ctx.fill();
                                    break;

                case 'EraseEnd':    _ctx.closePath();
                                    break;

                case 'EraseAll':    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
                                    break;

                case 'WriteText':   _ctx.textBaseline = 'top';
                                    _ctx.textAlign = 'left'; 
                                    _ctx.font = `${_toolbar.text.size}px Arial`;
                                    _ctx.fillStyle = _toolbar.color;
                                    _ctx.globalCompositeOperation = 'source-over';
                                    _ctx.fillText(_toolbar.text.contents, _mouse.pos.x * width, _mouse.pos.y * height);
                                    break;
            }
        })
    }

    /**
     * Signal 서버로 보낼 메세지 생성
     */
    function getMessage () {
        
        let msg = {}
        
        /**
         * 메세지 규격에서 공통부분 
         */
        msg.signalOp = getSignalOp();                  
        msg.reqNo = 'x29384x19'; 
        msg.axisX = _mouse.event.clientX / window.innerWidth; 
        msg.axisY = _mouse.event.clientY / window.innerHeight; 

        /**
         * 시작 / 중간 / 끝의 메세지가 모두 다르기 때문에 분기처리
         * 
         *      (메세지 규격에 맞추려다보니 소스만 복잡해짐
         *          다 보내고 지니에서 필요한 부분을 가져다쓰면 되지 않을까?)
         */
        if ( _mouse.status === 'start' || 'end & text' ) {
            msg.boardWidth = _canvas.width; 
            msg.boardHeight = _canvas.height;
            
            if ( _toolbar.type === 'pen' ) {
                msg.lineSize =  _toolbar.pen.thickness ;
                msg.lineColor =  _toolbar.color ;

            } else if ( _toolbar.type === 'eraser' ) {
                 msg.eraserSize  =  _toolbar.eraser.size;   

            } else if ( _toolbar.type === 'text' ) {
                msg.textSize = _toolbar.text.size;
                msg.textColor = _toolbar.color;
                msg.contents = _toolbar.text.contents;
            }
        }
        return msg
    }
    
    /**
     * Input 박스를 생성
     */
    function addTextarea () {
        
        let input = document.createElement('input');

        input.type = 'text';
        input.style.position = 'fixed';
        input.style.left = _mouse.event.clientX + 'px'
        input.style.top = _mouse.event.clientY + 'px';
        
        /**
         * Input 박스가 있을 경우 다시 생성되지 않게 막음
         */
        _toolbar.text.isExist = true; 
        
        document.body.appendChild(input);
        
        input.focus();

        input.addEventListener('keydown', printText);
        input.addEventListener('blur', removeInput);
    }
    
    /**
     * Input 박스에 있는 텍스트를 화면에 출력하는 이벤트 핸들러
     * 
     * @param {Obejct} e Key Event Object
     */
    function printText (e) {
        if ( e.keyCode === 13 ) { // 13: Enter Key event
            _toolbar.text.contents = this.value;
            _toolbar.text.isExist  = false;

            /**
             * isEnter (예외처리 Flag)
             * removeChild 호출 시 blur 이벤트가 우선적으로 발생
             * 현재 blur 이벤트에서도 removeChild를 호출하고 있음
             * blur 이벤트 처리 후 돌아오니 해당 element가 없다는 에러 발생
             */
            this.isEnter = true 

            document.body.removeChild(this);

            _socket.emit('gigaginie', JSON.stringify(getMessage()));
        }        
    }

    /**
     * Input 박스를 제거하는 이벤트 핸들러
     * 
     * @param {Object} e Key Event Object
     */
    const removeInput = function (e) {
        /**
         * Input 박스가 존재하지 않거나 Enter 키를 눌러 텍스트를 입력한 경우는 예외
         */
        if ( !this || e.target.isEnter ) return;

        document.body.removeChild(this);
        _toolbar.text.isExist = false
    }

    /**
     * siganlOp 생성 
     */
    function getSignalOp () {
  
        if ( _mouse.status === 'start' && _toolbar.type === 'pen' ) return 'DrawStart';
        if ( _mouse.status === 'start' && _toolbar.type === 'eraser' ) return 'EraseStart';
        if ( _mouse.status === 'move' && _toolbar.type === 'pen' ) return 'DrawMove';
        if ( _mouse.status === 'move' && _toolbar.type === 'eraser' ) return 'EraseMove';
        if ( _mouse.status === 'end' && _toolbar.type === 'pen' ) return 'DrawEnd';
        if ( _mouse.status === 'end' && _toolbar.type === 'eraser' ) return 'EraseEnd';
        if ( _mouse.status === 'end' && _toolbar.type === 'eraser' ) return 'EraseEnd';
        if ( _mouse.status === 'clear' ) return 'EraseAll';
        if ( _mouse.status === 'end & text' ) return 'WriteText';
    }

    Whiteboard.prototype = {
        toolbar: {}, pen: {}, text: {}, eraser: {}
    }

    
    Whiteboard.prototype.clear = function () {
        _mouse.status = 'clear';
        _socket.emit('gigaginie', JSON.stringify(getMessage())); 
    }

    Object.defineProperty(Whiteboard.prototype.toolbar, 'type', {
        set: function (newVal) { _toolbar.type = newVal; },
        get: function () { return _toolbar.type; }
    })

    Object.defineProperty(Whiteboard.prototype.pen, 'thickness', {
        set: function (newVal) { _toolbar.pen.thickness = newVal; },
        get: function () { return _toolbar.pen.thickness }
    })    
    
    Object.defineProperty(Whiteboard.prototype, 'color', {
        set: function (newVal) { _toolbar.color = newVal; },
        get: function () { return _toolbar.color; }
    })

    Object.defineProperty(Whiteboard.prototype.eraser, 'size', {
        set: function (newVal) { _toolbar.eraser.size = newVal; },
        get: function () { return _toolbar.eraser.size; }
    })

    Object.defineProperty(Whiteboard.prototype.text, 'size', {
        set: function (newVal) { _toolbar.text.size = newVal; },
        get: function () { return _toolbar.text.size; }
    })

    return Whiteboard;

})(window);