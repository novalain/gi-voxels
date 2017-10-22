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

    const vsSource = `
      attribute vec4 position;
      //attribute vec4 aVertexColor;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      //varying lowp vec4 vColor;
      void main(void) {
        gl_Position = projectionMatrix * modelViewMatrix * position;
        //vColor = aVertexColor;
      }
    `;

    const fsSource = `
      //varying lowp vec4 color;
      uniform lowp vec4 color;
      void main(void) {
        gl_FragColor = color;
      }
    `;

    const gl = glContext();

    this.uniforms = {};
    this.program = createAndCompileProgram(gl, vsSource, fsSource);
    this.programInfo = {
      // program: createAndCompileProgram(gl, vsSource, fsSource).
      attribLocations: {
        position: gl.getAttribLocation(this.program, 'position'),
      },
      uniformLocations: {
        color: gl.getUniformLocation(this.program, 'color'),
        projectionMatrix: gl.getUniformLocation(this.program, 'projectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(this.program, 'modelViewMatrix'),
      },
    };
    //this.program = new Program(params);
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