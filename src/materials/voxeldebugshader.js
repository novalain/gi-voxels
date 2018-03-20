import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class VoxelDebugShader {
    constructor() {
        // Create shader based on params
        const vsSource = `#version 300 es

            precision highp float;

            layout(location = 0) in vec3 position;
            layout(location = 1) in vec3 normal;
            layout(location = 2) in vec2 uv;

            layout(location = 3) in vec3 tangent;
            layout(location = 4) in vec3 bitangent;
           
            layout (std140) uniform modelMatrices {
                mat4 modelMatrix;
                mat4 normalMatrix;
            };

            out vec2 vUv;
    
            void main() {
                // World space to tex coords        
            }
        `;

        const fsSource = `#version 300 es            
      
        void main() {
            
        }
    `;


        const gl = glContext();

        // Create program
        this.program = createAndCompileProgram(gl, vsSource, fsSource);
        // Keep uniform and attribute locations
        // this.programInfo = {
        //   uniformLocations: {
        //     numLights: gl.getUniformLocation(this.program, 'numLights'),
        //     numDirectionalLights: gl.getUniformLocation(this.program, 'numDirectionalLights')
        // },
        // uniformBlockLocations: {
        //     material: gl.getUniformBlockIndex(this.program, 'materialBuffer'),
        //     model: gl.getUniformBlockIndex(this.program, 'modelMatrices'),
        //     scene: gl.getUniformBlockIndex(this.program, 'sceneMatrices'),
        //     pointlights: gl.getUniformBlockIndex(this.program, 'pointLightsBuffer'),
        //     directionallights: gl.getUniformBlockIndex(this.program, 'directionalLightsBuffer'),
        //     gui: gl.getUniformBlockIndex(this.program, 'guiDataBuffer')
        // }
        // };
    }

    // Use this program (will always be only this program)
    activate() {
        const gl = glContext();
        gl.useProgram(this.program);
    }
}

export default VoxelDebugShader;