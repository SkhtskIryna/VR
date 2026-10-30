"use strict";

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lightProgram;               // Шейдерна програма для сфери світла
let lightSphere;                // Модель сфери для відображення джерела світла

// Текстури
let diffuseTexture;
let specularTexture;
let normalTexture;

// Глобальні параметри дискретизації для слайдерів
window.uGranularity = 32;
window.vGranularity = 6;

// Параметри масштабу та паузи анімації
let surfaceScale = 1.0;
let isLightAnimated = true;

// Параметри джерела світла
let lightAngle = 0.0;
let lightDistance = 4.0; 
const lightY = 0.0;

function deg2rad(angle) {
    return (angle * Math.PI) / 180;
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iAttribTexCoord = -1;
    this.iAttribTangent = -1;

    // Uniform matrices
    this.iModelViewMatrix = -1;
    this.iProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.iModelViewProjectionMatrix = -1;
    
    // Location of the light source position
    this.iLightPosition = -1;

    this.uDiffuseMap = -1;
    this.uSpecularMap = -1;
    this.uNormalMap = -1;
    this.iColor = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(gl.canvas.clientWidth * dpr);
    const displayHeight = Math.floor(gl.canvas.clientHeight * dpr);
    
    if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
        gl.canvas.width = displayWidth;
        gl.canvas.height = displayHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

// Завантаження текстури з підтримкою локального сервера
function loadTexture(gl, url, defaultColor = [180, 180, 180, 255]) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const pixel = new Uint8Array(defaultColor);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.crossOrigin = "anonymous";
    
    image.onload = function () {
        console.log("Успішно завантажено текстуру:", url);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        draw();
    };

    image.onerror = function () {
        console.error("ПОМИЛКА: Не вдалося завантажити файл за адресою:", url);
    };

    image.src = url;
    return texture;
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw(){
    resizeCanvas();
    gl.clearColor(0.12, 0.12, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 4, aspect, 0.1, 100);
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelViewTrackball = spaceball.getViewMatrix();
    
    let translateToPointZero = m4.translation(0, 0, -5.0);
    let modelView = m4.multiply(translateToPointZero, modelViewTrackball);
    
    // Координати світла у світовій системі (рух по колу з радіусом lightDistance)
    let lightWorldPos = [
        lightDistance * Math.cos(lightAngle),
        lightY,
        lightDistance * Math.sin(lightAngle)
    ];
    
    // Множення координат світла на ModelView для передачі в камеру
    let lightEyePos = m4.transformPoint(modelView, lightWorldPos);
    
    // Відображення конічної поверхні за Gouraud Shading
    shProgram.Use();
    
    // Застосовування масштабу фігури
    let surfaceModelView = m4.scale(modelView, surfaceScale, surfaceScale, surfaceScale);
    
    // Матриця нормалей 3x3 для поверхні
    let normalMatrix = [
        surfaceModelView[0],
        surfaceModelView[1],
        surfaceModelView[2],
        surfaceModelView[4],
        surfaceModelView[5],
        surfaceModelView[6],
        surfaceModelView[8],
        surfaceModelView[9],
        surfaceModelView[10],
    ];
    
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, surfaceModelView);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix);
    gl.uniform3fv(shProgram.iLightPosition, lightEyePos);
    
    // Біндинг трьох текстур
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(shProgram.uDiffuseMap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTexture);
    gl.uniform1i(shProgram.uSpecularMap, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(shProgram.uNormalMap, 2);
    
    surface.Draw(shProgram);
    
    
    // Відображення сфери-світила
    lightProgram.Use();
    
    let lightModelMat = m4.translation(
        lightWorldPos[0],
        lightWorldPos[1],
        lightWorldPos[2]
    );
    let lightMVP = m4.multiply(projection, m4.multiply(modelView, lightModelMat));
    
    gl.uniformMatrix4fv(lightProgram.iModelViewProjectionMatrix, false, lightMVP);
    gl.uniform4fv(lightProgram.iColor, [1.0, 0.95, 0.2, 1.0]);
    lightSphere.Draw(lightProgram);
}

