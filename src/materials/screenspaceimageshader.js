import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class ScreenSpaceImageShader {
    constructor() {
        // Create shader based on params
        const vsSource = `#version 300 es
            precision highp float;
            layout(location = 0) in vec3 VertexPosition_model;

            out vec2 vUv;

            void main(){
                gl_Position =  vec4(VertexPosition_model, 1);
                vUv  = (VertexPosition_model.xy + vec2(1, 1))/2.0f;
            }
        `;

        const fsSource = `#version 300 es
            precision highp float;
            in vec2 vUv;

            layout(location = 0) out vec4 outColor;

            uniform sampler2D Texture;

            void main(){
                float res = texture(Texture, vUv).r;
                outColor = vec4(res, res, res, 1.0);

                //vec3 res = vec3(worldPosition);

                //outColor = vec4(normalize(res), 1.0);
                //outColor = vec4(texture(Texture, vUv).rgb, 1.0);
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

export default ScreenSpaceImageShader;