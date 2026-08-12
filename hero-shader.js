(() => {
  const canvas = document.querySelector("[data-hero-shader]");
  const hero = canvas?.closest(".hero");
  if (!canvas || !hero) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const useFallback = (state = "fallback") => {
    hero.classList.remove("shader-active");
    canvas.dataset.shaderState = state;
  };

  if (reducedMotion.matches || !precisePointer.matches) {
    useFallback();
    return;
  }

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    depth: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    useFallback("unavailable");
    return;
  }

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    uniform float u_time;
    uniform float u_signal;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    mat2 rotation(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec2 p = (v_uv - 0.5) * 2.0;
      float radius = length(p);
      float alpha = 1.0 - smoothstep(0.985, 1.005, radius);
      if (alpha <= 0.0) discard;

      float z = sqrt(max(0.0, 1.0 - dot(p, p)));
      vec3 normal = normalize(vec3(p.x, -p.y, z));
      vec3 viewDirection = vec3(0.0, 0.0, 1.0);

      vec3 reflected = reflect(-viewDirection, normal);
      reflected.xz = rotation(u_time * 0.018 + u_pointer.x * 0.085) * reflected.xz;
      reflected.yz = rotation(-0.09 + u_pointer.y * 0.055) * reflected.yz;

      vec3 shadowTone = mix(vec3(0.055, 0.062, 0.068), vec3(0.026, 0.031, 0.035), u_signal);
      vec3 middleTone = mix(vec3(0.53, 0.55, 0.56), vec3(0.29, 0.31, 0.32), u_signal);
      vec3 highlightTone = mix(vec3(0.96, 0.97, 0.97), vec3(0.72, 0.74, 0.74), u_signal);

      float elevation = smoothstep(-0.72, 0.78, reflected.y);
      vec3 color = mix(shadowTone, middleTone, elevation);
      color = mix(color, highlightTone, smoothstep(0.12, 0.96, reflected.y) * 0.74);

      float horizon = exp(-pow((reflected.y + 0.055) * 6.2, 2.0));
      color = mix(color, mix(vec3(0.25, 0.27, 0.28), vec3(0.12, 0.13, 0.135), u_signal), horizon * 0.58);

      float brightPanel = exp(-pow((reflected.x - 0.43) * 8.2, 2.0));
      float darkPanel = exp(-pow((reflected.x + 0.36) * 9.4, 2.0));
      color += brightPanel * vec3(0.20, 0.205, 0.21);
      color -= darkPanel * vec3(0.105, 0.11, 0.115);

      vec3 lightDirection = normalize(vec3(
        -0.48 + u_pointer.x * 0.16 + sin(u_time * 0.12) * 0.035,
        0.58 - u_pointer.y * 0.12,
        1.28
      ));
      float diffuse = max(dot(normal, lightDirection), 0.0);
      vec3 halfVector = normalize(lightDirection + viewDirection);
      float broadSpecular = pow(max(dot(normal, halfVector), 0.0), 16.0);
      float sharpSpecular = pow(max(dot(normal, halfVector), 0.0), 92.0);
      color += diffuse * vec3(0.07, 0.075, 0.08);
      color += broadSpecular * vec3(0.16, 0.17, 0.18);
      color += sharpSpecular * vec3(0.58, 0.59, 0.60);

      float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.1);
      color += fresnel * mix(vec3(0.27, 0.29, 0.31), vec3(0.18, 0.20, 0.21), u_signal);

      vec3 signalDirection = normalize(vec3(0.58, -0.46, 0.72));
      float signalReflection = pow(max(dot(normal, signalDirection), 0.0), 54.0);
      color += signalReflection * vec3(1.0, 0.255, 0.035) * mix(0.05, 0.18, u_signal);

      float brush = sin((gl_FragCoord.y + normal.x * 11.0) * 2.35) * 0.007;
      float microGrain = (hash(gl_FragCoord.xy) - 0.5) * 0.012;
      color += brush + microGrain;

      float rimLine = smoothstep(0.955, 0.984, radius) - smoothstep(0.984, 0.999, radius);
      color += rimLine * vec3(0.30, 0.315, 0.33);

      color = pow(max(color, 0.0), vec3(0.94));
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    useFallback("compile-failed");
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    useFallback("link-failed");
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const position = gl.getAttribLocation(program, "a_position");
  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    pointer: gl.getUniformLocation(program, "u_pointer"),
    time: gl.getUniformLocation(program, "u_time"),
    signal: gl.getUniformLocation(program, "u_signal"),
  };

  let animationFrame = 0;
  let inView = true;
  let pointerTarget = { x: 0, y: 0 };
  let pointerCurrent = { x: 0, y: 0 };
  let lastRenderedAt = 0;
  const minFrameInterval = 1000 / 30;
  const startedAt = performance.now();

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const density = Math.min(window.devicePixelRatio || 1, 1.6);
    const width = Math.max(1, Math.round(bounds.width * density));
    const height = Math.max(1, Math.round(bounds.height * density));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const render = (now) => {
    resize();
    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.045;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.045;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, pointerCurrent.x, pointerCurrent.y);
    gl.uniform1f(uniforms.time, (now - startedAt) / 1000);
    gl.uniform1f(uniforms.signal, document.body.dataset.mode === "signal" ? 1 : 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const tick = (now) => {
    if (!inView || document.hidden) {
      animationFrame = 0;
      return;
    }
    if (now - lastRenderedAt >= minFrameInterval) {
      render(now);
      lastRenderedAt = now;
    }
    animationFrame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!animationFrame && inView && !document.hidden) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const updatePointer = (event) => {
    const bounds = hero.getBoundingClientRect();
    pointerTarget = {
      x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2)),
    };
  };

  hero.addEventListener("pointermove", updatePointer, { passive: true });
  hero.addEventListener("pointerleave", () => { pointerTarget = { x: 0, y: 0 }; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    }, { rootMargin: "80px" });
    observer.observe(hero);
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
    useFallback("context-lost");
  });

  const deactivateForPreference = () => {
    if (reducedMotion.matches || !precisePointer.matches) {
      stop();
      useFallback();
    }
  };
  reducedMotion.addEventListener?.("change", deactivateForPreference);
  precisePointer.addEventListener?.("change", deactivateForPreference);

  resize();
  render(performance.now());
  canvas.dataset.shaderState = "ready";
  hero.classList.add("shader-active");
  start();
})();