// Функція для циклу анімації обертання світла
function animate() {
    if (isLightAnimated) {
        lightAngle += 0.02;
    }
    draw();
    window.requestAnimationFrame(animate);
}

// Оновлення буферів поверхні при зміні повзунків
function updateSurface() {
    let data = {};
    CreateSurfaceData(data);
    surface.BufferData(data.verticesF32, data.normalsF32, data.texCoordsF32, data.tangentsF32, data.indicesU16);
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    // Ініціалізація основної програми Gouraud Shading
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram("Basic", prog);
    shProgram.Use();
    
    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTexCoord = gl.getAttribLocation(prog, "texCoord");
    shProgram.iAttribTangent = gl.getAttribLocation(prog, "tangent");

    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");

    shProgram.uDiffuseMap = gl.getUniformLocation(prog, "diffuseMap");
    shProgram.uSpecularMap = gl.getUniformLocation(prog, "specularMap");
    shProgram.uNormalMap = gl.getUniformLocation(prog, "normalMap");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    
    // Ініціалізація програми для сфери світла
    let lProg = createProgram(gl, lightVertexShaderSource, lightFragmentShaderSource);
    lightProgram = new ShaderProgram("Light", lProg);
    lightProgram.iAttribVertex = gl.getAttribLocation(lProg, "vertex");
    lightProgram.iModelViewProjectionMatrix = gl.getUniformLocation(lProg, "ModelViewProjectionMatrix");
    lightProgram.iColor = gl.getUniformLocation(lProg, "color");
    
    // Створення поверхні за формулами варіанта
    surface = new Model("Surface");
    updateSurface();
    
    // Створення моделі сфери для світла
    let sphereData = {};
    CreateSphereData(sphereData, 0.15, 16, 16);
    lightSphere = new Model("LightSphere");
    lightSphere.BufferData(sphereData.verticesF32, null, null, null, sphereData.indicesU16);
    
    // Завантаження 3 текстур
    diffuseTexture = loadTexture(gl, "textures/diffuse.jpg", [160, 160, 160, 255]);
    specularTexture = loadTexture(gl, "textures/specular.jpg", [255, 255, 255, 255]);
    normalTexture = loadTexture(gl, "textures/normal.jpg", [128, 128, 255, 255]);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL(); // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML = "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }
    
    spaceball = new TrackballRotator(canvas, draw, 0);
    
    // Прив'язка повзунків
    let uSlider = document.getElementById("uStepsSlider");
    let vSlider = document.getElementById("vStepsSlider");
    let scaleSlider = document.getElementById("scaleSlider");
    let distSlider = document.getElementById("lightDistSlider");
    let toggleBtn = document.getElementById("toggleAnimBtn");
    
    if (uSlider) {
        uSlider.addEventListener("input", function (e) {
            window.uGranularity = parseInt(e.target.value);
            let lbl = document.getElementById("uVal");
            if (lbl) lbl.textContent = window.uGranularity;
            updateSurface();
        });
    }
    
    if (vSlider) {
        vSlider.addEventListener("input", function (e) {
            window.vGranularity = parseInt(e.target.value);
            let lbl = document.getElementById("vVal");
            if (lbl) lbl.textContent = window.vGranularity;
            updateSurface();
        });
    }
    
    if (scaleSlider) {
        scaleSlider.addEventListener("input", function (e) {
            surfaceScale = parseFloat(e.target.value);
            let lbl = document.getElementById("scaleVal");
            if (lbl) lbl.textContent = surfaceScale.toFixed(2);
            draw();
        });
    }
    
    if (distSlider) {
        distSlider.addEventListener("input", function (e) {
            lightDistance = parseFloat(e.target.value);
            let lbl = document.getElementById("distVal");
            if (lbl) lbl.textContent = lightDistance.toFixed(1);
            draw();
        });
    }
    
    window.addEventListener("resize", function () {
        resizeCanvas();
        draw();
    });
    
    if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
            isLightAnimated = !isLightAnimated;
            toggleBtn.textContent = isLightAnimated ? "Pause Light" : "Resume Light";
        });
    }
    animate();
}