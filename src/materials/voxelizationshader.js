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

            out vec2 vUv;
            out vec3 vNormalWorld;
            out vec3 vPositionWorld;

            uniform mat4 viewProjZ;
    
            void main() {
                //vert.UV = vertexUV;
                //vert.position_depth = DepthModelViewProjectionMatrix * vec4(vertexPosition_model, 1);
                //vert.position_depth.xyz = vert.position_depth.xyz * 0.5f + 0.5f;
                
                // To projected space!!
                vUv = uv;
                vPositionWorld = vec3(modelMatrix * vec4(position, 1.0));
                vNormalWorld = vec3(normalMatrix * vec4(normal, 1.0));
                // We need to project and rasterize with the viewport
                gl_Position = viewProjZ * modelMatrix * vec4(position, 1); 
            }
        `;

    const fsSource = `#version 300 es            
        precision highp float;

        in vec2 vUv;
        in vec3 vNormalWorld;
        in vec3 vPositionWorld;

        const int MAX_POINT_LIGHTS = 8;

        uniform int renderTargetLayer;

        layout (std140) uniform sceneBuffer {
            mat4 viewMatrix;
            mat4 projectionMatrix;
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

        struct PointLight {
            vec3 position;
            vec4 color;
            float intensity;
        };

        layout (std140) uniform pointLightsBuffer {
            PointLight pointLights[MAX_POINT_LIGHTS];
        };


        // Lighting attenuation factors.
        #define DIST_FACTOR 1.1 /* Distance is multiplied by this when calculating attenuation. */
        #define CONSTANT 1.0
        #define LINEAR 0.0
        #define QUADRATIC 1.0

        layout(location = 0) out vec4 layer0;
        layout(location = 1) out vec4 layer1;
        layout(location = 2) out vec4 layer2;
        layout(location = 3) out vec4 layer3;
        layout(location = 4) out vec4 layer4;
        layout(location = 5) out vec4 layer5;
        layout(location = 6) out vec4 layer6;
        layout(location = 7) out vec4 layer7;

        // Returns an attenuation factor given a distance.
        float attenuate(float dist) { 
            dist *= DIST_FACTOR; 
            return 1.0 / (CONSTANT + LINEAR * dist + QUADRATIC * dist * dist); 
        }
        
        vec3 calculatePointLight(PointLight light){
            vec3 direction = normalize(light.position - vPositionWorld);
            float distanceToLight = distance(light.position, vPositionWorld);
            float attenuation = attenuate(distanceToLight);
            float d = max(dot(normalize(vNormalWorld), direction), 0.0);
            return d * 1.0 * attenuation * vec3(1.0); // intensity, light color missing
        }

        void main() {
            ivec3 camPos = ivec3(gl_FragCoord.x, gl_FragCoord.y, 64.0 * gl_FragCoord.z);
            ivec3 texPos = camPos;
           // texPos.z = 64 - texPos.z - 1;

            vec3 color = vec3(0.0f);
            for(int i = 0; i < int(numLights); ++i) {
                color += calculatePointLight(pointLights[i]);
            }

            vec3 spec = 1.0 * vec3(mspecular);
            vec3 diff = 1.0 * vec3(mdiffuse);

            // 1.0 in clamp is emissivity
            color = (diff + spec) * color + clamp(1.0, 0.0, 1.0) * vec3(mdiffuse);
    
            // 0, 8, 16
           // if (texPos.z == (renderTargetLayer * 8 + 0)) {
                layer0 = vec4(0.0, 0.0, 0.0, 0.0);
            //}

            // 1, 9. 17
            //if (texPos.z == (renderTargetLayer * 8 + 1)) {
                layer1 = vec4(0.0, 0.0, 0.0, 0.0);
            //}

            //if (texPos.z == (renderTargetLayer * 8 + 2)) {
                layer2 = vec4(0.0, 0.0, 0.0, 0.0);
            //}

            //if (texPos.z == (renderTargetLayer * 8 + 3)) {
                layer3 = vec4(0.0, 0.0, 0.0, 0.0);
            //} 

            //if (texPos.z == (renderTargetLayer * 8 + 4)) {
                layer4 = vec4(0.0, 0.0, 0.0, 0.0);
            //} 

           // if (texPos.z == (renderTargetLayer * 8 + 5)) {
                layer5 = vec4(0.0, 0.0, 0.0, 0.0);
            //} 

            //if (texPos.z == (renderTargetLayer * 8 + 6)) { 
                layer6 = vec4(0.0, 0.0, 0.0, 0.0);
           // } 

            //if (texPos.z == (renderTargetLayer * 8 + 7)) {
                layer7 = vec4(0.0, 0.0, 0.0, 0.0);
            //} 
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