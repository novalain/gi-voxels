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

            // layout (std140) uniform modelMatrices {
            //     mat4 modelMatrix;
            //     mat4 normalMatrix;
            // };
            
            out vec2 textureCoordinateFrag;

            vec2 scaleAndBias(vec2 p) { return 0.5 * p + vec2(0.5); }
            void main() {
                textureCoordinateFrag = scaleAndBias(position.xy);
                gl_Position = vec4(position, 1);
                // World space to tex coords        
            }
        `;

        const fsSource = `#version 300 es     
            precision highp float;      
            precision mediump sampler3D;                  

            #define STEP_LENGTH 0.005
            #define INV_STEP_LENGTH (1.0 / STEP_LENGTH)
            
            const int MAX_POINT_LIGHTS = 8;

            // // TODO remoev
            // layout (std140) uniform materialBuffer {
            //     vec4 mambient; // 16 0 - base | aligned offset
            //     vec4 mdiffuse; // 16 16
            //     //vec4 memissive;
            //     vec4 mspecular; // 16 32
            //     float specularExponent; // 4 48
            //     bool hasDiffuseMap; // 4 52
            //     bool hasNormalMap; // 4 56
            //     bool hasSpecularMap; // 4 60
            //     bool hasDissolveMap; // 4 64
            // };

            uniform sampler2D Texture; // Unit cube back FBO.
            uniform sampler3D texture3D; // Texture in which voxelization is stored.
            uniform vec3 cameraPosition;

            in vec2 textureCoordinateFrag; 
            out vec4 color;

           // int state = 0;
                        
            // Scales and bias a given vector (i.e. from [-1, 1] to [0, 1]).
            vec3 scaleAndBias(vec3 p) { return 0.5 * p + vec3(0.5); }

            void main() {
                float mipmapLevel = 0.0;
                // Initialize ray.
                vec3 origin = cameraPosition;
                vec3 direction = texture(Texture, textureCoordinateFrag).xyz - origin;
                int numberOfSteps = int(INV_STEP_LENGTH * length(direction));
                direction = normalize(direction);
               
                // Trace.
                color = vec4(0.0f);
                for(int step = 0; step < numberOfSteps && color.a < 0.99; ++step) {
                    vec3 currentPoint = origin + STEP_LENGTH * float(step) * direction;
                    vec3 coordinate = scaleAndBias(currentPoint);
                   
                    vec4 currentSample = textureLod(texture3D, vec3(1.0, 1.0, 1.0), mipmapLevel);
                    color += (1.0f - color.a) * currentSample;
                } 
                color.rgb = pow(color.rgb, vec3(1.0 / 2.2));
                
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