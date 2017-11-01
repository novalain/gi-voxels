import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';

// TODO: Create generic material class
class PhongMaterial {
  constructor(props = {}) {
    console.assert(props.color);

    this.color = props.color;
    this.uniforms = {};

    const vsSource = `#version 300 es
      uniform perModel {
        mat4 modelMatrix;
        mat4 normalMatrix;
      };

      uniform perScene {
        mat4 viewMatrix;
        mat4 projectionMatrix;
      };

      in vec3 position;
      in vec3 normal;

      out vec3 vPosition;
      out vec3 vNormal;

      // out Data {
      //   vec3 position;
      //   vec3 normal;
      // } data;

      void main() {
        vNormal = normalize(vec3(normalMatrix * vec4(normal, 1.0)));
       // vNormal = normal;
        vPosition = vec3(viewMatrix * modelMatrix * vec4(position, 1.0));
        // TODO texcoord
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `;

    const fsSource = `#version 300 es
      precision mediump float;

      const int MAX_DIRECTIONAL_LIGHTS = 16;

      struct Directional {
        vec4 color;
        float intensity;
        vec3 position;
      };

      uniform directional {
        Directional directionalLights[MAX_DIRECTIONAL_LIGHTS];
      };

      uniform int numLights;
      uniform vec3 color;

      vec3 ka = vec3(0.0);
      vec3 kd = vec3(0.64, 0.48, 0.32);
      vec3 ks = vec3(0.5, 0.5, 0.5);
      float shininess = 96.078431;

      vec3 Ia = vec3(0.0);
      vec3 Id = vec3(0.5);
      vec3 Is = vec3(0.5);

      in vec3 vPosition;
      in vec3 vNormal;

      out vec4 outColor;

      void light(int lightIndex, vec3 pos, vec3 norm, out vec3 ambient, out vec3 diffuse, out vec3 spec) {
        vec3 n = normalize(norm);
        vec3 s = normalize(directionalLights[lightIndex].position - pos);
        vec3 v = normalize(-pos);
        vec3 r = reflect(-s,n);

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

        //vec4 texColor = texture(Tex, data.TexCoord);
        outColor = vec4(ambientSum + diffuseSum, 1.0) + vec4(specSum, 1.0);
      }
    `;

    const gl = glContext();

    this.uniforms = {};
    this.program = createAndCompileProgram(gl, vsSource, fsSource);
    this.programInfo = {
      attribLocations: {
        position: gl.getAttribLocation(this.program, 'position'),
        normal: gl.getAttribLocation(this.program, 'normal')
      },
      uniformLocations: {
        numLights: gl.getUniformLocation(this.program, 'numLights'),
        color: gl.getUniformLocation(this.program, 'color'),
        projectionMatrix: gl.getUniformLocation(this.program, 'projectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(this.program, 'modelViewMatrix'),
        normalMatrix: gl.getUniformLocation(this.program, 'normalMatrix')
      },
    };
    // for (let i = 0; i < MAX_LIGHTS; ++i) {
    //   this.programInfo.uniformLocations.dLightPositions.push(gl.getUniformLocation(this.program, "dLightPositions" + i + "));
    // }
  }

  // TODO: Totally unnecessary branching..
  setUniform(name, value) {
    const gl = glContext();
    switch (name) {
      case 'numLights':
        gl.uniform1i(this.programInfo.uniformLocations.numLights, value);
      break;
      case 'dLightPosition':
        gl.uniform3fv(this.programInfo.uniformLocations.dLightPosition, value);
        break;
      case 'dLightIntensity':
        gl.uniform1f(this.programInfo.uniformLocations.dLightIntensity, value);
        break;
      case 'modelViewMatrix' :
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, value);
      break;
      case 'projectionMatrix':
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, value);
      break;
      case 'normalMatrix':
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.normalMatrix, false, value);
      break;
      default:
        console.warn('Unknown Uniform');
    }
  }

  setInternalUniforms() {
    const gl = glContext();
    gl.uniform3fv(this.programInfo.uniformLocations.color, this.color);
  }

  activate() {
    const gl = glContext();
    gl.useProgram(this.program);
  }
}

export default PhongMaterial;