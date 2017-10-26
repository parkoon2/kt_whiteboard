var KT = KT || {};

KT.Whiteboard = (function (window) {
    'use strict';

    const width  = window.innerWidth,
          height = window.innerHeight;


    let _canvas     = null, 
        _ctx        = null,
        _socket     = null,
        _interval   = 3,
        _count      = 0; // 변수명 수정

    let toolbar = {
        type: 'pen',

        color: '#00000',
        
        pen: {
            thickness: 1
        },
        eraser: {
            color: '#fffff',
            size: 5 
        },
        text: {
            isExist: false,
            contents: null,
            size: 10,
            color: '#fffff'

        }

    }    
    let message = {
        signalOp: null,
        pos: {
            x: 0,
            y: 0
        },
        thickness: 1,
        toolbarType: null,
        color: null,
        eraserSize: 5,
        textContents: null

    };

    let mouse = {
        click: null,
    };

    function Whiteboard (canvas, socket) {

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
                if (_count ++ % _interval === 0) {
                    _socket.emit('gigaginie', JSON.stringify(getMessage(mouseEvt, 'move')));
                }
            }

            
        };

        socket.on('gigaginie', function (msg) {
            const _msg = JSON.parse(msg)
            // 여기서 라인, 지우개, 다 세팅해도 문제 없을까? 함수로 뺀다면 빼겟지?
   
            let thickness     = _msg.lineSize || 1,
                color         = _msg.textColor || _msg.lineColor || '#fffff',
                eraser_size   = _msg.eraserSize || 10,
                axisX         = _msg.axisX || 0,
                axisY         = _msg.axisY || 0,
                text_contents = _msg.contents || ' ' 
            
            switch (_msg.signalOp) {
                case 'DrawStart':   _ctx.lineWidth                = thickness;
                                    _ctx.strokeStyle              = color;
                                    _ctx.globalCompositeOperation = 'source-over';
                                    _ctx.beginPath();
                                    _ctx.moveTo(axisX * width, axisY * height);
                                    break;
                
                case 'DrawMove':    _ctx.lineTo(axisX * width, axisY * height);
                                    _ctx.stroke();
                                    break;

                
                case 'DrawEnd':     _ctx.closePath();
                                    break;                
                
                case 'EraseStart':  _ctx.globalCompositeOperation = 'destination-out';
                                    _ctx.fillStyle                = '#fffff' // 지우개는 항상 하얀색 !
                                    _ctx.beginPath();
                                    _ctx.moveTo(axisX * width, axisY * height);
                                    break;

                case 'EraseMove':   _ctx.arc(axisX * width, axisY * height, eraser_size, 0, Math.PI * 2, false);
                                    _ctx.fill();
                                    break;

                case 'EraseEnd':    _ctx.closePath();
                                    break;

                case 'EraseAll':    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
                                    break;

                case 'WriteText':   _ctx.textBaseline             = 'top';
                                    _ctx.textAlign                = 'left';
                                    _ctx.font                     = '14px sans-serif';
                                    _ctx.globalCompositeOperation = 'source-over' // 지우개 갔다 오면 지우개 속성으로 먹혀있다.......      
                                    _ctx.fillText(_msg.contents, axisX * width, axisY * height);
                                    break;
            }
        })
    }

    const getMessage = function (mouseEvt, point) {
        
        let msg = {}

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

                // msg.eraserSize  =  toolbar.eraser.size;  지우는 건 중간에 하는데 ... 처음에 보내 놓고 셋팅한다? 지니쪽에 데이터만 보내는거라면 상관없는데....   

            } else if (toolbar.type === 'text') {

                msg.textSize = toolbar.text.size;
                msg.textColor = toolbar.text.color;
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

        input.addEventListener('keydown', function (keyEvt) {
            let enter = 13;
            if (keyEvt.keyCode === enter) {
                // 이 부분이 텍스트를 소켓으로 보내야 하는 부분이다!
                toolbar.text.contents = this.value;
                toolbar.text.isExist  = false;
                document.body.removeChild(this);
                
                message.signalOp      = getSignalOp('text');
                message.textContents  = toolbar.text.contents;

                console.log(getMessage(mouseEvt, 'text'))

                _socket.emit('gigaginie', JSON.stringify(getMessage(mouseEvt, 'text')));
                
                //drawText(this.value, parseInt(this.style.left, 10), parseInt(this.style.top, 10));
            }
        })
    }

    const drawText = function (txt, x, y) {
        _ctx.textBaseline = 'top';
        _ctx.textAlign = 'left';
        _ctx.font = '14px sans-serif';
        console.log(_ctx)
        _ctx.globalCompositeOperation = 'source-over' // 지우개 갔다 오면 지우개 속성으로 먹혀있다.......      
        _ctx.fillText(txt, x, y);
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

    Whiteboard.prototype.setOption = function (option) {
        toolbar.thickness  = option.thickness || 1
        _interval          = option.interval || 2;
    }



    
    Whiteboard.prototype.clear = function () {
        message.signalOp = getSignalOp('clear');
        _socket.emit('gigaginie', JSON.stringify(message)); // 여기는 밑에서 구현
        
         
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
    
    return Whiteboard
})(window);