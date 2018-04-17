import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class VoxelizationShader {
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

            layout (std140) uniform sceneBuffer {
                mat4 viewMatrix;
                mat4 projectionMatrix;
                mat4 depthMVP;
                float numLights;
                float numDirectionalLights;
            };

            out vec2 vUv;
            out vec3 vNormalWorld;
            out vec3 vPositionWorld;

            uniform mat4 viewProjection;

            void main() {
                vUv = uv;
                vPositionWorld = vec3(modelMatrix * vec4(position, 1.0));
                vNormalWorld = vec3(modelMatrix * vec4(normal, 1.0));
                gl_Position = viewProjection * modelMatrix *  vec4(position, 1); 
            }
        `;

    const fsSource = `#version 300 es            
        precision highp float;
        precision highp int;

        in vec2 vUv;
        in vec3 vNormalWorld;
        in vec3 vPositionWorld;

        const int MAX_POINT_LIGHTS = 8;

        uniform int renderTargetLayer;

        layout (std140) uniform sceneBuffer {
            mat4 viewMatrix;
            mat4 projectionMatrix;
            mat4 depthMVP;
            float numLights;
            float numDirectionalLights;
        };

        layout (std140) uniform materialBuffer {
            vec4 mambient; // 16 0 - base | aligned offset
            vec4 mdiffuse; // 16 16
            //vec4 memissive;
            vec4 mspecular; // 16 32
            float specularExponent; // 4 48
            bool hasDiffuseMap; // 4 52
            bool hasNormalMap; // 4 56
            bool hasSpecularMap; // 4 60
            bool hasDissolveMap; // 4 64
        };

        uniform sampler2D textureMap;
        uniform sampler2D bumpMap;
        uniform sampler2D specularMap;
        uniform sampler2D dissolveMap;

        struct PointLight {
            vec3 position;
            vec4 color;
            float intensity;
        };

        layout (std140) uniform pointLightsBuffer {
            PointLight pointLights[MAX_POINT_LIGHTS];
        };

        uniform bool xAxis;

        // Lighting attenuation factors.
        #define DIST_FACTOR 1.1 /* Distance is multiplied by this when calculating attenuation. */
        #define CONSTANT 1.0
        #define LINEAR 0.0
        #define QUADRATIC 1.0

        layout(location = 0) out vec4 layer0;
   
        // Returns an attenuation factor given a distance.
        float attenuate(float dist) { 
            dist *= DIST_FACTOR; 
            return 1.0 / (CONSTANT);// + LINEAR * dist;// + QUADRATIC * dist * dist); 
        }
        
        vec3 calculatePointLight(PointLight light){
            vec3 vertexPosition;
            vertexPosition = vPositionWorld;

            vec3 L = vec3(-0.3, 0.9, -0.25);

            //vec3 L = light.position - vertexPosition;
            vec3 direction = normalize( L );
            float distanceToLight = distance(light.position, vertexPosition);
            float attenuation = attenuate(distanceToLight);
            float d = max(dot(normalize(vNormalWorld), direction), 0.0);
            return d * vec3(1.0); // intensity, light color missing
        }

        void main() {
            vec3 color = vec3(0.0f);
            for(int i = 0; i < int(numLights); ++i) {
                color += calculatePointLight(pointLights[i]);
            }

            if (hasDiffuseMap) {
                layer0 = vec4(color, 1.0) * texture(textureMap, vec2(vUv.x, 1.0 - vUv.y)); 
            } else {
                layer0 = vec4(color, 1.0);
            }        
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

export default VoxelizationShader;