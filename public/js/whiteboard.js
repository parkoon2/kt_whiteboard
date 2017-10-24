var KT = KT || {};

KT.Whiteboard = (function (window) {
    const width  = window.innerWidth,
          height = window.innerHeight;

    let _canvas     = null, 
        _ctx        = null,
        _socket     = null,
        _interval   = null,
        _count      = 0;

    let toolbar = {
        type: 'draw',
        
        line: {
            thickness: 1
        },
        erase: {
            color: '#fffff',
            radius: 10 
        }
    }    

    let message = {
        eventOp: null,
        pos: {
            x: 0,
            y: 0
        },
        thickness: 1,
        toolbarType: null

    };

    let mouse = {
        click: null,
    };

    function Whiteboard (canvas, socket) {

        _canvas = canvas;
        _ctx    = canvas.getContext('2d');
        _socket = socket;

        _canvas.onmousedown = function(e) { 
            /* 클릭 했을 때 모든 세팅 정보를 넘긴다 예를들어 지우개인지 텍스트인지 드로잉인지, 칼라, 두깨, 등등*/
            mouse.click         = true;
            message.pos.x       = e.clientX / width;
            message.pos.y       = e.clientY / height;
            message.thickness   = toolbar.thickness;
            message.toolbarType = toolbar.type;
            
            message.eventOp     = setEventOp('start');
            console.log('보내기전', JSON.stringify(message))
            _socket.emit('gigaginie', JSON.stringify(message));
        };

        _canvas.onmouseup   = function(e) { 

            mouse.click     = false;
            message.pos.x   = e.clientX / width;
            message.pos.y   = e.clientY / height;
            message.eventOp = setEventOp('end');
            
            _socket.emit('gigaginie', JSON.stringify(message));
            
        }
     
        _canvas.onmousemove = function(e) {

            message.eventOp = setEventOp('move');
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
            console.log('1')
            // 여기서 라인, 지우개, 다 세팅해도 문제 없을까? 함수로 뺀다면 빼겟지?
            _ctx.lineWidth      = _msg.thickness;
            _ctx.strokeStyle    = '#ff0000';
            _ctx.fillColor      = '#ff0000' // 지우개는 항상 하얀색이니까 계속 세팅 할 필요가 없겠지>
    
            switch (_msg.eventOp) {
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
                _ctx.arc(msg.pos.x * width, _msg.pos.y * height, toolbar.erase.radius, 0, Math.PI * 2, false);
                _ctx.stroke();
                break;

                case 'EraseEnd':
                _ctx.closePath();
                break;
            }
        })
    }

    const setEventOp = function (point) {
        let op;
        switch (point) {
            case 'start':
            if (toolbar.type === 'draw') {
                op = "DrawStart";
            } else if (toolbar.type === 'erase') {
                op = "EraseStart";
            }
            break;

            case 'move':
            if (toolbar.type === 'draw') {
                op = "DrawMove";
            } else if (toolbar.type === 'erase') {
                op = "EraseMove";
            }            
            break;

            case 'end':
            if (toolbar.type === 'draw') {
                op = "DrawEnd";
            } else if (toolbar.type === 'erase') {
                op = "EraseEnd";
            }      
            break;
        }
        return op;
    }

    Whiteboard.prototype = {
        // 옵션이 필요할까? 생각 해보자
        setOption: function (option) {
            toolbar.thickness  = option.thickness || 1
            _interval          = option.interval || 2;
        },

        setLineWidth: function (thickness) {
            toolbar.thickness = thickness;
        },

        setToolbarType: function (type) {
            toolbar.type = type;
        }
    }
    
    return Whiteboard
})(window);