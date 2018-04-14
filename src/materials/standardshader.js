import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class StandardShader {
    constructor() {
        // Create shader based on params
        const vsSource = `#version 300 es
            precision mediump int;
            precision mediump float;

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

            layout(location = 0) in vec3 position;
            layout(location = 1) in vec3 normal;
            layout(location = 2) in vec2 uv;

            layout(location = 3) in vec3 tangent;
            layout(location = 4) in vec3 bitangent;
            
            out vec3 vPosViewSpace;
            out vec2 vUv;
            out vec3 worldPosVertex;
            out vec4 positionDepth;

            out vec3 vNormalViewSpace;
            out vec3 vTangentViewSpace;
            out vec3 vBitangentViewSpace;

            out mat3 TBN;

            void main() {
                mat4 modelViewMatrix = viewMatrix * modelMatrix;
                                
                vNormalViewSpace = vec3(mat3(modelViewMatrix) * normalize(normal));
                vTangentViewSpace = vec3(mat3(modelViewMatrix) * normalize(tangent));
                vBitangentViewSpace = vec3(mat3(modelViewMatrix) * normalize(bitangent));
            
                // Transpose is ok since we don't do non-uniform scaling
                TBN = transpose(mat3(
                    vTangentViewSpace,
                    vBitangentViewSpace,
                    vNormalViewSpace
                ));

                mat4 biasMatrix = mat4(
                    0.5, 0.0, 0.0, 0.0,
                    0.0, 0.5, 0.0, 0.0,
                    0.0, 0.0, 0.5, 0.0,
                    0.5, 0.5, 0.5, 1.0
                    );

                positionDepth = biasMatrix * depthMVP * vec4(position, 1.0);
                //positionDepth.xyz = positionDepth.xyz * 0.5 + 0.5;

                worldPosVertex = vec3(modelViewMatrix  * vec4(position, 1.0));
                vPosViewSpace = vec3(modelViewMatrix * vec4(position, 1.0));
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fsSource = `#version 300 es
            precision mediump float;
            precision mediump int;
            precision mediump sampler2DShadow;

            const int MAX_DIRECTIONAL_LIGHTS = 8;
            const int MAX_POINT_LIGHTS = 8;

            layout (std140) uniform sceneBuffer {
                mat4 viewMatrix; // 64 0
                mat4 projectionMatrix; // 64 64
                mat4 depthMVP;
                float numLights;
                float numDirectionalLights;
            };

            layout (std140) uniform modelMatrices {
                mat4 modelMatrix;
                mat4 normalMatrix;
            };

            struct PointLight {
                vec3 position;
                vec4 color;
                float intensity;
            };

            struct DirectionalLight {
                vec3 directionViewSpace;
                vec4 color;
                float intensity;
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

            layout (std140) uniform pointLightsBuffer {
                PointLight pointLights[MAX_POINT_LIGHTS];
            };

            layout (std140) uniform directionalLightsBuffer {
                DirectionalLight directionalLights[MAX_DIRECTIONAL_LIGHTS];
            };

            layout (std140) uniform guiDataBuffer {
                float texLod;
                float bumpIntensity;
                bool displayNormalMap;
                bool displaySpecularMap;
            };

            // Textures
            uniform sampler2D textureMap;
            uniform sampler2D bumpMap;
            uniform sampler2D specularMap;
            uniform sampler2D dissolveMap;
            uniform sampler2D shadowMap;

            in vec3 vPosViewSpace;
            in vec3 vNormalViewSpace;

            in vec3 worldPosVertex;
            in vec4 positionDepth;

            in vec3 vTangentViewSpace;
            in vec3 vBitangentViewSpace;

            in mat3 TBN;
            in vec2 vUv;

            // TODO: light uniforms
            vec3 Ia = vec3(0.2);
            vec3 Id = vec3(1.0);
            vec3 Is = vec3(1.0);

            out vec4 outColor;

            void light(int lightIndex, vec3 vPos, vec3 norm, out vec3 ambient, out vec3 diffuse, out vec3 spec, bool directional) {

                // View space
                vec3 n = norm;
                vec3 l;

                if (directional) {
                    l = directionalLights[lightIndex].directionViewSpace;
                } else {
                    l = vec3(viewMatrix * vec4(pointLights[lightIndex].position, 1.0)) - vPos; // Light dir
                }

                vec3 v = -vPos;

                if (hasNormalMap) {
                    // Convert from view to tangent space
                    l = normalize(TBN * l);
                    v = normalize(TBN * v);

                    vec3 bn = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y)).rgb * 2.0 - 1.0;
                    bn.x *= bumpIntensity;
                    bn.y *= bumpIntensity;
                    n = normalize(bn);
                } else {
                    l = normalize(l)    ;
                    v = normalize(v);
                    n = normalize(n);
                }   

                ambient = Ia * mambient.xyz;

                diffuse = vec3(0);
                spec  = vec3(0);

                //float visibility = texture(shadowMap, vec3(positionDepth.xy, (positionDepth.z - 0.0005)/positionDepth.w));

                float visibility = 1.0;
                float bias = 0.005;
                if ( texture( shadowMap, positionDepth.xy ).r  <  positionDepth.z - bias){
                    visibility = 0.0;
                }

                float intensity = visibility * max(dot(n, l), 0.0);


                if (intensity > 0.0) {
                    diffuse = Id * mdiffuse.xyz * intensity;

                    //vec3 r = reflect(-l, n); // phong
                    vec3 h = normalize(l + v); // blinn phong
                    
                    float intSpec = max(dot(h, n), 0.0);
                    spec = Is * vec3(1.0, 1.0, 1.0) * pow(intSpec, specularExponent);
                    //spec = Is * vec3(1.0, 1.0, 1.0) * pow(max(dot(r,v), 0.0), specularExponent);
                }
            } 
        
            void main() {
                vec3 ambientSum = vec3(0);
                vec3 diffuseSum = vec3(0);
                vec3 specSum = vec3(0);
                vec3 ambient, diffuse, spec;

                for (int i = 0; i < int(numLights); ++i) {
                    light(i, vPosViewSpace, vNormalViewSpace, ambient, diffuse, spec, /*directional=*/false);
                    ambientSum += ambient;
                    diffuseSum += diffuse;
                    specSum += spec;
                }          
                
                for (int i = 0; i < int(numDirectionalLights); ++i) {
                    light(i, vPosViewSpace, vNormalViewSpace, ambient, diffuse, spec, /*directional=*/true);
                    ambientSum += ambient;
                    diffuseSum += diffuse;
                    specSum += spec;
                }          

                ambientSum /= float(numLights);

                //float visibility = texture(shadowMap, vec3(positionDepth.xy, (positionDepth.z - 0.0005) / positionDepth.w));
                

                if (displayNormalMap && hasNormalMap) {
                    vec4 bumpColor = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y));
                    outColor = bumpColor;
                } else if (displaySpecularMap && hasSpecularMap) {
                    outColor = texture(specularMap, vec2(vUv.x, 1.0 - vUv.y));
                }  else if (hasDiffuseMap) {
                    vec4 specularMapColor = texture(specularMap, vec2(vUv.x, 1.0 - vUv.y));
                    vec4 texColor = texture(textureMap, vec2(vUv.x, 1.0 - vUv.y));
                    outColor = 2.0 * vec4(diffuseSum, 1.0) * texColor;//  + vec4(specSum, 1.0) * specularMapColor * float(hasSpecularMap);
                } else {
                    // No texture
                    outColor = vec4(0.0, 0.0, 0.0, 1.0);
                    //outColor = vec4(diffuseSum, 1.0) + vec4(specSum, 1.0);
                }

                // Dissolve map
                // TODO: Greyscale, this is a waste of memory
                if (hasDissolveMap) {
                    vec4 alphaVal = texture(dissolveMap, vec2(vUv.x, 1.0 - vUv.y));
                    
                    if (alphaVal.x < 0.001) {
                        discard;
                    }
                }
                //outColor = vec4(worldPosVertex, 1.0);
            }
        `;
        const gl = glContext();
        // // Create program
    
        this.program = createAndCompileProgram(gl, vsSource, fsSource);
        // // Keep uniform and attribute locations
        // this.programInfo = {
        //     uniformLocations: {
        //         numLights: gl.getUniformLocation(this.program, 'numLights'),
        //         numDirectionalLights: gl.getUniformLocation(this.program, 'numDirectionalLights')
        //     },
        //     uniformBlockLocations: {
        //         material: gl.getUniformBlockIndex(this.program, 'materialBuffer'),
        //         model: gl.getUniformBlockIndex(this.program, 'modelMatrices'),
        //         scene: gl.getUniformBlockIndex(this.program, 'sceneMatrices'),
        //         pointlights: gl.getUniformBlockIndex(this.program, 'pointLightsBuffer'),
        //         directionallights: gl.getUniformBlockIndex(this.program, 'directionalLightsBuffer'),
        //         gui: gl.getUniformBlockIndex(this.program, 'guiDataBuffer')
        //     }
        // };
    }

    // bindTextures() {
    //     const gl = glContext();
    //     let location;
    //     if (this._texture) {
    //         gl.activeTexture(gl.TEXTURE0 + 0);
    //         this._texture.bind();
    //         location = gl.getUniformLocation(this.program, 'textureMap');
    //         gl.uniform1i(location, 0); // Tex unit 0
    //     }

    //     if (this._bumpMap) {
    //         gl.activeTexture(gl.TEXTURE0 + 1);
    //         this._bumpMap.bind();
    //         location = gl.getUniformLocation(this.program, 'bumpMap');
    //         gl.uniform1i(location, 1); // Tex unit 1
    //     }

    //     if (this._specularMap) {
    //         gl.activeTexture(gl.TEXTURE0 + 2);
    //         this._specularMap.bind();
    //         location = gl.getUniformLocation(this.program, 'specularMap');
    //         gl.uniform1i(location, 2);
    //     }

    //     if (this._dissolveMap) {
    //         gl.activeTexture(gl.TEXTURE0 + 3);
    //         this._dissolveMap.bind();
    //         location = gl.getUniformLocation(this.program, 'dissolveMap');
    //         gl.uniform1i(location, 3);
    //     }
    // }

    // Use this program (will always be only this program)
    activate() {
        //console.log("activating...")
        const gl = glContext();
        gl.useProgram(this.program);
    }
}

export default StandardShader;