Docs Driven Development

# Gcode View Mode
Press `G`
begin typing commands into the console

# Example super-Gcode
G20
G91

>function rect2D(w, h) {
    G1 Y${y+h}
    X${x+w}
    Y${y}
    X${x}
>}

G0 X0.25 Y0.375
>for(let i = 0; i < 10; i++) {
>   rect2D(0, 0, )
>}

-v-v-v-v-v-v-

function rect2D(x, y, w, h) {
    sentences.push(`G0 X${x} Y${y}`);
    sentences.push(`G1 Y${y+h}`);
    sentences.push(`X${x+w}`);
    sentences.push(`Y${y}`);
    sentences.push(`X${x}`);
}
