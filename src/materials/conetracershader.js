import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class ConeTracerShader {
    constructor() {
        // Create shader based on params
        const vsSource = `#version 300 es
            precision highp float;

            // Cred https://turanszkij.wordpress.com/2017/08/30/voxel-based-global-illumination/
            // and https://github.com/Cigg/Voxel-Cone-Tracing/blob/master/shaders/standard.frag

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
                vec3 directional_world;
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
                    normal_world,
                    bitangent_world
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

            layout (std140) uniform sceneBuffer {
                mat4 viewMatrix;
                mat4 projectionMatrix;
                mat4 depthMVP;
                vec3 directional_world;
            };

            uniform sampler2D textureMap;
            uniform sampler2D bumpMap;
            uniform sampler2D specularMap;
            uniform sampler2D dissolveMap;
            uniform sampler2D shadowMap;
            uniform sampler3D voxelTexture;

            uniform float sceneScale;
            uniform float voxelResolution;
            uniform vec3 camera_world;

            in vec2 vUv;
            in vec3 position_world;
            in vec4 position_depth;
            in vec3 normal_world;

            in mat3 tangentToWorld;

            out vec4 outColor;

            float voxelWorldSize;

            const int NUM_CONES = 6;
            vec3 coneDirections[6] = vec3[](
                                        vec3(0, 1, 0),
                                        vec3(0, 0.5, 0.866025),
                                        vec3(0.823639, 0.5, 0.267617),
                                        vec3(0.509037, 0.5, -0.700629),
                                        vec3(-0.509037, 0.5, -0.700629),
                                        vec3(-0.823639, 0.5, 0.267617)
                                        );
            float coneWeights[6] = float[](0.25, 0.15, 0.15, 0.15, 0.15, 0.15);

            layout (std140) uniform guiDataBuffer {
                float bumpIntensity;
                float indirectMultiplier;
                float directMultiplier;
                float specularMultiplier;
                float occlusionMultiplier;
                float voxelConeStepSize;
                float voxelConeMaxDist;
                bool displayNormalMap;
                bool displayOcclusion;
            };

            vec3 scaleAndBias(vec3 p) { return 0.5 * p + vec3(0.5); }

            vec3 calculateBumpNormal() {
                vec3 bn = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y)).rgb * 2.0 - 1.0;
                bn.x *= bumpIntensity;
                bn.y *= bumpIntensity;
                return normalize(tangentToWorld * vec3(bn.x, 1.0, bn.y));
            }

            vec4 sampleVoxels(vec3 worldPosition, float mip) {
                return textureLod(voxelTexture, scaleAndBias(worldPosition / 3000.0), mip);
            }

            vec4 coneTrace(vec3 direction, float aperture, out float occlusion) {
                vec3 color = vec3(0.0);
                float alpha = 0.0;
                occlusion = 0.0;

                float dist = voxelWorldSize; // Start one voxel away to avoid self occlusion
                vec3 startPos = position_world + normal_world * voxelWorldSize;
                float maxDistance = voxelConeMaxDist * voxelWorldSize;
                int count = 0;

                while (dist < maxDistance && alpha < 0.95) {
                    // smallest sample diameter possible is the voxel size
                    float diameter = max(voxelWorldSize, 2.0 * aperture * dist);
                    float mip = log2(diameter / voxelWorldSize);

                    vec3 worldPosition = startPos + dist * direction;
                    vec4 voxelColor = textureLod(voxelTexture, scaleAndBias(worldPosition / sceneScale), mip);

                   // if (voxelColor.a > 0.0) {
                        // front-to-back compositing
                        float a = (1.0 - alpha);
                        color = color + a * voxelColor.rgb;
                        alpha = alpha + a * voxelColor.a;
                        occlusion = occlusion + a * voxelColor.a;
                    //}

                    // step along the ray
                    dist = dist + diameter * voxelConeStepSize;
                }

                return vec4(color, alpha);
            }

            void main() {
                if (hasDissolveMap) {
                    if (texture(dissolveMap, vec2(vUv.x, 1.0 - vUv.y)).r  < 0.1) {
                        discard;
                    }
                }

                voxelWorldSize = sceneScale / voxelResolution;

                vec4 materialColor = vec4(1.0);
                float alpha = 1.0;
                //if (hasDiffuseMap) {
                    materialColor = texture(textureMap, vec2(vUv.x, 1.0 - vUv.y));
                    alpha = materialColor.a;
                //}
                float occlusion = 0.0;

                vec3 N = hasNormalMap ? calculateBumpNormal() : normalize(normal_world.xyz);
                vec3 L = normalize(directional_world);
                vec3 E = normalize(camera_world - position_world);

                float visibility = 1.0;
                if (texture(shadowMap, position_depth.xy).r  <  position_depth.z - 0.0005){
                    //visibility = indirectMultiplier > 0.0 ? texture( shadowMap, position_depth.xy ).r : 0.0;
                    visibility = 0.0;
                }

                // Direct + indirect lightning
                vec3 diffuseReflection = vec3(0.0);
                {
                    // Direct diffuse light
                    float cosTheta = max(0.0, dot(N, L));
                    vec3 directDiffuseLight = directMultiplier * vec3(visibility * cosTheta);

                    // Indirect lightning
                    vec4 indirectDiffuseLight;
                    for(int i = 0; i < NUM_CONES; i++) {
                        float tmpocc = 0.0;
                        // 60 degree cones -> tan(30) = 0.577
                        // 90 degree cones -> tan(45) = 1.0
                        indirectDiffuseLight = indirectDiffuseLight + coneWeights[i] * coneTrace(tangentToWorld * coneDirections[i], 0.577, tmpocc);
                        occlusion = occlusion + coneWeights[i] * tmpocc;
                    }

                    indirectDiffuseLight = indirectMultiplier * 2.0 * indirectDiffuseLight;

                    occlusion = 1.0 - occlusion;
                    occlusion = min(1.0, occlusionMultiplier * occlusion); // Make occlusion brighter

                    diffuseReflection = 2.0 * occlusion * mdiffuse.xyz * (directDiffuseLight + indirectDiffuseLight.xyz) * materialColor.rgb;
                }

                // Specular light
                vec3 specularReflection = vec3(0.0);
                {
                   // vec4 specularColor = vec4(1.0);
                   // if (hasSpecularMap)  {
                        vec4 specularColor = texture(specularMap, vec2(vUv.x, 1.0 - vUv.y));
                        specularColor = length(specularColor.gb) > 0.0 ? specularColor : specularColor.rrra;
                    //}
                    vec3 reflectDir = normalize(-E - 2.0 * dot(-E, N) * N);

                    // Trace single cone
                    float specularOcclusion = 0.0;
                    vec4 tracedSpecular = coneTrace(reflectDir, 0.07, specularOcclusion); // 0.2 = 22.6 degrees, 0.1 = 11.4 degrees, 0.07 = 8 degrees angle
                    specularReflection = 2.0 * specularMultiplier * specularColor.rgb * tracedSpecular.rgb;
                }

                if (displayNormalMap && hasNormalMap) {
                    outColor = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y));
                } else if (displayOcclusion) {
                    outColor = vec4(occlusion, occlusion, occlusion, 1.0);
                } else {
                    outColor = vec4(diffuseReflection + specularReflection, alpha);
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