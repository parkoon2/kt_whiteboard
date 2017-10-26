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

        color: null,
        
        pen: {
            thickness: 1
        },
        eraser: {
            color: '#fffff',
            size: 5 
        },
        text: {
            isExist: false,
            contents: null
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

        _canvas.onmousedown = function(e) { 
            if (toolbar.type === 'text') return;
            /* 클릭 했을 때 모든 세팅 정보를 넘긴다 예를들어 지우개인지 텍스트인지 드로잉인지, 칼라, 두깨, 등등*/
            mouse.click         = true;
            message.pos.x       = e.clientX / width;
            message.pos.y       = e.clientY / height;
            message.thickness   = toolbar.pen.thickness;
            message.toolbarType = toolbar.type;
            message.color       = toolbar.color;
            message.eraserSize  = toolbar.eraser.size;
            console.log(message.thickness)
            message.signalOp     = getsignalOp('start');
            _socket.emit('gigaginie', JSON.stringify(message));
            
        };

        _canvas.onmouseup   = function(e) { 
            
            mouse.click     = false;
            message.pos.x   = e.clientX / width;
            message.pos.y   = e.clientY / height;
            // 여기서 테스트 기능을 넣자            
            if (toolbar.type === 'text') {
                if (toolbar.text.isExist) return;
                addTextarea(e.clientX, e.clientY);
            } else {
                message.signalOp = getsignalOp('end');
                _socket.emit('gigaginie', JSON.stringify(message));

            }

            
        }
     
        _canvas.onmousemove = function(e) {
            
            if (toolbar.type === 'text') return;
            
            message.signalOp = getsignalOp('move');
            message.pos.x   = e.clientX / width;
            message.pos.y   = e.clientY / height;

            if (mouse.click) {
                /* 텀을 두고 소켓을 보낸다 (지니 과부화 방지) */
                if (_count ++ % _interval === 0) {
                    _socket.emit('gigaginie', JSON.stringify(message));
                }
            }

            
        };

        socket.on('gigaginie', function (msg) {
            const _msg = JSON.parse(msg)
            // 여기서 라인, 지우개, 다 세팅해도 문제 없을까? 함수로 뺀다면 빼겟지?
            console.log('지니 당신이 받을 메세지야', _msg)
            if (_msg.toolbarType === 'pen') {
                _ctx.lineWidth                = _msg.thickness;
                _ctx.globalCompositeOperation = 'source-over';
                _ctx.strokeStyle              = _msg.color;
                _ctx.fillStyle                = '#000000';
            } else if (_msg.toolbarType === 'eraser') {
                //_ctx.lineWidth                = 1;  // default 값으로 세팅해 줄 필요가 없나?
                _ctx.globalCompositeOperation = 'destination-out';
                //_ctx.strokeStyle              = '#000000';
                _ctx.fillStyle                = '#fffff' // 지우개는 항상 하얀색이니까 계속 세팅 할 필요가 없겠지>
            }
            
            switch (_msg.signalOp) {
                case 'DrawStart':
                _ctx.beginPath();
                _ctx.moveTo(_msg.pos.x * width, _msg.pos.y * height);
                break;

                case 'DrawMove':
                _ctx.lineTo(_msg.pos.x * width, _msg.pos.y * height);
                _ctx.stroke();
                break;

                case 'DrawEnd':
                _ctx.closePath();
                break;                
                
                case 'EraseStart':
                _ctx.beginPath();
                _ctx.moveTo(_msg.pos.x * width, _msg.pos.y * height);
                break;

                case 'EraseMove':
                _ctx.arc(_msg.pos.x * width, _msg.pos.y * height, _msg.eraserSize, 0, Math.PI * 2, false);
                _ctx.fill();
                break;

                case 'EraseEnd':
                _ctx.closePath();
                break;

                case 'EraseAll':
                _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
                break;

                case 'WriteText':
                console.log('ff')
                _ctx.textBaseline             = 'top';
                _ctx.textAlign                = 'left';
                _ctx.font                     = '14px sans-serif';
                _ctx.globalCompositeOperation = 'source-over' // 지우개 갔다 오면 지우개 속성으로 먹혀있다.......      
                _ctx.fillText(_msg.textContents, _msg.pos.x * width, _msg.pos.y * height);
                break;
            }

            console.log('최종 컨텍스트를 확인하시오!', _ctx)
        })
    }

    const addTextarea = function (x, y) {
        
        let input = document.createElement('input');
        
        input.type           = 'text';
        input.style.position = 'fixed';
        input.style.left     = x + 'px'
        input.style.top      = y + 'px';
        
        document.body.appendChild(input);
        toolbar.text.isExist = true;
        input.focus();

        input.addEventListener('keydown', function (e) {
            let enter = 13;
            if (e.keyCode === enter) {
                // 이 부분이 텍스트를 소켓으로 보내야 하는 부분이다!
                toolbar.text.contents = this.value;
                document.body.removeChild(this);
                toolbar.text.isExist = false;
                // 소켓 이벤트 필요!
                message.signalOp      = getsignalOp('text');
                message.textContents = toolbar.text.contents;

                _socket.emit('gigaginie', JSON.stringify(message));
                
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

    const getsignalOp = function (point) {
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
        message.signalOp = getsignalOp('clear');
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