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

  // parse(raw) {
  //   // Credits
    

  //   // Contains all material info and vertex buffer
  //   this.materialsNew = [];

  //   this.name = '';
  //   var verts = [];
  //   var vertNormals = [];
  //   var textures = [];
  //   var unpacked = {};
  //   var materialNamesByIndex = [];
  //   var materialIndicesByName = {};
  //   // keep track of what material we've seen last
  //   var currentMaterialIndex = -1;
  //   // unpacking stuff
  //   unpacked.verts = [];
  //   unpacked.norms = [];
  //   unpacked.textures = [];
  //   unpacked.hashindices = {};
  //   unpacked.indices = [];
  //   unpacked.materialIndices = [];
  //   unpacked.index = 0;

  //   var VERTEX_RE = /^v\s/;
  //   var NORMAL_RE = /^vn\s/;
  //   var TEXTURE_RE = /^vt\s/;
  //   var FACE_RE = /^f\s/;
  //   var WHITESPACE_RE = /\s+/;
  //   var USE_MATERIAL_RE = /^usemtl/;

  //   // array of lines separated by the newline
  //   var lines = objectData.split('\n');

  //   for (var i = 0; i < lines.length; i++) {
  //     var line = lines[i].trim();
  //     if (!line || line.startsWith('#')) {
  //       continue;
  //     }
  //     var elements = line.split(WHITESPACE_RE);
  //     elements.shift();

  //     if (VERTEX_RE.test(line)) {
  //       // if this is a vertex
  //       verts.push.apply(verts, _toConsumableArray(elements));
  //     } else if (NORMAL_RE.test(line)) {
  //       // if this is a vertex normal
  //       vertNormals.push.apply(vertNormals, _toConsumableArray(elements));
  //     } else if (TEXTURE_RE.test(line)) {
  //       // if this is a texture
  //       textures.push.apply(textures, _toConsumableArray(elements));
  //     } else if (USE_MATERIAL_RE.test(line)) {
  //       var materialName = elements[0];
  //       // check to see if we've ever seen it before
  //       if (!(materialName in materialIndicesByName)) {
  //         // new material we've never seen
  //         materialNamesByIndex.push(materialName);
  //         materialIndicesByName[materialName] = materialNamesByIndex.length - 1;
  //       }
  //       // keep track of the current material index
  //       currentMaterialIndex = materialIndicesByName[materialName];
  //     } else if (FACE_RE.test(line)) {
  //       // if this is a face
  //       /*
  //       split this face into an array of Vertex groups
  //       for example:
  //          f 16/92/11 14/101/22 1/69/1
  //       becomes:
  //         ['16/92/11', '14/101/22', '1/69/1'];
  //       */

  //       var quad = false;
  //       for (var j = 0, eleLen = elements.length; j < eleLen; j++) {
  //         // Triangulating quads
  //         // quad: 'f v0/t0/vn0 v1/t1/vn1 v2/t2/vn2 v3/t3/vn3/'
  //         // corresponding triangles:
  //         //      'f v0/t0/vn0 v1/t1/vn1 v2/t2/vn2'
  //         //      'f v2/t2/vn2 v3/t3/vn3 v0/t0/vn0'
  //         if (j === 3 && !quad) {
  //           // add v2/t2/vn2 in again before continuing to 3
  //           j = 2;
  //           quad = true;
  //         }
  //         var hash0 = elements[0];
  //         var hash = elements[j];

  //         // If ALL attrs are the same
  //         if (hash in unpacked.hashindices) {
  //           unpacked.indices.push(unpacked.hashindices[hash]);
  //         } else {

  //           /*
  //               Each element of the face line array is a Vertex which has its
  //               attributes delimited by a forward slash. This will separate
  //               each attribute into another array:
  //                   '19/92/11'
  //               becomes:
  //                   Vertex = ['19', '92', '11'];
  //               where
  //                   Vertex[0] is the vertex index
  //                   Vertex[1] is the texture index
  //                   Vertex[2] is the normal index
  //                Think of faces having Vertices which are comprised of the
  //                attributes location (v), texture (vt), and normal (vn).
  //                */
  //           var vertex = elements[j].split('/');
  //           // it's possible for faces to only specify the vertex
  //           // and the normal. In this case, vertex will only have
  //           // a length of 2 and not 3 and the normal will be the
  //           // second item in the list with an index of 1.
  //           var normalIndex = vertex.length - 1;
  //           /*
  //                                                 The verts, textures, and vertNormals arrays each contain a
  //                                                 flattend array of coordinates.
  //                                                  Because it gets confusing by referring to Vertex and then
  //                                                 vertex (both are different in my descriptions) I will explain
  //                                                 what's going on using the vertexNormals array:
  //                                                  vertex[2] will contain the one-based index of the vertexNormals
  //                                                 section (vn). One is subtracted from this index number to play
  //                                                 nice with javascript's zero-based array indexing.
  //                                                  Because vertexNormal is a flattened array of x, y, z values,
  //                                                 simple pointer arithmetic is used to skip to the start of the
  //                                                 vertexNormal, then the offset is added to get the correct
  //                                                 component: +0 is x, +1 is y, +2 is z.
  //                                                  This same process is repeated for verts and textures.
  //                                                 */




  //           // Vertex position
  //           unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
  //           unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
  //           unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);
  //           // Vertex textures
  //           if (textures.length) {
  //             unpacked.textures.push(+textures[(vertex[1] - 1) * 2 + 0]);
  //             unpacked.textures.push(+textures[(vertex[1] - 1) * 2 + 1]);
  //           }
  //           // Vertex normals
  //           unpacked.norms.push(+vertNormals[(vertex[normalIndex] - 1) * 3 + 0]);
  //           unpacked.norms.push(+vertNormals[(vertex[normalIndex] - 1) * 3 + 1]);
  //           unpacked.norms.push(+vertNormals[(vertex[normalIndex] - 1) * 3 + 2]);
  //           // Vertex material indices
  //           unpacked.materialIndices.push(currentMaterialIndex);
  //           // add the newly created Vertex to the list of indices
  //           unpacked.hashindices[hash] = unpacked.index;
  //           unpacked.indices.push(unpacked.index);
  //           // increment the counter

  //           unpacked.index += 1;
  //         }
  //         if (j === 3 && quad) {
  //           // add v0/t0/vn0 onto the second triangle
  //           unpacked.indices.push(unpacked.hashindices[hash0]);
  //         }
  //       }
  //     }
  //   }

  //   const res = {
  //     name: name,
  //     objectData : {
  //       positions: unpacked.verts,
  //       normals: unpacked.norms,
  //       indices: unpacked.indices,
  //       uvs: unpacked.textures
  //     },
  //     materialData : {
  //       vertexMaterialIndices: mesh.vertexMaterialIndices,
  //       materialIndices: mesh.materialIndices,
  //       materialNames: mesh.materialNames,
  //       materialsByIndex: mesh.materialsByIndex,
  //     }
  //   };
  // }

  loadModelsAndMaterials(objectList) {
    return new Promise(resolve => {
      const p = OBJ.downloadModels(objectList);
      p.then(models => {
        let resObjectArray = [];
        // WARNING UGLY HACK AF!!!! Give images enough time to load - TODO - Loop through all textures in all object and resolve those promises
        setTimeout( () => {
          Object.entries(models).forEach(([name, mesh]) => {
            const generateNormals = !mesh.vertexNormals || !mesh.vertexNormals.length || isNaN(mesh.vertexNormals[0]);
            const generateUVs = !mesh.textures || !mesh.textures.length || isNaN(mesh.textures[0]);
            if (generateNormals)
              console.info("Generating normals manually ...", name);
            if (generateUVs) 
              console.info("Generating UVs manually...", name);
            const res = {
              name: name,
              objectData : {
                positions: mesh.vertices,
                normals: generateNormals ? generateVertexNormals(mesh.vertices, mesh.indices) : mesh.vertexNormals,
                tangents: mesh.tangents,
                bitangents: mesh.bitangents,
                indices: mesh.indices,
                uvs: generateUVs ? generateVertexUVs(mesh.vertices) : mesh.textures,
              },
              materialData : {
                vertexMaterialIndices: mesh.vertexMaterialIndices,
                materialIndices: mesh.materialIndices,
                materialNames: mesh.materialNames,
                materialsByIndex: mesh.materialsByIndex,
              }
            };
            resObjectArray.push(res);
          });
          resolve(resObjectArray);
        }, 2500);
      })
    });
  }

}

export default ObjectLoader;