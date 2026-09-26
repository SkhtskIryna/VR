function ConicalSurface() {
    const { sin, cos, asin, PI, hypot, abs } = Math;
    
    // Параметри варіанта 14 (ст 197-198 з підручника)
    const l = 2.0;
    const R = 1.0;
    const b = 0.5;
    const omega = 0.0;
    
    const p = R / l; // 0.5
    const theta = asin(p); // 30 градусів
    
    // Межі зміни параметрів
    const uMin = 0.0;
    const uMax = 4.0 * PI; // Період 4*PI для повного замикання равлика
    const vMin = -0.8;
    const vMax = 0.8;
    
    const uSteps = 32; // Кількість секторів по колу (як на референсі)
    const vSteps = 6; // Кількість паралелей по висоті

    // Масштаб для візуалізації
    const scale = 0.65;
    
    function calculatePoint(u, v) {
        const w = p * u;
        
        const phi = v * cos(omega) - b * v * sin(omega);
        const psi = v * sin(omega) + b * v * cos(omega);
        
        const sinT = sin(theta);
        const cosT = cos(theta);
        const sinU = sin(u);
        const cosU = cos(u);
        const sinW = sin(w);
        const cosW = cos(w);
        
        const l_phi = l + phi;
        
        const x = l_phi * (sinT * cosU * cosW - sinU * sinW) - psi * (sinT * cosU * sinW + sinU * cosW);
        const y = l_phi * (sinT * sinU * cosW + cosU * sinW) - psi * (sinT * sinU * sinW - cosU * cosW);
        const z = l_phi * cosT * cosW - psi * cosT * sinW;
        
        return [x * scale, y * scale, z * scale];
    }
    
    // 1. Попередній розрахунок сітки вузлів
    const grid = [];
    for (let i = 0; i <= uSteps; i++) {
        const u = uMin + (i / uSteps) * (uMax - uMin);
        grid[i] = [];
        for (let j = 0; j <= vSteps; j++) {
            const v = vMin + (j / vSteps) * (vMax - vMin);
            grid[i][j] = calculatePoint(u, v);
        }
    }
    
    // БЛОК МАТЕМАТИЧНИХ ПЕРЕВІРОК
    console.group(
        "%c=== ПЕРЕВІРКА ===",
        "color: #00ff66; font-weight: bold;",
    );
    
    // Перевірка 1: Належність паралелей концентричним сферам
    // Для будь-якого фіксованого v відстань sqrt(x^2 + y^2 + z^2) має бути однаковою при всіх u.
    let isSpherical = true;
    const testResults = [];
    
    for (let j = 0; j <= vSteps; j++) {
        const v = vMin + (j / vSteps) * (vMax - vMin);
        const phi = v * cos(omega) - b * v * sin(omega);
        const psi = v * sin(omega) + b * v * cos(omega);
        const theoreticalR = hypot(l + phi, psi) * scale; // r = sqrt((l + phi)^2 + psi^2) * scale

        // Радіус першої точки кільця
        const [x0, y0, z0] = grid[0][j];
        const r0 = hypot(x0, y0, z0);
        
        // Перевірка всіх інших точок цього ж кільця вздовж u
        let maxDiff = 0;
        for (let i = 1; i <= uSteps; i++) {
            const [x, y, z] = grid[i][j];
            const r = hypot(x, y, z);
            const diff = abs(r - r0);
            if (diff > maxDiff) maxDiff = diff;
            if (diff > 1e-5) isSpherical = false;
        }
        
        testResults.push({
            "Індекс кільця": j,
            "Параметр v": v.toFixed(3),
            "Теоретичний R": theoreticalR.toFixed(5),
            "Фактичний R": r0.toFixed(5),
            "Макс. похибка сферичності": maxDiff.toExponential(2),
        });
    }
    
    console.table(testResults);
    
    if (isSpherical) {
        console.log(
            "%c[ТЕСТ 1 ПРОЙДЕНО] Лінії u строго лежать на концентричних сферах (Directrix Curve on a Sphere).",
            "color: #27ae60; font-weight: bold;",
        );
    } else {
        console.warn("[ТЕСТ 1 ПОМИЛКА] Паралелі не є сферичними кривими!");
    }
    
    // Перевірка 2: Замкненість поверхні при періоді u = 4*PI (p = 0.5)
    let isClosed = true;
    for (let j = 0; j <= vSteps; j++) {
        const startPoint = grid[0][j];
        const endPoint = grid[uSteps][j];
        const distanceBetweenEnds = hypot(
            startPoint[0] - endPoint[0],
            startPoint[1] - endPoint[1],
            startPoint[2] - endPoint[2]
        );
        if (distanceBetweenEnds > 1e-4) {
            isClosed = false;
            break;
        }
    }
    
    if (isClosed) {
        console.log(
            "%c[ТЕСТ 2 ПРОЙДЕНО] Поверхня плавно замкнена: точка u=0 збігається з u=4π.",
            "color: #27ae60; font-weight: bold;",
        );
    } else {
        console.warn("[ТЕСТ 2 ПОМИЛКА] Поверхня не замкнулася на періоді 4π!");
    }
    
    // Перевірка 3: Валідність масиву для WebGL (відсутність NaN)
    const lines = [];
    
    // Кільця (паралелі вздовж u) для LINE_STRIP
    for (let j = 0; j <= vSteps; j++) {
        for (let i = 0; i <= uSteps; i++) {
            lines.push(...grid[i][j]);
        }
    }
    
    // Твірні лінії (меридіани вздовж v) малюються змійкою
    for (let i = 0; i <= uSteps; i++) {
        if (i % 2 === 0) {
            for (let j = vSteps; j >= 0; j--) {
                lines.push(...grid[i][j]);
            }
        } else {
            for (let j = 0; j <= vSteps; j++) {
                lines.push(...grid[i][j]);
            }
        }
    }
    
    const hasNaN = lines.some((val) => isNaN(val) || val === undefined);
    if (!hasNaN) {
        console.log(
            `%c[ТЕСТ 3 ПРОЙДЕНО] Сформовано ${lines.length / 3} вершин. Дані повністю валідні (без NaN).`,
            "color: #27ae60;",
        );
    } else {
        console.error("[ТЕСТ 3 ПОМИЛКА] Масив вершин містить NaN або undefined!");
    }
    
    console.groupEnd();
    return lines;
}

CreateSurfaceData = ConicalSurface;