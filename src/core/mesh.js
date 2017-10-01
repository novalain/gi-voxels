import Object from './object.js';
import { vec3, mat3, mat4, quat } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js'

import { createAndCompileProgram } from '../renderer/renderer_utils.js'

class Mesh extends Object {
  constructor(geometry/*,material*/) {
    super();


    // Init opengl buffers
    const gl = glContext();
    this.buffers = this.initBuffers(gl, geometry);

    // TODO: Material

    const vsSource = `
      attribute vec4 aVertexPosition;
      //attribute vec4 aVertexColor;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      //varying lowp vec4 vColor;
      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        //vColor = aVertexColor;
      }
    `;

    const fsSource = `
      //varying lowp vec4 vColor;
      void main(void) {
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
      }
    `;

    const shaderProgram = createAndCompileProgram(gl, vsSource, fsSource);

    this.programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      },
    };
  }

  initBuffers(gl, geometry) {
    // Positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);

    // Indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Now send the element array to GL
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

    return {
      position: positionBuffer,
      indices: indexBuffer,
    };
  }

  render() {
    const gl = glContext();
    const fieldOfView = 35 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 1000.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(
        this.programInfo.attribLocations.vertexPosition);
    gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    gl.useProgram(this.programInfo.program);
    // Set uniforms
    gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        this.modelMatrix);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }
}

export default Mesh;