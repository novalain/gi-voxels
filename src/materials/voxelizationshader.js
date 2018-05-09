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
                vec3 directional_world;
            };

            out vec2 vUv;
            out vec3 normal_world;
            out vec4 position_depth;

            uniform mat4 viewProjection;

            void main() {
                mat4 biasMatrix = mat4(
                    0.5, 0.0, 0.0, 0.0,
                    0.0, 0.5, 0.0, 0.0,
                    0.0, 0.0, 0.5, 0.0,
                    0.5, 0.5, 0.5, 1.0
                );
                position_depth = biasMatrix * depthMVP * vec4(position, 1.0);

                vUv = uv;
                normal_world = vec3(modelMatrix * vec4(normal, 1.0));
                gl_Position = viewProjection * modelMatrix *  vec4(position, 1.0);
            }
        `;

    const fsSource = `#version 300 es
        precision highp float;
        precision highp int;
        precision highp sampler2DShadow;

        in vec2 vUv;
        in vec3 normal_world;
        in vec4 position_depth;

        layout (std140) uniform sceneBuffer {
            mat4 viewMatrix;
            mat4 projectionMatrix;
            mat4 depthMVP;
            vec3 directional_world;
        };

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
        uniform sampler2DShadow shadowMap;

        layout(location = 0) out vec4 layer0;

        void main() {
            vec3 L = normalize(directional_world);
            vec3 N = normalize(normal_world);

            float visibility = texture(shadowMap, vec3(position_depth.xy, (position_depth.z - 0.001)/position_depth.w));
            //if (texture( shadowMap, position_depth.xy ).r  <  position_depth.z - 0.005){
                //visibility = texture( shadowMap, position_depth.xy ).r;
             //   visibility = 0.0;
            //}

            float cosTheta = visibility *  max(dot(N, L), 0.0);

            //if (hasDiffuseMap) {
                float alpha = texture(textureMap, vec2(vUv.x, 1.0 - vUv.y)).a;
                layer0 = visibility * texture(textureMap, vec2(vUv.x, 1.0 - vUv.y));
                layer0.a = 1.0;
            //} else {
            //    layer0 = vec4(cosTheta * mdiffuse.xyz, 1.0);
           // }
        }
    `;

    const gl = glContext();

    // Create program
    this.program = createAndCompileProgram(gl, vsSource, fsSource);
  }

  // Use this program (will always be only this program)
  activate() {
    const gl = glContext();
    gl.useProgram(this.program);
  }
}

export default VoxelizationShader;