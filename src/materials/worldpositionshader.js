import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class WorldPositionShader {
    constructor() {
        // Create shader based on params
        const vsSource = `#version 300 es
            precision highp float;

            layout(location = 0) in vec3 position;
            layout(location = 1) in vec3 normal;
            layout(location = 2) in vec2 uv;

            layout (std140) uniform sceneBuffer {
                mat4 viewMatrix;
                mat4 projectionMatrix;
                float numLights;
                float numDirectionalLights;
            };

            out vec3 worldPosition;

            void main() {
                worldPosition = vec3(vec4(position, 1.0));
                gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
            }
        `;

        const fsSource = `#version 300 es
            precision highp float;

            in vec3 worldPosition;
            out vec4 outColor;

            const int MAX_POINT_LIGHTS = 8;

            void main() {
                outColor.rgb = worldPosition;
                outColor.a = 1.0;
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

export default WorldPositionShader;