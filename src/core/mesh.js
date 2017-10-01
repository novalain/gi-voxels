import Object3 from './object';
import { vec3, mat3, mat4, quat } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js'

import { createAndCompileProgram } from '../renderer/renderer_utils.js'
//import { getContext } from '../session';

var cubeRotation = 0;

class Mesh {
  constructor(geometry/*,material*/) {
    this.position = vec3.create();
    this.rotation = vec3.create();
    this.scale = vec3.fromValues(1, 1, 1);
    this.quat = quat.create();

    this.geometry = geometry;
    this.modelMatrix = mat4.create();

    // Init opengl buffers
    const gl = glContext();
    this.buffers = this.initBuffers(gl, geometry);

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
    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVevrtexColor and also
    // look up uniform locations.
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



    //this.material = 'RED';

      // // assign attributes
      // Object.assign(this.material.attributes, {
      //     a_position: {
      //         type: 'vec3',
      //         value: this.geometry.positions,
      //     }
      //     // a_normal: {
      //     //     type: 'vec3',
      //     //     value: this.geometry.normals,
      //     // },
      //     // a_uv: {
      //     //     type: 'vec2',
      //     //     value: this.geometry.uvs,
      //     // },
      // });

      // assign uniforms
      // Object.assign(this.material.uniforms, {
      //     modelMatrix: {
      //         type: 'mat4',
      //         value: this.modelMatrix,
      //     },
      //     normalMatrix: {
      //         type: 'mat3',
      //         value: this.normalMatrix,
      //     },
      // });

      // pass indices to material so we can bind buffers
      //Object.assign(this.material, { indices: this.geometry.indices });
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

  update() {
    mat4.identity(this.modelMatrix);

    mat4.translate(this.modelMatrix,     // destination matrix
                   this.modelMatrix,     // matrix to translate
                   [0.0, 0.0, -5.0]);  // amount to translate
    mat4.rotate(this.modelMatrix,  // destination matrix
                this.modelMatrix,  // matrix to rotate
                cubeRotation,     // amount to rotate in radians
                [0, 0, 1]);       // axis to rotate around (Z)
    mat4.rotate(this.modelMatrix,  // destination matrix
                this.modelMatrix,  // matrix to rotate
                cubeRotation * .7,// amount to rotate in radians
                [0, 1, 0]);       // axis to rotate around (X)
    cubeRotation += 0.01;

  }

  render() {

    const gl = glContext();
    const fieldOfView = 35 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 1000.0;
    const projectionMatrix = mat4.create();
    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
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