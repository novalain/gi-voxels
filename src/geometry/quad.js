import { glContext } from '../renderer/renderer.js';
import Entity from '../core/object.js';

class Quad extends Entity {
  constructor(width, height) {
    super();
    this.positions = [
      -1.0, -1.0, 0.0,
      1.0, -1.0, 0.0,
      -1.0, 1.0, 0.0,
      -1.0, 1.0, 0.0,
      1.0, -1.0, 0.0,
      1.0, 1.0, 0.0,
    ];

    const gl = glContext();
    this._vao = gl.createVertexArray();
    gl.bindVertexArray(this._vao);
    // Position buffer
    {
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(
        0,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }
  }

  draw() {
    const gl = glContext();
    gl.bindVertexArray(this._vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

export default Quad;