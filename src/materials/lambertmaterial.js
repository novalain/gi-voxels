import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';

// TODO: Create generic material class
class LambertMaterial {
  constructor(props = {}) {
    console.assert(props.color);

    if (props.color === 'white') {
      this.color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    } else if (props.color === 'red') {
      this.color = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    }

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
      out vec3 vNormal;

      void main(void) {
        vNormal = vec3(normalMatrix * vec4(normal, 1.0));
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

      in vec3 vNormal;

      out vec4 outColor;
      void main(void) {
        vec3 dcolor = vec3(0.0);
        for (int i = 0; i < numLights; ++i) {
          vec3 fromLight = normalize(vec3(directionalLights[i].position));

          vec3 light = vec3(max(dot(vNormal, fromLight), 0.0));
          vec3 directionalColor = directionalLights[i].color.xyz * light;
          dcolor += mix(dcolor, directionalColor, directionalLights[i].intensity);
        }

        dcolor /= float(numLights);
        outColor = vec4(dcolor, 1.0);
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
    gl.uniform4fv(this.programInfo.uniformLocations.color, this.color);
  }

  activate() {
    const gl = glContext();
    gl.useProgram(this.program);
  }
}

export default LambertMaterial;