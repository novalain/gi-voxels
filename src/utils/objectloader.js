import OBJ from 'webgl-obj-loader';
import { flatten, generateVertexNormals } from './common.js';

class ObjectLoader {
  constructor() { }
  load(objectList) {
    return new Promise(resolve => {
      OBJ.downloadMeshes(objectList, meshes => {
        let resObjectArray = [];
        Object.entries(meshes).forEach(([key, value]) => {
          const generateNormals = !value.vertexNormals || !value.vertexNormals.length || isNaN(value.vertexNormals[0]);
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
}

export default ObjectLoader;