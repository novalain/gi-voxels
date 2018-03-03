import Object from '../core/object.js';
import { vec3 } from 'gl-matrix';
import { vec4 } from 'gl-matrix';
import Sphere from '../geometry/sphere.js';
import { glContext } from '../renderer/renderer.js';
import DebugShader from '../materials/debugshader.js'

class DirectionalLight extends Object {
  constructor(props) {
    super();

    this._debug = props.debug;
    this._color = props && props.color || [1.0, 1.0, 1.0, 1.0];
    this._intensity = props && props.intensity || 0.5;

    // TODO: vec3
    this.direction = props && vec4.fromValues(props.direction[0], props.direction[1], props.direction[2], props.direction[3]) || [0.0, -20.0, 0.0, 1.0];
    this.directionViewSpace = vec3.create();

    if (props.debug) {
      const sphere = new Sphere(3.2, 6);
      const gl = glContext();

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.positions), gl.STATIC_DRAW);

      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(sphere.indices), gl.STATIC_DRAW);

      this._indexCount = sphere.indices.length;

      this.buffers = {
        positions: positionBuffer,
        indices: indexBuffer
      }
      this._shader = new DebugShader();
    }
  }

  //get positionViewSpace() { return this._positionViewSpace; }
  get color() { return this._color; }
  get intensity() { return this._intensity; }

  //set positionViewSpace(psv) { this._positionViewSpace = psv; }
  set color(value) { this._color = value; }
  set intensity(value) { this._intensity = value; }

  draw(mvp) {
    console.assert(this._debug);

    const gl = glContext();
    const programInfo = this._shader.programInfo;
    this._shader.activate();

    gl.uniformMatrix4fv(programInfo.uniformLocations.mvp, false, mvp);

    // Positions
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions);
      gl.enableVertexAttribArray(
        programInfo.attribLocations.position);
      gl.vertexAttribPointer(
        programInfo.attribLocations.position,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
    gl.drawElements(gl.TRIANGLES, this._indexCount, gl.UNSIGNED_INT, 0);
  }
}

export default DirectionalLight;