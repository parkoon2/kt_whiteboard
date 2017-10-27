document.addEventListener('DOMContentLoaded', function () {
    
    const socket = io.connect();
    
    let wb = {
        instance: null,
        canvas: null,
        button: ['pen', 'text', 'eraser'],
        eraser: {
            size: {
                small   : 10,
                large   : 20
            }
        },
        pen: {
            thickness: {
                small   : 1,
                medium  : 5,
                large   : 10
            }
        },
        color: {
            red     : '#ff0000',
            blue    : '#0402f1',
            orange  : '#ffa400', 
        },
        text: {
            size: {
                small   : 10,
                medium  : 15,
                large   : 20
            }
        }
    }

    const option = {
        type        : 'pen',
        color       : '#000000',
        thickness   : 1,
        eraser_size : 10,
        text_size   : 10
    }

    wb.canvas       = document.querySelector('#whiteboard');
    wb.instance     = new Whiteboard(wb.canvas, socket, option);
    wb.canvas.width = window.innerWidth / 2;
    wb.canvas.height = window.innerHeight / 2;

    document.querySelector('#clear').addEventListener('click', function () {
        wb.instance.clear();
    })

    wb.button.map(function (val) {
        document.querySelector(`#${val}`).addEventListener('click', function () {
            console.log(`you choose a(an) ${val}`)
            wb.instance.toolbar.type = val;
        });
    })

    Object.keys(wb.text.size).map(function (key) {
        let val = wb.text.size[key];
        document.querySelector(`#text_${key}`).addEventListener('click', function () {
            wb.instance.text.size = val;
        })
    })

    Object.keys(wb.eraser.size).map(function (key) {
        let val = wb.eraser.size[key];
        document.querySelector(`#eraser_${key}`).addEventListener('click', function () {
            wb.instance.eraser.size = val;
        })
    })


    Object.keys(wb.pen.thickness).map(function (key) {
        let val = wb.pen.thickness[key];
        document.querySelector(`#pen_${key}`).addEventListener('click', function () {
            wb.instance.pen.thickness = val;
        })
        
    })

    Object.keys(wb.color).map(function (key) {
        let val = wb.color[key];
        document.querySelector(`#color_${key}`).addEventListener('click', function () {
            wb.instance.color = val;
        })
    })

})