import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class Material {
  constructor(materialData) {
    this._materialData = materialData;  

    // Create shader based on params
    const vsSource = `
            #version 300 es

            layout(location = 0) in vec3 position;
            layout(location = 1) in vec2 normal;
            layout(location = 2) in vec3 uv;
            layout(location = 3) in vec3 tangent;
            layout(location = 4) in vec3 bitangent;
           
            layout (std140) uniform modelMatrices {
                mat4 modelMatrix;
                mat4 normalMatrix;
            }

            out vec2 vUv;
    
            void main() {
                //vert.UV = vertexUV;
                //vert.position_depth = DepthModelViewProjectionMatrix * vec4(vertexPosition_model, 1);
                //vert.position_depth.xyz = vert.position_depth.xyz * 0.5f + 0.5f;
                
                // To projected space!!
                gl_Position = modelMatrix * vec4(position, 1); 
            }
        `;

    const fsSource = `#version 300 es
            precision mediump float;
            precision mediump int;

            in vec2 vUv;

            // Lighting attenuation factors.
            #define DIST_FACTOR 1.1f /* Distance is multiplied by this when calculating attenuation. */
            #define CONSTANT 1
            #define LINEAR 0
            #define QUADRATIC 1

            struct PointLight {
                vec3 positionWorldSpace;
                vec4 color;
                float intensity;
            };

            layout (std140) uniform pointLightsBuffer {
                PointLight pointLights[MAX_POINT_LIGHTS];
            };

            uniform int numLights;

            // Returns an attenuation factor given a distance.
            float attenuate(float dist){ dist *= DIST_FACTOR; return 1.0f / (CONSTANT + LINEAR * dist + QUADRATIC * dist * dist); }

            vec3 calculatePointLight(const PointLight light){
                const vec3 direction = normalize(light.positionWorldSpace - worldPositionFrag);
                const float distanceToLight = distance(light.positionWorldSpace, worldPositionFrag);
                const float attenuation = attenuate(distanceToLight);
                const float d = max(dot(normalize(normalFrag), direction), 0.0f);
                return d * 1.0 * attenuation * vec4(1.0, 1.0, 1.0, 1.0);
            };
            
            void main() {
                for(uint i = 0; i < numLights; ++i) {
                    color += calculatePointLight(pointLights[i]);
                }

                ivec3 camPos = ivec3(gl_FragCoord.x, gl_FragCoord.y, VoxelDimensions * gl_FragCoord.z);



                
                gl_FragData[0] = vec4(0.25);
                gl_FragData[1] = vec4(0.25);
                gl_FragData[2] = vec4(0.25);
                gl_FragData[3] = vec4(0.25);
                gl_FragData[4] = vec4(0.25);
                gl_FragData[5] = vec4(0.25);
                gl_FragData[6] = vec4(0.25);
                gl_FragData[7] = vec4(0.25);


                //vec3 spec = material.specularReflectivity * material.specularColor;
	            //vec3 diff = material.diffuseReflectivity * material.diffuseColor;
                //color = (diff + spec) * color + clamp(material.emissivity, 0, 1) * material.diffuseColor;

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

export default Material;