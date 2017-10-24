var KT = KT || {};

KT.Whiteboard = (function (window) {
    const width  = window.innerWidth,
          height = window.innerHeight;

    let _canvas = null, 
        _ctx    = null,
        _socket = null;

    let message = {
        eventOp: null,
        pos: {
            x: 0,
            y: 0
        }
    };

    let mouse = {
        click: null,
    };

    function Whiteboard (canvas, socket) {

        _canvas = canvas;
        _ctx    = canvas.getContext('2d');
        _socket = socket;

        _canvas.onmousedown = function(e) { 

            mouse.click     = true;
            message.pos.x   = e.clientX / width;
            message.pos.y   = e.clientY / height;
            message.eventOp = "DrawStart";

            _ctx.beginPath();

            _socket.emit('gigaginie', JSON.stringify(message));
        };
        _canvas.onmouseup   = function(e) { 

            mouse.click     = false;
            message.pos.x   = e.clientX / width;
            message.pos.y   = e.clientY / height;
            message.eventOp = "DrawEnd";

            _ctx.beginPath();
            _socket.emit('gigaginie', JSON.stringify(message));
            
        };
     
        _canvas.onmousemove = function(e) {
            message.eventOp = "DrawMove";
            message.pos.x   = e.clientX / width;
            message.pos.y   = e.clientY / height;
            if (mouse.click) {
                _socket.emit('gigaginie', JSON.stringify(message));
            }
        };

        socket.on('gigaginie', function (msg) {
            console.log(msg)
            switch (msg.eventOp) {
                case 'DrawStart':
                console.log('시작')
                break;
                case 'DrawMove':
                    
                console.log('중간')
                break;
                case 'DrawEnd':
                console.log('끝')
                    
                break;
            }
        })
    }
    
    return Whiteboard
})(window);