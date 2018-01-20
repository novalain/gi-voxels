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

    // This is not true for all programs ...
    // On the other hand might only have one program in the end that I
    // just pass materialdata to (when setting a custom material such as phong). 
    this.material = new UniformBufferObject(new Float32Array(Renderer.MAX_MATERIALS * Renderer.MATERIAL_DATA_CHUNK_SIZE));    
    
    // True for all programs
    this.modelMatrices = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal 
    ]);
    // True for all programs
    this.sceneMatrices = new UniformBufferObject([
        ...mat4.create(), // view
        ...mat4.create(), // projection
    ]);

    // True for all programs
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

      // UV's buffer
  
      let textureBuffer;
      if (geometry.uvs) {
        textureBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.uvs), gl.STATIC_DRAW);
      }

      // Material buffer
      let materialBuffer;
      if (geometry.vertexMaterialIndices) {
        materialBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, materialBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(geometry.vertexMaterialIndices), gl.STATIC_DRAW);
      }

      // Update materials
      const materialData = mesh.material.materialData;
      for (let i = 0; i < materialData.length; ++i) {
        const m = materialData[i];
        debugger;
        this.material.update([
          //...object._materials[i]
          ...[...m.ambient, 0.0], // vec3 16  0 REAL 12
          ...[...m.diffuse, 0.0], // vec3 16  16
          ...[...m.emissive, 0.0], // vec3 16  32
          ...[...m.specular, 0.0], // vec3 16  48
          m.specularExponent
        ], i * Renderer.MATERIAL_DATA_CHUNK_SIZE ); // Real chunk size here
      }

      mesh.buffers = {
        positions: positionBuffer,
        indices: indexBuffer,
        normals: normalBuffer,
        uvs: textureBuffer,
        materialIds: materialBuffer
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

    // TODO Bind all textures
    let itx;

    let samplerLocations = new Int32Array(material.materialData.length);
    for (itx = 0; itx < material.materialData.length; ++itx) {
      const location = gl.getUniformLocation(program, 'textureMap[' + itx + ']');
      gl.activeTexture(gl.TEXTURE0 + itx);
      material._textures[itx].bind();
      gl.uniform1i(location, itx);
    }

    //console.log("Num textures bound", itx);

   
    const materialLocation = gl.getUniformBlockIndex(program, 'materialBuffer');
    const modelLocation = gl.getUniformBlockIndex(program, 'modelMatrices');
    const sceneLocation = gl.getUniformBlockIndex(program, 'sceneMatrices');
    const directionalLocation = gl.getUniformBlockIndex(program, 'directionalBuffer');

    gl.uniformBlockBinding(program, materialLocation, this.material.location);
    gl.uniformBlockBinding(program, sceneLocation, this.sceneMatrices.location);
    gl.uniformBlockBinding(program, modelLocation, this.modelMatrices.location);
    gl.uniformBlockBinding(program, directionalLocation, this.directional.location);

    // Calculate normal matrix
    const modelMatrix = object.modelMatrix;
    const normalMatrix = mat4.create();
    const modelViewMatrix = mat4.create();

    mat4.multiply(modelViewMatrix, camera.viewMatrix, modelMatrix);
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    // Bind Uniform buffer object
    this.modelMatrices.update([
      ...modelMatrix,
      ...normalMatrix
    ]);

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

    // Materials
    if (object.buffers.materialIds) {
      {
      
        gl.bindBuffer(gl.ARRAY_BUFFER, object.buffers.materialIds);
        gl.enableVertexAttribArray(
          object.material.programInfo.attribLocations.materialId);
        gl.vertexAttribIPointer(
          object.material.programInfo.attribLocations.materialId,
          1,
          gl.UNSIGNED_SHORT,
          false,
          0,
          0
        );
      }
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
    this.sceneMatrices.bind();
    this.directional.bind();
    this.modelMatrices.bind();
    this.material.bind();

    this.sceneMatrices.update([
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
        ...scene.lights[i].color,  // vec4 16
        ...[scene.lights[i].intensity, 0.0, 0.0, 0.0], // vec4 16
        ...out, // vec4 16 // EQ : CHUNK SIZE SHOULD BE.... CS = TOTALSIZE / ( SIZEOF(FLOAT) ( == 4 ))
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

Renderer.LIGHT_DATA_CHUNK_SIZE = 12; // EACH element is 4 bytes in float32array yielding an offset of 12 * 4 = 48 !!!
Renderer.MATERIAL_DATA_CHUNK_SIZE = 20;
Renderer.MAX_LIGHTS = 16;
Renderer.MAX_MATERIALS = 16;

export const glContext = () => {
  return context;
}

export default Renderer;