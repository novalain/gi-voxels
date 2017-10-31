import ObjMtlLoader from 'obj-mtl-loader';
import { flatten } from './common.js';

class ObjectLoader {
  constructor() {
    this.loader = new ObjMtlLoader();
  }
  // TODO: Load list of obj's + mtl's
  load(obj, mtl) {
    return new Promise(resolve => {
      this.loader.load(obj, mtl, (err, res) => {
        if (err) {
          console.warn("Error loading obj or mtl");
          reject(err);
        }

        console.log("RES",res)
        // res.vertices.map(vertex => {
        //   return vertex.splice(-1,1);
        // });

        //const indices = [];
        const vertices = [];
        const normals = [];
        const resVertices = res.vertices;
        const resNormals = res.normals;

        res.faces.forEach(face => {
          const v0 = resVertices[face.indices[0] - 1];
          const v1 = resVertices[face.indices[1] - 1];
          const v2 = resVertices[face.indices[2] - 1];

          vertices.push(v0[0]);
          vertices.push(v0[1]);
          vertices.push(v0[2]);

          vertices.push(v1[0]);
          vertices.push(v1[1]);
          vertices.push(v1[2]);

          vertices.push(v2[0]);
          vertices.push(v2[1]);
          vertices.push(v2[2]);

          const n0 = resNormals[face.normal[0] - 1];
          const n1 = resNormals[face.normal[1] - 1];
          const n2 = resNormals[face.normal[2] - 1];

          normals.push(n0[0]);
          normals.push(n0[1]);
          normals.push(n0[2]);

          normals.push(n1[2]);
          normals.push(n1[2]);
          normals.push(n1[2]);

          normals.push(n2[2]);
          normals.push(n2[2]);
          normals.push(n2[2]);
          //vertices.push(resVertices[face.indices[1]]);
          //vertices.push(resVertices[face.indices[2]]);
        });

        //const numIndices = indices.map(Number);

        const resobject = {};
        resobject.positions = vertices;
        resobject.normals = normals;
        //resobject.indices = numIndices;
        // res.normals.map(normal => {
        //   console.log(normal)
        //   return normal;
        // })
        resolve(resobject);
      });
    });
  }
}

export default ObjectLoader;