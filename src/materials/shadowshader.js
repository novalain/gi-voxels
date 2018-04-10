import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';

class ShadowShader {
    constructor() {
        // Create shader based on params
        const vsSource = `#version 300 es
            precision highp float;

            layout (std140) uniform modelMatrices {
                mat4 modelMatrix;
                mat4 normalMatrix;
            };

            layout(location = 0) in vec3 position;
            layout(location = 1) in vec3 normal;
            layout(location = 2) in vec2 uv;

            layout(location = 3) in vec3 tangent;
            layout(location = 4) in vec3 bitangent;

            uniform mat4 depthView;
            uniform mat4 depthProj;

            void main() {
                gl_Position = depthProj * depthView * modelMatrix * vec4(position, 1.0);
            }
        `;

        const fsSource = `#version 300 es 
            precision highp float;
        
            layout(location = 0) out float outColor;
            
            void main() {
                // Not really needed, OpenGL does it anyway
                outColor = gl_FragCoord.z;
            }
    `;
        const gl = glContext();
        // Create program
        this.program = createAndCompileProgram(gl, vsSource, fsSource);
    }

    // Use this program (will always be only this program)
    activate() {
        const gl = glContext();
        gl.useProgram(this.program);
    }
}

export default ShadowShader;