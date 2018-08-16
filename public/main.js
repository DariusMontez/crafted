let LINES = [];

let uniformLocations;
//let lines = [];

const positionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();

gl.enable(gl.DEPTH_TEST);
gl.lineWidth(2);

const Point = {
    create(position, color=[0, 0, 1]) {
        return { type: `Point`, position, color  };
    },
    copy(point) {
        return Point.create([...point.position], [...point.color]);
    }
};  

const Line = {
    create(start, end) {
        return { type: `Line`, start, end }
    },
};

const Polyline = {
    create(points) {
        let lines = [];
        for (i = 0; i < points.length-1; i++) {
            lines.push(Line.create(points[i], points[i+1]));
        }
        return {
            type: `Polyline`,
            lines
        };
    },
};

const Loop = {
    create(points) {
        let lines = Polyline.create(points).lines;
        let lastLine = lines[lines.length - 1];
        lines.push(Line.create(lastLine.end, lines[0].start));

        return {
            type: `Loop`,
            lines
        }
    }
};


function drawLines(lines) {

    let positionData = [];
    let colorData = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        positionData.push(...line.start.position);
        colorData.push(...line.start.color);
        
        positionData.push(...line.end.position);
        colorData.push(...line.end.color);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionData), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.LINES, 0, positionData.length / 3); // 3 coords per vertex
}


// MATRICES
// ========
const modelMatrix = mat4.create();
const viewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const mvMatrix = mat4.create();
const mvpMatrix = mat4.create();


mat4.perspective(projectionMatrix, 
    75 * Math.PI / 180, // vertical field-of-view (angle, radians)
    canvas.width / canvas.height, // aspect W/H
    1e-4, // near cull distance
    1e4 // far cull distance
);
mat4.translate(viewMatrix, viewMatrix, [0, 0, 5]);
mat4.invert(viewMatrix, viewMatrix);

const GCODE = {
    parse(string) {

        const modalGroups = {
            motion:     { options: [`G0`, `G1`],    selected: `G0` },
            units:      { options: [`G20`, `G21`],  selected: `G20` },
            coordMode:  { options: [`G90`, `G91`],  selected: `G90` },
        };


        const state = {
            feedrate: 0,
            machine: Point.create([0, 0, 0]),
        };

        function toGLunits(units) {
            return {
                G20: 1 * units,
                G21: 1 / 25.4 * units,
            }[modalGroups.units.selected];
        }

        let lines = [];
        //string = string.toUpperCase();
        sentences = string.split(`\n`);
       

        sentences.forEach(function(sentence, i) {
            const newPoint = Point.copy(state.machine);
            let shouldMove = false;

            const re = /[A-Z]-?\d+([.]\d+)?/g;
            let found;
            while ((found = re.exec(sentence)) !== null) {
                let word = found[0];
                let letter = word[0];

                if (letter == `G`) {
                    for (let group of Object.values(modalGroups)) {
                        if (group.options.includes(word)) {
                            group.selected = word;
                        }
                    }

                } else if (`XYZ`.includes(letter)) {
                    shouldMove = true;
                    let number = parseFloat(word.substring(1));
                    let pixels = toGLunits(number);
                    let axis = letter;

                    //console.log(`${modalGroups.motion.selected} ${axis}${pixels}px`);

                    let axisIndex = `XYZ`.indexOf(letter);
                    let newAxisPosition;

                    if (modalGroups.coordMode.selected == `G90`) {
                        // absolute coords
                        newAxisPosition = pixels;
                    } else if (modalGroups.coordMode.selected == `G91`) {
                        // relative coords
                        newAxisPosition = state.machine.position[axisIndex] + pixels;
                    }

                    newPoint.position[axisIndex] = newAxisPosition;
                
                }
            } // while
            
            if (shouldMove) {
                //console.log(`${modalGroups.motion.selected} to ${newPoint.position}`);
                
                if (modalGroups.motion.selected == `G1`) { 
                    let line = Line.create(state.machine, newPoint);
                    line.number = i;
                    //line.start.color = line.end.color = [Math.random(), Math.random(), Math.random()];
                    lines.push(line);
                }

                state.machine = newPoint;
            }
        });

        return lines;
    } 
};

