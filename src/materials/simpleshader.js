import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

class SimpleShader {
  constructor(materialData) {
    this._materialData = materialData;  

    if (materialData.mapDiffuse) {
      this._texture = new Texture();
      this._texture.createTexture(materialData.mapDiffuse.texture);
    }

    if (materialData.mapBump) {
      this._bumpMap = new Texture();
      this._bumpMap.createTexture(materialData.mapBump.texture);
    }

    // Create shader based on params
    const vsSource = `#version 300 es
            precision mediump int;
            precision mediump float;

            layout (std140) uniform modelMatrices {
                mat4 modelMatrix;
                mat4 normalMatrix;
            };
    
            layout (std140) uniform sceneMatrices {
                mat4 viewMatrix;
                mat4 projectionMatrix;
            };

            in vec3 position;
            in vec3 normal;
            in vec2 uv;

            in vec3 tangent;
            in vec3 bitangent;
            
            out vec3 vPosViewSpace;
            out vec2 vUv;

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
                
                vPosViewSpace = vec3(modelViewMatrix * vec4(position, 1.0));
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

    const fsSource = `#version 300 es
            precision mediump float;
            precision mediump int;

            const int MAX_DIRECTIONAL_LIGHTS = 16;

            layout (std140) uniform sceneMatrices {
                mat4 viewMatrix;
                mat4 projectionMatrix;
            };

            layout (std140) uniform modelMatrices {
                mat4 modelMatrix;
                mat4 normalMatrix;
            };

            struct Directional {
                vec3 positionViewSpace;
                vec4 color;
                float intensity;
            };

            layout (std140) uniform materialBuffer {
                vec4 mambient; // 16 0 
                vec4 mdiffuse; // 16 16
                //vec4 memissive; // 16 32
                vec4 mspecular; // 16 32
                float specularExponent; // 4 48
                float bumpIntensity; // 4 52
                bool hasDiffuseMap; // 4 56
                bool hasNormalMap; // 4 60
                bool displayNormalMap; // 4 64
            };

            layout (std140) uniform directionalBuffer {
                Directional directionalLights[MAX_DIRECTIONAL_LIGHTS];
            };

            uniform int numLights;
            uniform sampler2D textureMap;
            uniform sampler2D bumpMap;

            in vec3 vPosViewSpace;
            in vec3 vNormalViewSpace;

            in vec3 vTangentViewSpace;
            in vec3 vBitangentViewSpace;

            in mat3 TBN;
            in vec2 vUv;

            // TODO: light uniforms
            vec3 Ia = vec3(0.2);
            vec3 Id = vec3(1.0);
            vec3 Is = vec3(1.0);

            out vec4 outColor;

            void light(int lightIndex, vec3 vPos, vec3 norm, out vec3 ambient, out vec3 diffuse, out vec3 spec) {

                // View space
                vec3 n = norm;
                vec3 s = directionalLights[lightIndex].positionViewSpace - vPos;
                vec3 v = -vPos;

                if (hasNormalMap) {
                    // Convert from view to tangent space
                    s = normalize(TBN * s);
                    v = normalize(TBN * v);
                    //n = normalize(n);

                    vec3 bn = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y)).rgb * 2.0 - 1.0;
                    bn.x *= bumpIntensity;
                    bn.y *= bumpIntensity;

                    // Tangent space to modelview space
                    n = normalize(bn);
                } else {
                    s = normalize(s);
                    v = normalize(v);
                    n = normalize(n);
                }   

                ambient = Ia * mambient.xyz;
                diffuse = Id * mdiffuse.xyz * max(dot(s,n), 0.0);
                vec3 r = reflect(-s, n);
                spec   =  Is *  mspecular.xyz * pow(clamp(dot(r,v), 0.0, 1.0), specularExponent);
            } 
        
            void main() {
                vec3 ambientSum = vec3(0);
                vec3 diffuseSum = vec3(0);
                vec3 specSum = vec3(0);
                vec3 ambient, diffuse, spec;

                for (int i = 0; i < numLights; ++i) {
                    light(i, vPosViewSpace, vNormalViewSpace, ambient, diffuse, spec);
                    ambientSum += ambient;
                    diffuseSum += diffuse;
                    specSum += spec;
                }             
                ambientSum /= float(numLights);
            
                if (displayNormalMap && hasNormalMap) {
                    vec4 bumpColor = texture(bumpMap, vec2(vUv.x, 1.0 - vUv.y));
                    outColor = bumpColor;
                } else if (hasDiffuseMap) {
                    vec4 texColor = texture(textureMap, vec2(vUv.x, 1.0 - vUv.y));
                    //outColor = bumpColor;
                    outColor = vec4(diffuseSum, 1.0) * texColor; //+ vec4(specSum, 1.0);
                }  else {
                    outColor = vec4(1.0, 0.0, 0.0, 1.0);
                    //outColor = vec4(diffuseSum  , 1.0) + vec4(specSum, 1.0);
                }
            }
        `;

    const gl = glContext();

    // Create program
    this.program = createAndCompileProgram(gl, vsSource, fsSource);
    // Keep uniform and attribute locations
    this.programInfo = {
      attribLocations: {
        position: gl.getAttribLocation(this.program, 'position'),
        normal: gl.getAttribLocation(this.program, 'normal'),
        // How do we know that uv exists here? And in shader btw
        uv: gl.getAttribLocation(this.program, 'uv'),
        tangent: gl.getAttribLocation(this.program, 'tangent'),
        bitangent: gl.getAttribLocation(this.program, 'bitangent'),
        materialId: gl.getAttribLocation(this.program, 'materialId')
      },
      uniformLocations: {
        numLights: gl.getUniformLocation(this.program, 'numLights')
      },
      uniformBlockLocations: {
        material: gl.getUniformBlockIndex(this.program, 'materialBuffer'),
        model: gl.getUniformBlockIndex(this.program, 'modelMatrices'),
        scene: gl.getUniformBlockIndex(this.program, 'sceneMatrices'),
        directional: gl.getUniformBlockIndex(this.program, 'directionalBuffer')
      }
    };
  }

  get materialData() { return this._materialData; }

  bindTextures() {
    const gl = glContext();
    gl.activeTexture(gl.TEXTURE0 + 0);
    this._texture.bind();
    let location = gl.getUniformLocation(this.program, 'textureMap');
    gl.uniform1i(location, 0); // Tex unit 0

    if (this._bumpMap) {
      gl.activeTexture(gl.TEXTURE0 + 1);
      this._bumpMap.bind();
      location = gl.getUniformLocation(this.program, 'bumpMap');
      gl.uniform1i(location, 1); // Tex unit 1
    }
  }

  // Use this program (will always be only this program)
  activate() {
    const gl = glContext();
    gl.useProgram(this.program);
  }
}

export default SimpleShader;