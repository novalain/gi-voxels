import { glContext } from '../renderer/renderer.js';

class ProgramObject {
  constructor(cname, vsSource, fsSource) {
    this.name = name;
    this.program = _createAndCompileProgram(vsSource, fsSource)
  }

  get name() { return this.name; }

  _createAndCompileProgram(vsSource, fsSource) {
    const gl = glContext();
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return;
    }

    return shaderProgram;
  }

  _loadShader(gl, type, source) {
    const gl = glContext();
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  activate() {
    const gl = glContext();
    gl.useProgram(this.program);
  }

  setUniform(uniform) {
    switch(uniform.type) {
      case 'mat4':
          gl.uniformMatrix4fv(uniform.location, false, uniform.value);
          break;
      case 'mat3':
          gl.uniformMatrix3fv(uniform.location, false, uniform.value);
          break;
      case 'vec4':
          gl.uniform4fv(uniform.location, uniform.value);
          break;
      case 'vec3':
          gl.uniform3fv(uniform.location, uniform.value);
          break;
      case 'vec2':
          gl.uniform2fv(uniform.location, uniform.value);
          break;
      case 'float':
          gl.uniform1f(uniform.location, uniform.value);
          break;
      // case 'sampler2D':
      //     gl.activeTexture(uniform.activeTexture);
      //     gl.bindTexture(gl.TEXTURE_2D, uniform.value);
      //     gl.uniform1i(uniform.location, uniform.textureIndex);
      //     break;
      default:
          console.warn('Unknown uniform type', uniform.type);
    }
  }
}

export default Program;