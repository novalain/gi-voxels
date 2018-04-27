var OBJ = require('webgl-obj-loader');

import { generateVertexUVs, flatten, generateVertexNormals } from './common.js';

class ObjectLoader {
  constructor() { }
  load(objectList) {
    return new Promise(resolve => {
      OBJ.downloadMeshes(objectList, meshes => {
        let resObjectArray = [];
        Object.entries(meshes).forEach(([key, value]) => {
          const generateNormals = !value.vertexNormals || !value.vertexNormals.length || isNaN(value.vertexNormals[0]);
          if (generateNormals)
            console.log("Generating normals manually ...", value)
          const res = {
            positions: value.vertices,
            normals: generateNormals ? generateVertexNormals(value.vertices, value.indices) : value.vertexNormals,
            indices: value.indices,
            uvs: value.textures
          };
          resObjectArray.push(res);
        });
        resolve(resObjectArray);
      });
    });
  }

  loadModelsAndMaterials(objectList) {

    const scale = 200.0;
    return new Promise(resolve => {
      const p = OBJ.downloadModels(objectList);
      p.then(models => {
        let resObjectArray = [];
        Object.entries(models).forEach(([name, mesh]) => {
          const generateNormals = !mesh.vertexNormals || !mesh.vertexNormals.length || isNaN(mesh.vertexNormals[0]);
          const generateUVs = !mesh.textures || !mesh.textures.length || isNaN(mesh.textures[0]);
          if (generateNormals) {
            console.info("Generating normals manually ...", name);
          }
          if (generateUVs) {
            console.info("Generating UVs manually...", name);
          }

          for (let i = 0; i < mesh.vertices.length; ++i) {
            mesh.vertices[i] = scale * mesh.vertices[i];
          }

          const res = {
            name: name,
            objectData : {
              positions: mesh.vertices,
              normals: generateNormals ? generateVertexNormals(mesh.vertices, mesh.indices) : mesh.vertexNormals,
              tangents: mesh.tangents,
              bitangents: mesh.bitangents,
              uvs: generateUVs ? generateVertexUVs(mesh.vertices) : mesh.textures,
            },
            materialData : {
              vertexMaterialIndices: mesh.vertexMaterialIndices,
              materialIndices: mesh.materialIndices,
              materialNames: mesh.materialNames,
              materialsByIndex: mesh.materialsByIndex,
            },
            indices: mesh.indices
          };
          resObjectArray.push(res);
        });
        resolve(resObjectArray);
      })
    });
  }

}

export default ObjectLoader;