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
    let system = {
        interval  : 3, 
        roop_time : 0 
    }

    /**
     * 화이트 보드 툴바를 정의한 객체
     * 생성자 함수에서 값 초기화
     */
    let toolbar = {
        type: null, 
        color: null, 
        pen: { thickness: null },
        eraser: { color: null, size: null },
        text: { isExist : false, contents: null, size: null }
    }    

    /**
     * 마우스 객체
     */
    let mouse = { 
        click: null, 
        pos: { x: 0, y: 0 }
    };

    function Whiteboard (canvas, socket, option) {
        /**
         * 객체 생성 시 3번째 인자로 option을 보내지 않았을 경우
         */
        if (!option) option = {};

        toolbar.type = (typeof option.type !== 'undefinde') ? option.type : 'pen'
        toolbar.color = (typeof option.color !== 'undefinde') ? option.color : DEFAULT_COLOR
        toolbar.pen.thickness = (typeof option.thickness !== 'undefinde') ? option.thickness : DEFAULT_THICKNESS
        toolbar.eraser.size = (typeof option.eraser_size !== 'undefinde') ? option.eraser_size : DEFAULT_ERASER_SIZE,
        toolbar.text.size = (typeof option.text_size !== 'undefined') ? option.text_size : DEFAULT_TEXT_SIZE

        if (!(this instanceof Whiteboard)) throw new TypeError("Cannot call a class as a function");
        
        _canvas = canvas;
        _ctx    = canvas.getContext('2d');
        _socket = socket;

        _canvas.onmousedown = function(mouseEvt) { 
            if (toolbar.type === 'text') return;
            mouse.click = true;        
            _socket.emit('gigaginie', JSON.stringify(getMessage(mouseEvt, 'start')));
            
        };

        _canvas.onmouseup   = function(mouseEvt) { 
            
            mouse.click     = false;
                    
            if (toolbar.type === 'text') { /* 텍스 입력 기능 */

                if (toolbar.text.isExist) return;
                addTextarea(mouseEvt);

            } else {

                _socket.emit('gigaginie', JSON.stringify(getMessage(mouseEvt, 'end')));

            }

            
        }
     
        _canvas.onmousemove = function(mouseEvt) {
            
            if (toolbar.type === 'text') return;

            if (mouse.click) {
                /* 텀을 두고 소켓을 보낸다 (지니 과부화 방지) */
                if ((system.roop_time ++ % system.interval) === 0) {
                    _socket.emit('gigaginie', JSON.stringify(getMessage(mouseEvt, 'move')));
                }
            }

            
        };

        socket.on('gigaginie', function (msg) {
            const _msg = JSON.parse(msg)
            
            let thickness, color, eraser_size, text_size, axisX, axisY, text_contents;
            
            let signalOp = _msg.signalOp;
            let signalCheck = /start/gi;
            
            if ( signalCheck.test(signalOp) ) {
                console.log('first')
                toolbar.pen.thickness = _msg.lineSize;
                toolbar.color = _msg.textColor || _msg.lineColor;
                toolbar.eraser.size = _msg.eraserSize;
                toolbar.text.size = _msg.textSize;
            }
            mouse.pos.x         = _msg.axisX
            mouse.pos.y         = _msg.axisY
            toolbar.text.contents = _msg.contents
            
            switch (_msg.signalOp) {
                case 'DrawStart':   _ctx.lineWidth                = toolbar.pen.thickness;
                                    _ctx.strokeStyle              = toolbar.color;
                                    _ctx.globalCompositeOperation = 'source-over';
                                    _ctx.beginPath();
                                    _ctx.moveTo(mouse.pos.x * width, mouse.pos.y * height);
                                    break;
                
                case 'DrawMove':    _ctx.lineTo(mouse.pos.x * width, mouse.pos.y * height);
                                    _ctx.stroke();
                                    break;

                
                case 'DrawEnd':     _ctx.closePath();
                                    break;                
                
                case 'EraseStart':  _ctx.globalCompositeOperation = 'destination-out';
                                    _ctx.fillStyle                = toolbar.eraser.color; // #fffff지우개는 항상 하얀색 !
                                    _ctx.beginPath();
                                    _ctx.moveTo(mouse.pos.x * width, mouse.pos.y * height);
                                    break;

                case 'EraseMove':   _ctx.arc(mouse.pos.x * width, mouse.pos.y * height, toolbar.eraser.size, 0, Math.PI * 2, false);
                                    _ctx.fill();
                                    break;

                case 'EraseEnd':    _ctx.closePath();
                                    break;

                case 'EraseAll':    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
                                    break;

                case 'WriteText':   _ctx.textBaseline             = 'top';
                                    _ctx.textAlign                = 'left'; 
                                    _ctx.font                     = `${toolbar.text.size}px Arial`;
                                    _ctx.fillStyle                = toolbar.color
                                    _ctx.globalCompositeOperation = 'source-over' // 지우개 갔다 오면 지우개 속성으로 먹혀있다.......      
                                    _ctx.fillText(toolbar.text.contents, mouse.pos.x * width, mouse.pos.y * height);
                                    break;
            }
        })
    }

    const getMessage = function (mouseEvt, point) {
        if (!mouseEvt) mouseEvt = {}
        let msg      = {}
        
        msg.signalOp    = getSignalOp(point); // 이 부분 분기처리?                 
        msg.reqNo       = '_test_num_7'; 
        msg.axisX       = mouseEvt.clientX / window.innerWidth; 
        msg.axisY       = mouseEvt.clientY / window.innerHeight; 

        if (point === 'start' || point === 'text') {

            msg.boardWidth  = _canvas.width; 
            msg.boardHeight = _canvas.height;

            if (toolbar.type === 'pen') {

                msg.lineSize    =  toolbar.pen.thickness ;
                msg.lineColor   =  toolbar.color ;

            } else if (toolbar.type === 'eraser') {

                 msg.eraserSize  =  toolbar.eraser.size;   

            } else if (toolbar.type === 'text') {

                msg.textSize = toolbar.text.size;
                msg.textColor = toolbar.color;
                msg.contents = toolbar.text.contents;

            }
        }

        return msg
    }

    const addTextarea = function (mouseEvt) {
        
        let input = document.createElement('input');

        input.type           = 'text';
        input.style.position = 'fixed';
        input.style.left     = mouseEvt.clientX + 'px'
        input.style.top      = mouseEvt.clientY + 'px';
       
        toolbar.text.isExist = true; /* 더 이상 텍스트 창을 생성할 수 없게 */
        
        document.body.appendChild(input);
        
        input.focus();

        input.mouseEvt = mouseEvt;
        input.addEventListener('keydown', addTextContents);
        input.addEventListener('blur', removeInput, {once: true});
    }
    const addTextContents = function (e) {
        if (e.keyCode === 13) { // 13: Enter Key event

            toolbar.text.contents = this.value;
            toolbar.text.isExist  = false;

            /* 
            isEnter 프로퍼티 (예외처리)
            remove 가 실행되면 blur 이벤트가 우선적으로 실행된다. 
            blur 이벤트에서 remove가 있어 해당 엘리먼트는 제거된다.
            다시 돌아와서 remove 하려니 remove 할게 없다는 에러가 발생한다.
            */
            this.isEnter = true 
            document.body.removeChild(this);

            _socket.emit('gigaginie', JSON.stringify(getMessage(e.target.mouseEvt, 'text')));
            
        }        
    }
    const removeInput = function (e) {
        console.log(2)
        if (!this || e.target.isEnter) return;
        document.body.removeChild(this);
        toolbar.text.isExist = false
    }

    const getSignalOp = function (point) {
        let op;
        switch (point) {
            case 'start':
            if (toolbar.type === 'pen') {
                op = "DrawStart";
            } else if (toolbar.type === 'eraser') {
                op = "EraseStart";
            }
            break;

            case 'move':
            if (toolbar.type === 'pen') {
                op = "DrawMove";
            } else if (toolbar.type === 'eraser') {
                op = "EraseMove";
            }            
            break;

            case 'end':
            if (toolbar.type === 'pen') {
                op = "DrawEnd";
            } else if (toolbar.type === 'eraser') {
                op = "EraseEnd";
            }      
            break;

            case 'clear':
            op = "EraseAll";
            break;

            case 'text':
            op = "WriteText";
            break;
        }

        return op;
    }

    Whiteboard.prototype = {
        toolbar: {}, pen: {}, text: {}, eraser: {}
    }

    
    Whiteboard.prototype.clear = function () {

        
        _socket.emit('gigaginie', JSON.stringify(getMessage(null, 'clear'))); // 여기는 밑에서 구현
        
         
    }

    Object.defineProperty(Whiteboard.prototype.toolbar, 'type', {
        set: function (newVal) { toolbar.type = newVal; },
        get: function () { return toolbar.type; }
    })

    Object.defineProperty(Whiteboard.prototype.pen, 'thickness', {
        set: function (newVal) { toolbar.pen.thickness = newVal; },
        get: function () { return toolbar.pen.thickness }
    })    
    
    Object.defineProperty(Whiteboard.prototype, 'color', {
        set: function (newVal) { toolbar.color = newVal; },
        get: function () { return toolbar.color; }
    })

    Object.defineProperty(Whiteboard.prototype.eraser, 'size', {
        set: function (newVal) { toolbar.eraser.size = newVal; },
        get: function () { return toolbar.eraser.size; }
    })

    Object.defineProperty(Whiteboard.prototype.text, 'size', {
        set: function (newVal) { toolbar.text.size = newVal; },
        get: function () { return toolbar.text.size; }
    })
    return Whiteboard
})(window);