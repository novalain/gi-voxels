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

      in vec4 position;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      void main(void) {
        gl_Position = projectionMatrix * modelViewMatrix * position;
      }
    `;

    const fsSource = `#version 300 es
      uniform lowp vec4 color;

      out lowp vec4 outColor;
      void main(void) {
        outColor = color;
      }
    `;

    const gl = glContext();

    this.uniforms = {};
    this.program = createAndCompileProgram(gl, vsSource, fsSource);
    this.programInfo = {
      attribLocations: {
        position: gl.getAttribLocation(this.program, 'position'),
      },
      uniformLocations: {
        color: gl.getUniformLocation(this.program, 'color'),
        projectionMatrix: gl.getUniformLocation(this.program, 'projectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(this.program, 'modelViewMatrix'),
      },
    };
  }

  // TODO: Totally unnecessary branching..
  setUniform(type, value) {
    const gl = glContext();
    switch (type) {
      case 'modelViewMatrix' :
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, value);
      break;
      case 'projectionMatrix':
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, value);
        break;
      default:
        console.err('Unknown Uniform');
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