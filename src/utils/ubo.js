import { glContext } from '../renderer/renderer.js';

class UniformBufferObject {
  constructor(data) {
    const gl = glContext();

    this.location = ++UniformBufferObject.location;
    this.data = new Float32Array(data);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this.data, gl.STATIC_DRAW); // DYNAMIC_DRAW
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  bind() {
    const gl = glContext();
    gl.bindBufferBase(gl.UNIFORM_BUFFER, this.location, this.buffer);
  }

  // TODO: Dont upload all
  update(data, offset = 0) {
    const gl = glContext();
    this.data.set(data, offset);
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data, 0, null);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }
}

UniformBufferObject.location = 0;

export default UniformBufferObject;
