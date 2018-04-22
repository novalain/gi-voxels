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
        
            out vec2 textureCoordinateFrag;

            vec2 scaleAndBias(vec2 p) { return 0.5 * p + vec2(0.5); }
            void main() {
                textureCoordinateFrag = scaleAndBias(position.xy);
                gl_Position = vec4(position, 1);
            }
        `;

        const fsSource = `#version 300 es     
            precision highp float;      
            precision mediump sampler3D;                  

            #define STEP_LENGTH 5.0
            
            const int MAX_POINT_LIGHTS = 8;

            uniform sampler2D Texture; // Unit cube back FBO.
            uniform sampler3D texture3D; // Texture in which voxelization is stored.
            uniform vec3 cameraPosition;

            uniform float mipmapLevel;
            uniform float stepLength;
            uniform float sceneScale;

            in vec2 textureCoordinateFrag; 
            out vec4 color;
                        
            // Scales and bias a given vector (i.e. from [-1, 1] to [0, 1]).
            vec3 scaleAndBias(vec3 p) { return 0.5 * p + vec3(0.5); }

            void main() {
                // Initialize ray.
                vec3 origin = cameraPosition;
                vec3 direction = texture(Texture, textureCoordinateFrag).xyz - origin;
                int numberOfSteps = int( length(direction) / stepLength);
                direction = normalize(direction);
                
                // trace
                color = vec4(0.0f);
                for(int i = 0; i < numberOfSteps; ++i) {
                    vec3 currentPoint = origin + stepLength * float(i) * direction;
                    vec4 currentSample = textureLod(texture3D, scaleAndBias(currentPoint / sceneScale), mipmapLevel);

                    if (currentSample.a > 0.0) {
                        currentSample.rgb /= currentSample.a;
                        // Alpha compositing
                        color.rgb = color.rgb + (1.0 - color.a) * currentSample.a * currentSample.rgb;
                        color.a   = color.a   + (1.0 - color.a) * currentSample.a;
                    }
                    if (color.a > 0.95) {
                        break;
                    }
                    color += currentSample;
                } 
                //color.rgb = pow(color.rgb, vec3(1.0 / 3.2));
            }
    `;
        const gl = glContext();
        this.program = createAndCompileProgram(gl, vsSource, fsSource);
    }

    // Use this program (will always be only this program)
    activate() {
        const gl = glContext();
        gl.useProgram(this.program);
    }
}

export default VoxelDebugShader;