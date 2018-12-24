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

        const wordPattern = /[A-Z]-?\d+([.]\d+)?/g;
        
        const axes = {
            X: 0, Y: 1, Z: 2,
            I: 0, J: 1, K: 2,
        };
        
        const lengthParams = [
            `X`, `Y`, `Z`,
            `I`, `J`, `K`,
            `R`,
        ];
        
        const cartesianParams = [
            `X`, `Y`, `Z`,
            `I`, `J`, `K`,
        ];

        let lines = [];
        //string = string.toUpperCase();
        sentences = string.split(`\n`);
        sentences.forEach(function(sentence, i) {
            const newXYZ = Point.copy(state.machine);
            const newIJK = Point.copy(state.machine);
            
            let params = {};
            let found;
            
            while ((found = wordPattern.exec(sentence)) !== null) {
                let word = found[0];
                let letter = word[0];

                // handle G-codes
                if (letter == `G`) {
                    selectMode(word);
                    continue;
                }
                
                // handler parameters
                
                const param = parseParam(word);
                
                if (lengthParams.includes(letter)) {
                    param = toLengthUnits(param);
                }
                
                if (cartesianParams.includes(letter)) {
                    if (modalGroups.coordMode.selection == `G91`) {
                        // handle relative coords
                        let axis = axes[letter];
                        param += state.machine.position[axis];
                    }
                }
                
                if (`XYZ`.includes(letter)) {
                    let axis = axes[letter];
                    newXYZ.position[axis] = param;
                }
                
                if (`IJK`.includes(letter)) {
                    let axis = axes[letter];
                    newIJK.position[axis] = param;
                }
                
                params[letter] = param;
            }
            
            // certain parameters specify movement
            const hasMovement = (
                params.X !== undefined || 
                params.Y !== undefined || 
                params.Z !== undefined ||
                params.I !== undefined || 
                params.J !== undefined || 
                params.K !== undefined ||
                params.R !== undefined
            );
            
            if (hasMovement) {
                // Generate lines
                switch(modalGroups.motion.selected) {
                    case `G0`:
                        // no lines generates
                        break;
                    case `G1`:
                        const line = Line.create(state.machine, newXYZ);
                        line.number = i;
                        lines.push(line);
                        break;
                    case `G2`:
                        // TODO: segment clockwise arc
                        // either use R or IJK
                        function arc(start, end, radius) {
                            const targetSegmentSize = 1e-2;
                            const segmentCount = ~~(length / targetSegmentSize);
                            const segmentSize = length / segmentCount;
                            
                            for (let i = 0; i < segmentCount; i++) {
                                const line = Line.create(
                                    Point.create(), 
                                    Point.create()
                                );
                            }
                        }
                        break;
                    case `G3`:
                        // TODO: segment counterclockwise arc
                        break;
                }

                state.machine = newXYZ;
            }
        });

        return lines;
    },
    
    // 1 inch = 1 unit in WebGL
    toLengthUnits(units) {
        return {
            G20: 1 * units,
            G21: 1 / 25.4 * units,
        }[modalGroups.units.selected];
    },
    
    selectMode(word) {
        for (let group of Object.values(modalGroups)) {
            if (group.options.includes(word)) {
                group.selected = word;
                return true;
            }
        }
        
        return false;
    },
    
    parseParam(word) {
        return parseFloat(word.substring(1));
    },
};
