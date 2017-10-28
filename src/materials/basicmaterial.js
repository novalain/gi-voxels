import { glContext } from '../renderer/renderer.js';
import { vec4 } from 'gl-matrix';
import { createAndCompileProgram } from '../renderer/renderer_utils.js';

// TODO: Create generic material class
class BasicMaterial {
  constructor(props = {}) {
    console.assert(props.color);

    if (props.color === 'white') {
      this.color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    } else if (props.color === 'red') {
      this.color = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    }

    this.uniforms = {};

    const vsSource = `#version 300 es
      in vec3 position;
      in vec3 normal;

      out vec3 vNormal;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform mat4 normalMatrix;
      void main(void) {

        vNormal = vec3(normalMatrix * vec4(normal, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fsSource = `#version 300 es
      precision mediump float;

      in vec3 vNormal;

      uniform vec4 color;
      uniform vec3 dLightPosition;
      uniform float dLightIntensity;

      out vec4 outColor;
      void main(void) {

        vec3 dcolor = vec3(0.0);
        vec3 fromLight = normalize(dLightPosition);

        vec3 light = vec3(max(dot(vNormal, fromLight), 0.0));
        vec3 directionalColor = vec3(1.0, 1.0, 1.0) * light;
        dcolor += mix(dcolor, directionalColor, 0.5); // Mix by intensity

        dcolor /= float(1.0);
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
        dLightPosition: gl.getUniformLocation(this.program, "dLightPosition"),
        dLightIntensity: gl.getUniformLocation(this.program, "dLightIntensity"),
        color: gl.getUniformLocation(this.program, 'color'),
        projectionMatrix: gl.getUniformLocation(this.program, 'projectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(this.program, 'modelViewMatrix'),
        normalMatrix: gl.getUniformLocation(this.program, 'normalMatrix')
      },
    };

    // Init light uniforms..
  }

  // TODO: Totally unnecessary branching..
  setUniform(name, value, type) {
    const gl = glContext();
    switch (name) {
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

export default BasicMaterial;