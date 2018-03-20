import { glContext } from '../renderer/renderer.js';

class FrameBufferObject {
  constructor(w, h) {
    const gl = glContext();
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    // Color attachment
    this.colorBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorBuffer, 0);

    // DS attachment
    this.renderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);    
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderBuffer);
    
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
      console.error(this.checkFrameBufferStatus(status, gl));
      return;
    }
  }

  checkFrameBufferStatus(status, gl) {
    switch(status) {
      case gl.FRAMEBUFFER_COMPLETE:
        return 'Framebuffer complete!';
      case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        return 'Framebuffer incomplete attachment';
      case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        return 'Framebuffer incomplete missing attachment';
      case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        return 'Framebuffer incomplete dimensions!';
      case gl.FRAMEBUFFER_UNSUPPORTED:
        return 'Framebuffer unsupported!';
      case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
        return 'Framebuffer incomplete multisample!';
      case gl.RENDERBUFFER_SAMPLES:
        return 'Framebuffer samples!';
      default:
        return 'WTF FBO!';
    }
  }

  // transitionToShaderResource() {
  // }

  bind() {
    const gl = glContext();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
  }
}

export default FrameBufferObject;
