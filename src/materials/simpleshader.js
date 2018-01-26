import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';
import Texture from '../renderer/texture.js';

// OK, so we need to create the shader last when we have info about the whole scene and program
class SimpleShader {
    constructor(materialData, placeHolderImg) {
        //this.materials = [];

        // Object.entries(materialData.materialIndices).forEach(([key, value]) => {
        //     const material = materialData.materialsByIndex[value];
        //     // console.log("Material name ", key);
        //     // console.log("INdex!!", value);
        //     // console.log("Maps to" , material);
        //     // console.log("==============================")
        //     this.materials.push(material);
        // });
        
        this._materialData = materialData;
        
        // kd, ka etc.
        // Iterate through textures and create them!!!
        // for (let i = 0; i < this.materials.length; i++) {
        //     const tex = new Texture();

        //     // Missing texture
        //     if (!this.materials[i].mapDiffuse) {
        //         tex.createTexture(placeHolderImg);
        //         this._textures.push(tex);
        //         continue;
        //     }

        //     tex.createTexture(this.materials[i].mapDiffuse.texture);
        //     this._textures.push(tex);
        // }

      
        if (materialData.mapDiffuse) {
            this._texture = new Texture();
            this._texture.createTexture(materialData.mapDiffuse.texture);
        }

        // Create shader based on params
        const vsSource = `#version 300 es
            precision highp int;
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
            
            out vec3 vPosition;
            out vec3 vNormal;
            out vec2 vUv;

            void main() {
                vNormal = normalize(vec3(normalMatrix * vec4(normal, 1.0)));
                vUv = uv;
                vPosition = vec3(viewMatrix * modelMatrix * vec4(position, 1.0));
                //vMaterial = materialId;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
            }
            `;

        const fsSource = `#version 300 es
        precision mediump float;
        precision highp int;

        const int MAX_DIRECTIONAL_LIGHTS = 16;
        //const int MAX_MATERIALS = 25;
        //const int MAX_MAPS = 16;

        struct Directional {
            vec4 color;
            float intensity;
            vec3 position;
        };

        layout (std140) uniform materialBuffer {
            vec4 mambient;
            vec4 mdiffuse;
            vec4 memissive;
            vec4 mspecular;
            bool hasDiffuseMap;
            //float specularExponent;
        };

        // layout (std140) uniform materialBuffer {
        //     Material materials[MAX_MATERIALS];
        // };

        layout (std140) uniform directionalBuffer {
            Directional directionalLights[MAX_DIRECTIONAL_LIGHTS];
        };

        const float specularExponent = 96.0;

        uniform int numLights;
        //uniform vec3 color;
        //uniform sampler2D textureMap[MAX_MAPS];
        uniform sampler2D textureMap;

        in vec3 vPosition;
        in vec3 vNormal;
        in vec2 vUv;
        flat in uint vMaterial;

        vec3 Ia = vec3(0.3);
        vec3 Id = vec3(0.5);
        vec3 Is = vec3(0.5);

        out vec4 outColor;

        void light(int lightIndex, vec3 pos, vec3 norm, out vec3 ambient, out vec3 diffuse, out vec3 spec) {
            vec3 n = normalize(norm);
            vec3 s = normalize(directionalLights[lightIndex].position - pos);
            vec3 v = normalize(-pos);
            vec3 r = reflect(-s,n);

            vec3 ka = mambient.xyz; //vec3(0.8);
            vec3 kd = mdiffuse.xyz;  //vec3(0.64, 0.48, 0.32);
            vec3 ks = mspecular.xyz; // vec3(0.5, 0.5, 0.5);
            float shininess = specularExponent;

            ambient = Ia * ka;
            float sDotN = max(dot(s,n), 0.0);
            diffuse = Id * kd * sDotN;

            spec = Is * ks * pow(max(dot(r,v) , 0.0 ), shininess);
        }

        void main() {
            vec3 ambientSum = vec3(0);
            vec3 diffuseSum = vec3(0);
            vec3 specSum = vec3(0);
            vec3 ambient, diffuse, spec;

            if (gl_FrontFacing) {
                for (int i = 0; i < numLights; ++i) {
                    light(i, vPosition, vNormal, ambient, diffuse, spec);
                    ambientSum += ambient;
                    diffuseSum += diffuse;
                    specSum += spec;
                }
            } else {
                for (int i = 0; i < numLights; ++i) {
                    light(i, vPosition, -vNormal, ambient, diffuse, spec);
                    ambientSum += ambient;
                    diffuseSum += diffuse;
                    specSum += spec;
                }
            }
            ambientSum /= float(numLights);

            vec4 texColor = texture(textureMap, vec2(vUv.x, 1.0 - vUv.y));
        
            if (hasDiffuseMap) {
                outColor = vec4(ambientSum + diffuseSum, 1.0) * texColor + vec4(specSum, 1.0);
            } else {
                outColor = vec4(ambientSum + diffuseSum, 1.0) + vec4(specSum, 1.0);
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
                materialId: gl.getAttribLocation(this.program, 'materialId')
            },
            uniformLocations: {
                // These will always exist I guess
                numLights: gl.getUniformLocation(this.program, 'numLights')
                // Per material TODO make UBO
                //color: gl.getUniformLocation(this.program, 'color'),
                //map: gl.getUniformLocation(this.program, 'map')
            },
            uniformBlockLocations: {
                material: gl.getUniformBlockIndex(this.program, 'materialBuffer'),
                model: gl.getUniformBlockIndex(this.program, 'modelMatrices'),
                scene: gl.getUniformBlockIndex(this.program, 'sceneMatrices'),
                directional: gl.getUniformBlockIndex(this.program, 'directionalBuffer')
            }
        };
        // for (let i = 0; i < MAX_LIGHTS; ++i) {
        //   this.programInfo.uniformLocations.dLightPositions.push(gl.getUniformLocation(this.program, "dLightPositions" + i + "));
        // }
    }

    get materialData() { return this._materialData; }

    bindTextures() {
        const gl = glContext();
        gl.activeTexture(gl.TEXTURE0 + 0);
        this._texture.bind();
        const location = gl.getUniformLocation(this.program, 'textureMap');
        gl.uniform1i(location, 0);
        // let itx;
        // let samplerLocations = new Int32Array(this._textures.length);
        // for (itx = 0; itx < this._textures.length; ++itx) {
        //     const location = gl.getUniformLocation(this.program, 'textureMap[' + itx + ']');
        //     gl.activeTexture(gl.TEXTURE0 + itx);
        //     this._textures[itx].bind();
        //     gl.uniform1i(location, itx);
        // }
    }

    // This is weird
    // setUniform(name, value) {
    //     const gl = glContext();
    //     switch (name) {
    //         case 'numLights':
    //             gl.uniform1i(this.programInfo.uniformLocations.numLights, value);
    //             break;
    //             // case 'dLightPosition':
    //             //   gl.uniform3fv(this.programInfo.uniformLocations.dLightPosition, value);
    //             //   break;
    //             // case 'dLightIntensity':
    //             //   gl.uniform1f(this.programInfo.uniformLocations.dLightIntensity, value);
    //             //   break;
    //             // case 'modelViewMatrix' :
    //             //   gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, value);
    //             // break;
    //             // case 'projectionMatrix':
    //             //   gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, value);
    //             // break;
    //             // case 'normalMatrix':
    //             //   gl.uniformMatrix4fv(this.programInfo.uniformLocations.normalMatrix, false, value);
    //             // break;
    //             //case 'textureMap':
    //             //debugger;
    //             // gl.uniform1i(this.programInfo.uniformLocations.textureMap, value);
    //             break;
    //         default:
    //             console.warn('Unknown Uniform');
    //     }
    // }


    // Use this program (will always be only this program)
    activate() {
        const gl = glContext();
        gl.useProgram(this.program);
    }
}

export default SimpleShader;