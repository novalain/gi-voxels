import Scene from '../core/scene.js'
import { vec3, mat3, mat4, quat, vec4 } from 'gl-matrix';
import UniformBufferObject from '../utils/ubo.js';
import OrthographicCamera from '../cameras/orthographiccamera.js'
import StandardShader from '../materials/standardshader.js'
import VoxelizationShader from '../materials/voxelizationshader.js'
import VoxelDebugShader from '../materials/voxeldebugshader.js'
import WorldPositionShader from '../materials/worldpositionshader.js'
import FrameBufferObject from '../utils/framebufferobject.js'
import ScreenSpaceImageShader from '../materials/screenspaceimageshader.js'
import Quad from '../geometry/quad.js'
import Cube from '../geometry/cube.js'
import Mesh from '../core/mesh.js'

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this._initialize();
  }

  _initialize() {
    //this.ratio = global.devicePixelRatio;
    context = canvas.getContext('webgl2', {antialias: false});

    let gl = glContext();
    console.log("amx draw buffers", gl.getParameter(gl.MAX_DRAW_BUFFERS));

    this.voxelize = true;
    this.materialUBO = new UniformBufferObject(new Float32Array(Renderer.MATERIAL_DATA_CHUNK_SIZE));    
    // True for all programs, keep in mesh ??
    // With this declaration - does not work to put in float in here
    this.modelMatricesUBO = new UniformBufferObject([
        ...mat4.create(), // model
        ...mat4.create(), // normal 
    ]);
    this.guiUBO = new UniformBufferObject(new Float32Array(500));
    this.sceneUBO = new UniformBufferObject(new Float32Array(400));
   // this.pointLightUBO = new UniformBufferObject(new Float32Array(500));
    this.pointLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
    this.directionalLightUBO = new UniformBufferObject(new Float32Array(Renderer.MAX_LIGHTS * Renderer.LIGHT_DATA_CHUNK_SIZE));
  
    this.standardShader = new StandardShader();
    // var ext = gl.getExtension('WEBGL_draw_buffers');
    // if (!ext) {
    //   console.log("ASDASDASD WARNING");
    // }
    this.screenSpaceImageShader = new ScreenSpaceImageShader();
    this.voxelDebugShader = new VoxelDebugShader;
    this.voxelizationShader = new VoxelizationShader();
    this.worldPositionShader = new WorldPositionShader();
    this.initializeVoxelization();

    this.quad = new Quad();
    this.backFBO = new FrameBufferObject(gl.canvas.width, gl.canvas.height);

    this.sceneUBO.bind();
    this.pointLightUBO.bind();
    this.directionalLightUBO.bind();
    this.modelMatricesUBO.bind();
    this.materialUBO.bind();
    this.guiUBO.bind();
  }

  initializeVoxelization() {
    const gl = glContext();

    this.voxelTextureSize = 512;
    // Initialize 3d texture
    const cube = new Cube(3000, 3000, 3000);
    this.cubeMesh = new Mesh(cube.geometry, cube.indices);




    // this.mockData = new Uint8Array(64 * 64 * 64 * 4);
    // for (let i = 0; i < 64; ++i) {
    //   for (let j = 0; j < 64; ++j) {
    //     for (let k = 0; k < 64; k++) {
    //       this.mockData [4*(i + j * 64 + k * 64 * 64)] = 5;
    //       this.mockData [4*(i + j * 64 + k * 64 * 64) + 1] = 5;
    //       this.mockData [4*(i + j * 64 + k * 64 * 64) + 2] = 5;
    //       this.mockData [4*(i + j * 64 + k * 64 * 64) + 3] = 5;
    //     }
    //   }
    // }

    //gl.bindTexture(gl.TEXTURE_3D, null);
   //gl.generateMipmap(gl.TEXTURE_3D);

    // Initialize projection matrices
    // const orthoCamera = new OrthographicCamera(-1500, 1500, -1500, 1500, -1500, 4500);
    // orthoCamera.position = vec3.fromValues(0, 0, -3000);
    // const origin = vec4.fromValues(0.0, 0.0, 0.0);
    // orthoCamera.lookAt(origin);
    // this.projZ = mat4.create();
    // mat4.multiply(this.projZ, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  


   // const orthoCamera = new OrthographicCamera(-2000, 2000, -2000, 2000, 2000, -2000);
    //this.projZ = mat4.create();
   // mat4.multiply(this.projZ, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  
  }

  renderVoxelDebug(scene, camera) {

    const gl = glContext();
    this.worldPositionShader.activate();
    const program = this.worldPositionShader.program;
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);    

    // Settings.
  //  gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Back.
    gl.cullFace(gl.FRONT);
    //gl.bindFramebuffer(gl.FRAMEBUFFER, this.backFBO);
   
    // Draw world positions!!!
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    this.backFBO.bind();

    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
    // Render to FBO
   

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.cubeMesh.draw();
    // scene.objects.forEach(object => {
    //   this._renderObject(object, scene, camera, program, /*texture*/false);
    // });

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    //gl.disable(gl.DEPTH_TEST);
    this.voxelDebugShader.activate();

   // gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);    
    gl.uniform3fv(gl.getUniformLocation(this.voxelDebugShader.program, 'cameraPosition'), camera.position);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    gl.uniform1i(gl.getUniformLocation(this.voxelDebugShader.program, 'texture3D'), 0);
    this.backFBO.transitionToShaderResource(this.voxelDebugShader.program);
    this.quad.draw();
     // Render to FBO
    //  scene.objects.forEach(object => {
    //   this._renderObject(object, scene, camera, program, /*texture*/false, false);
    // });
    

    // Draw quad to screen
    this.screenSpaceImageShader.activate();
    this.backFBO.transitionToShaderResource(this.screenSpaceImageShader.program);
    // Hack, use scale instead
    gl.viewport(0, 0, 150, 150);
    this.quad.draw();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    //gl.enable(gl.DEPTH_TEST);
  }

  voxelizeScene(scene, camera) {
    const gl = glContext();
    gl.viewport(0, 0, this.voxelTextureSize, this.voxelTextureSize);
    //gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    // glDisable(GL_DEPTH_TEST);
    

    // Create 2D array texture slices
    this.dummyTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.dummyTexture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    // Create 3d texture
    this.voxelTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    // this.dummyTex = gl.createTexture();
    // gl.bindTexture(gl.TEXTURE_2D, this.dummyTex);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    this.voxelFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.voxelFb);

    // this.renderBuffer = gl.createRenderbuffer();
    // gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
    // gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 64, 64);    
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderBuffer);

    // if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
    //   console.error("FBO is not complete asdasd" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
    // }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    this.voxelizationShader.activate();
    const program = this.voxelizationShader.program;
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
    //gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewProjZ'), false, this.projZ);
    // [0,7], [8, 15], [16, 23], [24, 31], [32, 39], [40, 47], [48, 55], [56, 63]
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    const sceneScale = 3000;
    // for (let i = 0; i < this.voxelTextureSize; i++ ) {
    //   const orthoCamera = new OrthographicCamera(
    //     -sceneScale,
    //     sceneScale, 
    //     -sceneScale, 
    //     sceneScale,
    //     sceneScale - (i / this.voxelTextureSize) * sceneScale * 2, // near
    //     sceneScale - ((i + 1) / this.voxelTextureSize) * sceneScale * 2); // far

    //   orthoCamera.lookAt(vec3.fromValues(0.0, 0.0, -1.0));
    //   gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.voxelTexture, 0, i);
    //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //   this.projZ = mat4.create();
    //   mat4.multiply(this.projZ, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  
    //   gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewProjZ'), false, this.projZ);

    //   if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
    //     console.error("FBO is not complete" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
    //   }

    //   // Set uniforms
    //   gl.uniform1i(gl.getUniformLocation(program, 'xAxis'), 0);
    //   gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
    //   gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    
    //   // Render scene
    //   scene.objects.forEach(object => {
    //     this._renderObject(object, scene, camera, program, /*texture*/true);
    //   });

    //   gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    // }
   
     for (let i = 0; i < this.voxelTextureSize; i++ ) {
      const orthoCamera = new OrthographicCamera(
        -sceneScale,
        sceneScale, 
        -sceneScale, 
        sceneScale,
        sceneScale - (i / this.voxelTextureSize) * sceneScale * 2, // near
        sceneScale - ((i + 1) / this.voxelTextureSize) * sceneScale * 2); // far

        orthoCamera.up = vec3.fromValues(0.0, 0.0, -1.0);
        orthoCamera.lookAt(vec3.fromValues(0.0, 1.0, 0.0));
      
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.dummyTexture, 0, i);
   //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      this.projZ = mat4.create();
      mat4.multiply(this.projZ, orthoCamera.projectionMatrix, orthoCamera.viewMatrix);  
      gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewProjZ'), false, this.projZ);

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        console.error("FBO is not complete" + FrameBufferObject.checkFrameBufferStatus(gl.checkFramebufferStatus(gl.FRAMEBUFFER)));
      }

      // Set uniforms
      gl.uniform1i(gl.getUniformLocation(program, 'yAxis'), 1);
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    
      // Render scene
      scene.objects.forEach(object => {
        this._renderObject(object, scene, camera, program, /*texture*/true);
      });

      //gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.dummyTexture, 0, i);
     // gl.readPixels(0, 0, this.voxelTextureSize, this.voxelTextureSize, gl.RGBA, gl.UNSIGNED_BYTE, data, this.voxelTextureSize * i * 4);
      // Render objects unbinds...
     
    }

    let w = this.voxelTextureSize;
    let h = this.voxelTextureSize;
    let d = this.voxelTextureSize;
   
    let data = new Uint8Array(this.voxelTextureSize * this.voxelTextureSize * this.voxelTextureSize * 4);
    for (let i = 0; i < this.voxelTextureSize; i++ ) { 
    
      let slice = new Uint8Array(this.voxelTextureSize * this.voxelTextureSize * 4);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.dummyTexture, 0, i);
      gl.readPixels(0, 0, this.voxelTextureSize, this.voxelTextureSize, gl.RGBA,  gl.UNSIGNED_BYTE, slice, 0);


      // Loop through columns
    //  for (let j = 0; j < this.voxelTextureSize * this.voxelTextureSize * 4; j++) {
      //  data[this.voxelTextureSize * this.voxelTextureSize * i * 4 + j] = slice[ j];
      //}
      // Loop through rows


      for(let i = 0; i < d * 4; ++i) {
        for (let j = 0; j < h * 4; j++) {
          const value = 



        }
      }

      // for (let k = 0; k <  this.voxelTextureSize * 4; k++ )
      // for (let j = 0; i < this.voxelTextureSize * 4; j += this.voxelTextureSize) {
      //   data[]



      // }


      // for (let j = 0; j < this.voxelTextureSize * this.voxelTextureSize * 4; j++ ) {
      //   if (data[i] > 0) {
      //     console.log(data[i]);
      //   }
      // }
    }

  ///  gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    // Upload to 3d textuer

    // Generate mip
    gl.bindTexture(gl.TEXTURE_3D, this.voxelTexture);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, this.voxelTextureSize, this.voxelTextureSize, this.voxelTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    gl.generateMipmap(gl.TEXTURE_3D);
    
    gl.disable(gl.BLEND);
    // Clean state
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    //gl.enable(gl.CULL_FACE); 
    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear canvas  
  }

  _renderObject(object, scene, camera, program, uploadTextures = true, uploadShit = true) {
    this.modelMatricesUBO.update([
      ...object.modelMatrix,
      ...object.normalMatrix
    ]);
  
    const materialData = object.materialData;
    // Different between objects
    this.materialUBO.update([
      ...[...materialData.ambient, 0.0], // vec3 16  0 
      ...[...materialData.diffuse, 0.0], // vec3 16  16
      // ...[...materialData.emissive, 0.0], // vec3 16 32
      ...[...materialData.specular, 0.0], // vec3 16  48
      materialData.specularExponent, // 4, this.voxelTextureSize
      Boolean(materialData.mapDiffuse),  // 4, 72
      Boolean(materialData.mapBump), //4, 76
      Boolean(materialData.mapSpecular),
      Boolean(materialData.mapDissolve)
    ]); // Real chunk size here

    const gl = glContext();
    if (uploadShit) {
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'materialBuffer'), this.materialUBO.location);
      gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'modelMatrices'), this.modelMatricesUBO.location);
    }
    if (uploadTextures) {
      object.uploadTextures(program);
    }
    object.draw();
  }

  _uploadLightning(scene, camera) {
    // TODO: Proper padding, it's broken
    for (let i = 0; i < scene.pointLights.length; i++) {
      const l = scene.pointLights[i];
      this.pointLightUBO.update([
        ...[l.position[0], l.position[1], l.position[2], 0.0], // should be view space in the rest
         ...l.color,  // vec4 16
         l.intensity // vec4 16
       ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }

    for (let i = 0; i < scene.directionalLights.length; ++i) {
      const l = scene.directionalLights[i];
      this.directionalLightUBO.update([
        ...[l.directionViewSpace[0], l.directionViewSpace[1], l.directionViewSpace[2], 0.0], 
        ...l.color,  // vec4 16
        l.intensity // vec4 16
      ], i * Renderer.LIGHT_DATA_CHUNK_SIZE);
    }
    //const gl = glContext();
    //gl.uniform1i(gl.getUniformLocation(this.standardShader.program, 'numLights'), scene.pointLights.length);
    //gl.uniform1i(gl.getUniformLocation(this.standardShader.program, 'numDirectionalLights'), scene.directionalLights.length);
  }

  _debugLightning(scene, camera) {
    scene.pointLights.forEach(light => {
      if (light._debug) {
        // calculate MVP
        const out = mat4.create();
        mat4.multiply(out, camera.viewMatrix, light.modelMatrix);
        mat4.multiply(out, camera.projectionMatrix, out);
        light.draw(out);
      }
    })

    scene.directionalLights.forEach(light => {
      if (light._debug) {
        // calculate MVP
        const out = mat4.create();
        mat4.multiply(out, camera.viewMatrix, light.modelMatrix);
        mat4.multiply(out, camera.projectionMatrix, out);
        light.draw(out);
      }
    })
  }

  _internalRender(scene, camera) {
    this.guiUBO.update([
      scene.gui.diffuseLod,
      scene.gui.bumpIntensity,
      scene.gui.displayBump,
      scene.gui.displaySpecular
    ]);

    // TODO: Why doens't integers work? Float32Array??
    this.sceneUBO.update([
      ...camera.viewMatrix, // Starts at multiple of base
      ...camera.projectionMatrix,
      scene.pointLights.length, // 4 bytes .. 
      scene.directionalLights.length
    ]);

    this._uploadLightning(scene, camera);

    if (this.voxelize) {
      this.voxelizeScene(scene, camera);
      this.voxelize = false;
    }

    if (scene.gui.showVoxels) {
      // Render debug scene
      this.renderVoxelDebug(scene, camera);
      return;
    }
   
    // TODO:
    //1. Front to back for opaque
    //2. Batch together materials
    //3. Back to front for transparent
    // All objects rendered with the same shader
    this.standardShader.activate();
    const program = this.standardShader.program;
    const gl = glContext();
    // Set the uniform block binding for the active program
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'guiDataBuffer'), this.guiUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'sceneBuffer'), this.sceneUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'pointLightsBuffer'), this.pointLightUBO.location);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'directionalLightsBuffer'), this.directionalLightUBO.location);
    
    // Render scene normal
    scene.objects.forEach(object => {
      this._renderObject(object, scene, camera, program);
    });
  }

  setSize(width, height) {
    const w = width * window.devicePixelRatio;
    const h = height * window.devicePixelRatio;

    const gl = glContext();
    gl.canvas.width = w;
    gl.canvas.height = h;
    gl.canvas.style.width = `${w / window.devicePixelRatio}px`;
    gl.canvas.style.height = `${h / window.devicePixelRatio}px`;
  }

  render(scene, camera) {
    const gl = glContext();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(127.0, 127.0, 213.0, 1.0);
    gl.clearDepth(1.0);  // TODO remove

    gl.cullFace(gl.BACK);
   // gl.enable(gl.CULL_FACE);
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear canvas
    
    this._internalRender(scene, camera);
  }
}

Renderer.LIGHT_DATA_CHUNK_SIZE = 12; // EACH element is 4 bytes in float32array yielding an offset of 12 * 4 = 48 !!!
Renderer.MATERIAL_DATA_CHUNK_SIZE = 50;
Renderer.MAX_LIGHTS = 16;
Renderer.MAX_MATERIALS = 25;

export const glContext = () => {
  return context;
}

export default Renderer;