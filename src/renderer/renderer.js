import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this._initialize();
  }

  _initialize() {
    this.ratio = global.devicePixelRatio;
    context = canvas.getContext('webgl2', {antialias: false});

    this.perModel = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal
    ]);
    this.perScene = new UniformBufferObject([
        ...mat4.create(), // view
        ...mat4.create(), // projection
    ]);
    this.directional = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
  }

  _initializeBuffers(scene) {
    // Allocate buffers for scene
    scene.objects.forEach(mesh => {
      const geometry = mesh.geometry;
      const gl = glContext();

      // Position buffer
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);

      // Normal buffer
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);

      // Index buffer
      let indexBuffer;
      if (geometry.indices && geometry.indices.length) {
        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
      }

      // Texture buffer
      const textureBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.uvs), gl.STATIC_DRAW);

      // Should probably hold all buffers here..
      mesh.buffers = {
        positions: positionBuffer,
        indices: indexBuffer,
        normals: normalBuffer,
        uvs: textureBuffer
      }
    });
  }

  postInitialize(scene) {
    this._initializeBuffers(scene);
  }

  setRatio(ratio) {
    this.ratio = ratio;
  }

  _renderObject(object, scene, camera) {
    // For each light source upload position and other info here..
    const material = object.material;
    const program = material.program;

    material.activate();
    material.setUniform("numLights", scene.lights.length);

    const gl = glContext();

    const modelLocation = gl.getUniformBlockIndex(program, 'perModel');
    const sceneLocation = gl.getUniformBlockIndex(program, 'perScene');
    const directionalLocation = gl.getUniformBlockIndex(program, 'directional');

    gl.uniformBlockBinding(program, sceneLocation, this.perScene.location);
    gl.uniformBlockBinding(program, modelLocation, this.perModel.location);
    gl.uniformBlockBinding(program, directionalLocation, this.directional.location);

    // Calculate normal matrix
    const modelMatrix = object.modelMatrix;
    const normalMatrix = mat4.create();
    const modelViewMatrix = mat4.create();

    mat4.multiply(modelViewMatrix, camera.viewMatrix, modelMatrix);
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    this.perModel.update([
      ...modelMatrix,
      ...normalMatrix
    ]);
    material.setInternalUniforms();

    // UV's
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers.uvs);
      // Bind attributes
      gl.enableVertexAttribArray(
          object.material.programInfo.attribLocations.uv);
      gl.vertexAttribPointer(
          object.material.programInfo.attribLocations.uv,
          2,
          gl.FLOAT,
          false,
          0,
          0
      );
    }

    // Normals
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers.normals);
      // Bind attributes
      gl.enableVertexAttribArray(
          object.material.programInfo.attribLocations.normal);
      gl.vertexAttribPointer(
          object.material.programInfo.attribLocations.normal,
          3,
          gl.FLOAT,
          false,
          0,
          0
      );
    }

    // Positions
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers.positions);
      gl.enableVertexAttribArray(
          object.material.programInfo.attribLocations.position);
      gl.vertexAttribPointer(
          object.material.programInfo.attribLocations.position,
          3,
          gl.FLOAT,
          false,
          0,
          0
      );
    }

    if (object.buffers.indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.buffers.indices);
      gl.drawElements(gl.TRIANGLES, object.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers.positions);
      gl.drawArrays(gl.TRIANGLES, 0, object.geometry.positions.length / 3.0);
    }
  }

  _internalRender(scene, camera) {
    this.perScene.bind();
    this.directional.bind();
    this.perModel.bind();

    this.perScene.update([
      ...camera.viewMatrix,
      ...camera.projectionMatrix
    ]);

    // Lights
    for (let i = 0; i < scene.lights.length; i++) {

      const pos = scene.lights[i].position;

      const lightPosVec4 = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);

      const lModelMatrix = scene.lights[i].modelMatrix;
      const lModelView = mat4.create();
      mat4.multiply(lModelView, camera.viewMatrix, lModelMatrix);

      const out = vec4.create();

      vec4.transformMat4(out, lightPosVec4, camera.viewMatrix);
      this.directional.update([
        ...scene.lights[i].color,
        ...[scene.lights[i].intensity, 0.0, 0.0, 0.0],
        ...out,
      ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }

    // TODO:
    //1. Front to back for opaque
    //2. Batch together materials
    //3. Back to front for transparent
    scene.objects.forEach(object => {
      this._renderObject(object, scene, camera);
    });
  }

  render(scene, camera) {
    const gl = glContext();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (true) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0); // Clear all
    }

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear canvas

    camera.update();

    // Update
    scene.traverse(camera);
    this._internalRender(scene, camera);
  }
}

Renderer.LIGHT_DATA_CHUNK_SIZE = 12;
Renderer.MAX_LIGHTS = 16;

export const glContext = () => {
  return context;
}

export default Renderer;