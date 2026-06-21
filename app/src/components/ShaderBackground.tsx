"use client";

import { useEffect, useRef } from "react";

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(syncSize).observe(canvas);
    }
    syncSize();

    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    vec2 p = uv - 0.5;
    p.x *= u_resolution.x / u_resolution.y;
    
    float d = length(p);
    
    float v1 = sin(p.x * 2.0 + u_time * 0.5);
    float v2 = sin(p.y * 3.0 - u_time * 0.3);
    float v3 = sin(d * 10.0 - u_time * 1.0);
    
    float noise = v1 * v2 * v3;
    
    vec3 forest  = vec3(0.02, 0.17, 0.14);
    vec3 emerald = vec3(0.17, 0.35, 0.15);
    vec3 cream   = vec3(0.98, 0.98, 0.95);
    
    vec3 color = mix(forest, emerald, 0.5 + 0.5 * sin(u_time * 0.2 + d * 4.0));
    color = mix(color, cream, smoothstep(0.4, 1.2, noise + d));
    color *= 1.0 - smoothstep(0.4, 0.8, d);
    
    gl_FragColor = vec4(color, 1.0);
}`;

    function createShader(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes = gl.getUniformLocation(prog, "u_resolution");

    let animId: number;
    function render(t: number) {
      if (typeof ResizeObserver === "undefined") syncSize();
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      if (uTime) gl!.uniform1f(uTime, t * 0.001);
      if (uRes) gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="shader-layer">
      <canvas ref={canvasRef} className="shader-canvas" />
    </div>
  );
}
