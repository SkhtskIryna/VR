"use strict";

function deg2rad(angle) {
    return (angle * Math.PI) / 180;
}

// Конструктор вершини
function Vertex(p, uv) {
    this.p = p;
    this.uv = uv;
    this.normal = [0, 0, 0];
    this.tangent = [0, 0, 0];
    this.triangles = []; // індекси суміжних трикутників
}

// Конструктор трикутника
function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [0, 0, 0]; // нормаль грані
    this.tangent = [0, 0, 0];
}

// Конструктор моделі з буферами вершин, нормалей та індексів
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;
    
    this.BufferData = function (vertices, normals, texCoords, tangents,indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        if (normals) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        }
        
        if (texCoords) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        }
        
        if (tangents) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);
        }
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        this.count = indices.length;
    };
    
    this.Draw = function (targetProgram) {
        let prog = targetProgram || shProgram;
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(prog.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(prog.iAttribVertex);
        
        // Якщо малюється поверхня (де є нормалі)
        if (prog.iAttribNormal !== undefined && prog.iAttribNormal !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
            gl.vertexAttribPointer(prog.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(prog.iAttribNormal);
        } else {
            // Для сфери світла нормалі вимикаємо
            if (shProgram && shProgram.iAttribNormal !== -1) {
                gl.disableVertexAttribArray(shProgram.iAttribNormal);
            }
        }

        // Текстурні координати UV
        if (prog.iAttribTexCoord !== undefined && prog.iAttribTexCoord !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
            gl.vertexAttribPointer(prog.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(prog.iAttribTexCoord);
        } else if (shProgram && shProgram.iAttribTexCoord !== -1) {
            gl.disableVertexAttribArray(shProgram.iAttribTexCoord);
        }
        
        // Тангенси
        if (prog.iAttribTangent !== undefined && prog.iAttribTangent !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
            gl.vertexAttribPointer(prog.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(prog.iAttribTangent);
        } else if (shProgram && shProgram.iAttribTangent !== -1) {
            gl.disableVertexAttribArray(shProgram.iAttribTangent);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
}

// Обчислення кута між двома векторами при спільній вершині
function computeAngle(v1, v2) {
    const n1 = m4.normalize(v1);
    const n2 = m4.normalize(v2);
    const dotVal = Math.max(-1.0, Math.min(1.0, m4.dot(n1, n2)));
    return Math.acos(dotVal);
}

// Генерація даних конічної поверхні через об'єкт data
function CreateSurfaceData(data) {
    // Виклик функції з ConicalSurface.js для отримання поточної сітки точок
    ConicalSurface();
    
    const grid = ConicalSurface.grid;
    const uSteps = ConicalSurface.uSteps;
    const vSteps = ConicalSurface.vSteps;
    
    let vertices = [];
    let triangles = [];
    
    // 1. Створення масиву об'єктів Vertex
    for (let i = 0; i <= uSteps; i++) {
        let uTex = (i / uSteps) * 4.0; // 4 повторення текстури
        for (let j = 0; j <= vSteps; j++) {
            let vTex = j / vSteps;
            vertices.push(new Vertex(grid[i][j], [uTex, vTex]));
        }
    }
    
    // 2. Створення трикутників та зв'язування їх із вершинами
    const stride = vSteps + 1;
    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let v0 = i * stride + j;
            let v1 = (i + 1) * stride + j;
            let v2 = (i + 1) * stride + (j + 1);
            let v3 = i * stride + (j + 1);
            
            // Перший трикутник
            let trian1 = new Triangle(v0, v1, v2);
            let trianInd1 = triangles.length;
            triangles.push(trian1);
            vertices[v0].triangles.push(trianInd1);
            vertices[v1].triangles.push(trianInd1);
            vertices[v2].triangles.push(trianInd1);
            
            // Другий трикутник
            let trian2 = new Triangle(v0, v2, v3);
            let trianInd2 = triangles.length;
            triangles.push(trian2);
            vertices[v0].triangles.push(trianInd2);
            vertices[v2].triangles.push(trianInd2);
            vertices[v3].triangles.push(trianInd2);
        }
    }
    
    // 3. Обчислення плоских нормалей для кожного трикутника
    for (let i = 0; i < triangles.length; i++) {
        let tri = triangles[i];
        let p0 = vertices[tri.v0].p;
        let p1 = vertices[tri.v1].p;
        let p2 = vertices[tri.v2].p;

        let uv0 = vertices[tri.v0].uv;
        let uv1 = vertices[tri.v1].uv;
        let uv2 = vertices[tri.v2].uv;
        
        let e01 = m4.subtractVectors(p1, p0);
        let e02 = m4.subtractVectors(p2, p0);
        tri.normal = m4.normalize(m4.cross(e01, e02));

        let du1 = uv1[0] - uv0[0];
        let dv1 = uv1[1] - uv0[1];
        let du2 = uv2[0] - uv0[0];
        let dv2 = uv2[1] - uv0[1];

        let det = du1 * dv2 - du2 * dv1;
        if (Math.abs(det) > 1e-8) {
            let f = 1.0 / det;
            let tx = f * (dv2 * e01[0] - dv1 * e02[0]);
            let ty = f * (dv2 * e01[1] - dv1 * e02[1]);
            let tz = f * (dv2 * e01[2] - dv1 * e02[2]);
            tri.tangent = m4.normalize([tx, ty, tz]);
        } else {
            tri.tangent = [1, 0, 0];
        }
    }
    
    // 4. Facet Angle Weighted Average Normals для кожної вершини
    for (let i = 0; i < vertices.length; i++) {
        let vert = vertices[i];
        let weightedNormal = [0, 0, 0];
        let weightedTangent = [0, 0, 0];
        
        for (let t = 0; t < vert.triangles.length; t++) {
            let tri = triangles[vert.triangles[t]];
            
            // Визначення двох інших вершин трикутника відносно поточної
            let otherA, otherB;
            if (tri.v0 === i) {
                otherA = vertices[tri.v1].p;
                otherB = vertices[tri.v2].p;
            } else if (tri.v1 === i) {
                otherA = vertices[tri.v0].p;
                otherB = vertices[tri.v2].p;
            } else {
                otherA = vertices[tri.v0].p;
                otherB = vertices[tri.v1].p;
            }
            
            let vecA = m4.subtractVectors(otherA, vert.p);
            let vecB = m4.subtractVectors(otherB, vert.p);
            let angle = computeAngle(vecA, vecB);
            
            // Додавання грані нормалі, зважену за її внутрішнім кутом
            let weightedFaceNorm = m4.scaleVector(tri.normal, angle);
            weightedNormal = m4.addVectors(weightedNormal, weightedFaceNorm);
            weightedTangent = m4.addVectors(weightedTangent, m4.scaleVector(tri.tangent, angle));
        }
        vert.normal = m4.normalize(weightedNormal);
        vert.tangent = m4.normalize(weightedTangent);
    }
    
    // 5. Заповнення типізованих масивів для передачі в буфери WebGL
    data.verticesF32 = new Float32Array(vertices.length * 3);
    data.normalsF32 = new Float32Array(vertices.length * 3);
    data.texCoordsF32 = new Float32Array(vertices.length * 2);
    data.tangentsF32 = new Float32Array(vertices.length * 3);
    
    for (let i = 0, len = vertices.length; i < len; i++) {
        data.verticesF32[i * 3 + 0] = vertices[i].p[0];
        data.verticesF32[i * 3 + 1] = vertices[i].p[1];
        data.verticesF32[i * 3 + 2] = vertices[i].p[2];
        
        data.normalsF32[i * 3 + 0] = vertices[i].normal[0];
        data.normalsF32[i * 3 + 1] = vertices[i].normal[1];
        data.normalsF32[i * 3 + 2] = vertices[i].normal[2];
        
        data.texCoordsF32[i * 2 + 0] = vertices[i].uv[0];
        data.texCoordsF32[i * 2 + 1] = vertices[i].uv[1];
        
        data.tangentsF32[i * 3 + 0] = vertices[i].tangent[0];
        data.tangentsF32[i * 3 + 1] = vertices[i].tangent[1];
        data.tangentsF32[i * 3 + 2] = vertices[i].tangent[2];
    }
    
    data.indicesU16 = new Uint16Array(triangles.length * 3);
    for (let i = 0, len = triangles.length; i < len; i++) {
        data.indicesU16[i * 3 + 0] = triangles[i].v0;
        data.indicesU16[i * 3 + 1] = triangles[i].v1;
        data.indicesU16[i * 3 + 2] = triangles[i].v2;
    }
}
