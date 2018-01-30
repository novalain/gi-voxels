import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';

// OK, so we need to create the shader last when we have info about the whole scene and program
class DebugShader {
    constructor() {
    
        // Create shader based on params
        const vsSource = `#version 300 es
            precision mediump float;

            uniform mat4 mvp;
            in vec3 position;            

            void main() {
                gl_Position = mvp * vec4(position, 1.0);
            }
            `;

        const fsSource = `#version 300 es
        precision mediump float;

        out vec4 outColor;

        void main() {
            outColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
        `;

        const gl = glContext();

        // Create program
        this.program = createAndCompileProgram(gl, vsSource, fsSource);
        // Keep uniform and attribute locations
        this.programInfo = {
            attribLocations: {
                position: gl.getAttribLocation(this.program, 'position'),
            },
            uniformLocations: {
                mvp: gl.getUniformLocation(this.program, 'mvp') 
            },
        };
    }

    activate() {
        const gl = glContext();
        gl.useProgram(this.program);
    }
}

export default DebugShader;