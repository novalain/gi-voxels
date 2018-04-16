import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class ConeTracerShader {
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
            out vec3 position_world;
            out vec4 position_depth;
            
            out vec3 normal_world;
            out mat3 tangentToWorld;

            void main() {

                mat4 biasMatrix = mat4(
                    0.5, 0.0, 0.0, 0.0,
                    0.0, 0.5, 0.0, 0.0,
                    0.0, 0.0, 0.5, 0.0,
                    0.5, 0.5, 0.5, 1.0
                );

                position_world = (modelMatrix * vec4(position, 1.0)).xyz;
                position_depth = biasMatrix * depthMVP * vec4(position, 1.0);

                // TODO: why do I need to normalize here? Bump factor too much weight otherwise
                normal_world = normalize((modelMatrix * vec4(normal,0.0)).xyz);
                vec3 tangent_world = normalize((modelMatrix * vec4(tangent,0.0)).xyz);
                vec3 bitangent_world = normalize((modelMatrix * vec4(bitangent,0.0)).xyz);

                vUv = uv;

                tangentToWorld = mat3(
                    tangent_world,
                    bitangent_world,
                    normal_world
                );

                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
            }
        `;

        const fsSource = `#version 300 es     
            precision highp float;      
            precision mediump sampler3D;

            layout (std140) uniform materialBuffer {
                vec4 mambient; // 16 0 - base | aligned offset
                vec4 mdiffuse; // 16 16
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
            uniform sampler2D shadowMap;

            in vec2 vUv;
            in vec3 position_world;
            in vec4 position_depth;
            in vec3 normal_world;

            in mat3 tangentToWorld;

            out vec4 outColor;

            layout (std140) uniform guiDataBuffer {
                float texLod;
                float bumpIntensity;
                bool displayNormalMap;
                bool displaySpecularMap;
            };

            vec3 calculateBumpNormal() {
                vec3 bn = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y)).rgb * 2.0 - 1.0;
                bn.x *= bumpIntensity;
                bn.y *= bumpIntensity;
                return normalize(tangentToWorld * bn);
            }

            void main() {
                vec4 materialColor = texture(textureMap, vec2(vUv.x, 1.0 - vUv.y));
                float alpha = materialColor.a;

                if (alpha < 0.5) discard;

                vec3 N = hasNormalMap ? calculateBumpNormal() : normal_world.xyz;
                vec3 L = normalize(vec3(-0.3, 0.9, -0.25));

                vec3 diffuseReflection;
                {
                    float visibility = 1.0;
                    if (texture( shadowMap, position_depth.xy ).r  <  position_depth.z - 0.005){
                        visibility = 0.0;
                    }

                    // Direct diffuse light
                    float cosTheta = max(0.0, dot(N, L));
                    vec3 directDiffuseLight = vec3(visibility * cosTheta);

                    // Indirect diffuse light
                    vec3 indirectDiffuseLight = vec3(0.0);

                    diffuseReflection = 2.0 * mdiffuse.xyz * (directDiffuseLight + indirectDiffuseLight) * materialColor.rgb;
                }

                if (displayNormalMap && hasNormalMap) {
                    outColor = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y));
                } else {
                    outColor = vec4(diffuseReflection, 1.0);
                }
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

export default ConeTracerShader;