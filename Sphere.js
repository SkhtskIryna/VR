"use strict";

// Генерація геометричних даних сфери (вершини та індекси трикутників)
function CreateSphereData(data, radius = 0.05, rings = 16, sectors = 16) {
    let vertices = [];
    let indices = [];
    
    for (let r = 0; r <= rings; r++) {
        let phi = (r * Math.PI) / rings;
        for (let s = 0; s <= sectors; s++) {
            let theta = (s * 2 * Math.PI) / sectors;
            let x = radius * Math.sin(phi) * Math.cos(theta);
            let y = radius * Math.cos(phi);
            let z = radius * Math.sin(phi) * Math.sin(theta);
            vertices.push(x, y, z);
        }
    }
    
    for (let r = 0; r < rings; r++) {
        for (let s = 0; s < sectors; s++) {
            let first = r * (sectors + 1) + s;
            let second = first + sectors + 1;
            
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    
    data.verticesF32 = new Float32Array(vertices);
    data.indicesU16 = new Uint16Array(indices);
}