const Console = {
    mount(el) {
        this.lines = [];
        
        this.$el = el;
        this.$el.addEventListener(`input`, e => {
            this.update(e);
            draw();
        });
        
        this.$el.innerText = localStorage.getItem(`Console.text`);
        this.$el.focus();
        
        // set cursor to end
        if (this.$el.lastChild) {
            getSelection().collapse(this.$el.lastChild, this.$el.lastChild.textContent.length);
        }
        
        this.update();
    },

    update(e) {
        localStorage.setItem(`Console.text`, this.$el.innerText)

        const newLines = GCODE.parse(this.$el.innerText);
        this.lines = this.lines.splice(0, newLines.length);

        /*
        function wrapLine(el, lineNumber, node) {
            let line;
            
            if (lineNumber == el.children.length) {
                line = el.children[lineNumber - 1].nextSibling;
                el.insertBefore(node, line);
                node.appendChild(line);
                console.log('!!!')
            } else {
                let lineBreak = el.children[lineNumber];
                line = lineBreak.previousSibling;
                el.insertBefore(node, line);
                node.appendChild(line);
            }
            console.log(lineNumber, line, node);
        }
        */

        newLines.forEach((newLine, i) => {
            if (this.lines[i] === undefined) {
                const newColor = [Math.random(), Math.random(), Math.random()];
                this.lines[i] = Line.create(
                    Point.create(null, newColor), 
                    Point.create(null, newColor)
                );
                
            }
            
            this.lines[i].start.position = newLine.start.position;
            this.lines[i].end.position = newLine.end.position;
            this.lines[i].number = newLine.number;

            /*
            let wrapper = document.createElement(`span`);
            let rgb = this.lines[i].start.color.map(x=>~~(x*255));
            let colorRGB = `rgb(${rgb.join(',')})`;
            wrapper.style.color = colorRGB;
            
            wrapLine(this.$el, newLine.number, wrapper);
            */
        });
    },
};

canvas.onwheel = e => {
    let amountX = 0;
    let amountY = 0;
    let amountZ = 0;
    if (e.shiftKey) {
        amountX = e.deltaX * 0.1;
        amountY = e.deltaY * -0.05;
    } else {
        amountZ = e.deltaY * -0.1;
    }
    mat4.translate(viewMatrix, viewMatrix, [amountX, amountY, amountZ]);
    draw();
};
canvas.onmousemove = e => {
    const radiansX = (2 * (e.pageX - canvas.offsetLeft) / canvas.offsetWidth) - 1;
    const radiansY = (2 * (e.pageY - canvas.offsetTop) / canvas.offsetHeight) - 1;

    const r = quat.create();
    quat.rotateY(r, r, radiansX);
    quat.rotateX(r, r, radiansY);
    mat4.fromQuat(modelMatrix, r);
    draw();
};
canvas.onmouseout = e => {
    mat4.identity(modelMatrix);
    setTimeout(draw, 0);
}

function draw() {
    gl.lineWidth(2);
    drawLines(Console.lines);
    
    gl.lineWidth(4);
    drawLines(AXES);
}

// ANIMATION LOOP
// ==============
function animate() {
    requestAnimationFrame(animate);
    
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(mvpMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
}


const ORIGIN = Point.create([0, 0, 0], [0, 0, 0]);

const AXES = [
    // X: red
    Line.create(ORIGIN, Point.create([1, 0, 0], [1, 0, 0])),

    // Y: green
    Line.create(ORIGIN, Point.create([0, 1, 0], [0, 1, 0])),

    // Z: blue
    Line.create(ORIGIN, Point.create([0, 0, 1], [0, 0, 1])),
];

// MAIN PROGRAM
// ============
(async function main() {
    const vertexSource = await fetch(`shaders/vertex.glsl`).then(res => res.text());
    const fragmentSource = await fetch(`shaders/fragment.glsl`).then(res => res.text());
    const program = createProgram(vertexSource, fragmentSource);

    attachAttribute(program, `position`, positionBuffer, 3);
    attachAttribute(program, `color`, colorBuffer, 3);

    uniformLocations = {
        matrix: gl.getUniformLocation(program, `matrix`),
    };

    Console.mount(document.getElementById(`console`));
    
    animate();
    draw();


})();

