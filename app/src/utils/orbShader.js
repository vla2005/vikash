// Esfera analítica em uma passagem. A malha é desenhada por pixel na GPU,
// sem arrays de vértices, strings SVG ou render React em cada quadro.
// Frequências inteiras mantêm o loop periódico de 0 a 2π.
export const orbShaderSource = `
uniform float size;
uniform float phase;
uniform float radius;
uniform float deformation;
uniform float3 wire;
uniform float3 highlight;
uniform float3 shadow;
uniform float3 glow;
uniform float frontOpacity;
uniform float backOpacity;
uniform float haloOpacity;

const float PI = 3.141592653589793;

float lineDistance(float v) {
  return abs(fract(v + 0.5) - 0.5);
}

float mesh(float3 n, float3 dx, float3 dy, float pixel) {
  float longitude = atan(n.z, n.x) / (2.0 * PI);
  float latitude = acos(clamp(n.y, -0.9999, 0.9999)) / PI;
  float2 cell = float2(longitude * 20.0, latitude * 12.0);
  // Gradientes analíticos: antialias sem derivadas GPU indisponíveis em SkSL.
  float pole = max(0.0001, 1.0 - n.y * n.y);
  float2 du = float2(n.x * dx.z - n.z * dx.x,
                    n.x * dy.z - n.z * dy.x) * (20.0 / (2.0 * PI * pole));
  float2 dv = float2(dx.y, dy.y) * (-12.0 / (PI * sqrt(pole)));
  float3 width = max(float3(0.001), pixel * 0.65 *
                    float3(length(du), length(dv), length(du + dv)));
  float3 distance = float3(lineDistance(cell.x), lineDistance(cell.y),
                           lineDistance(cell.x + cell.y));
  float3 lines = 1.0 - smoothstep(width * 0.2, width, distance);
  return max(max(lines.x, lines.y), lines.z);
}

float3 rotateSurface(float3 n, float c, float s) {
  // Inclinação fixa + rotação contínua em torno do eixo vertical.
  float3 tilted = float3(n.x, n.y * 0.94 - n.z * 0.3412,
                        n.y * 0.3412 + n.z * 0.94);
  return float3(tilted.x * c + tilted.z * s, tilted.y,
               tilted.z * c - tilted.x * s);
}

half4 main(float2 position) {
  float2 q = (position * 2.0 / size - 1.0);
  float q2 = dot(q, q);
  if (q2 >= 0.9216) {
    return half4(0.0);
  }
  float halo = haloOpacity * pow(max(0.0, 1.0 - sqrt(q2) / 0.96), 2.0);
  float theta = atan(q.y, q.x);
  float bulge = 1.0 + deformation * (
    0.48 * sin(theta * 3.0 + phase) +
    0.28 * cos(theta * 2.0 - phase * 2.0)
  );
  float2 p = q / (radius * 0.01 * bulge);
  float r2 = dot(p, p);
  // Saída barata fora da esfera; halo transparente até antes da borda.
  if (r2 >= 1.0) {
    return half4(glow * halo, halo);
  }
  float z = sqrt(max(0.0, 1.0 - r2));
  float c = cos(phase);
  float s = sin(phase);
  float pixel = 2.0 / (size * radius * 0.01 * bulge);
  float zx = -p.x / max(z, 0.02);
  float zy = -p.y / max(z, 0.02);
  float front = mesh(
    rotateSurface(float3(p, z), c, s),
    rotateSurface(float3(1.0, 0.0, zx), c, s),
    rotateSurface(float3(0.0, 1.0, zy), c, s), pixel);
  float back = mesh(
    rotateSurface(float3(p, -z), c, s),
    rotateSurface(float3(1.0, 0.0, -zx), c, s),
    rotateSurface(float3(0.0, 1.0, -zy), c, s), pixel);
  // Desvanecer o contorno evita acumular linhas no horizonte da esfera.
  float edge = smoothstep(0.0, 0.10, z);
  float frontAlpha = front * frontOpacity * edge;
  float backAlpha = back * backOpacity * edge * (1.0 - frontAlpha);
  float light = clamp(0.5 - p.y * 0.35 + p.x * 0.15, 0.0, 1.0);
  float3 metal = mix(shadow, mix(wire, highlight, light), 0.85);
  float alpha = frontAlpha + backAlpha;
  float3 rgb = metal * frontAlpha + wire * backAlpha;
  // Skia espera cor pré-multiplicada por alpha.
  return half4(rgb + glow * halo * (1.0 - alpha),
               alpha + halo * (1.0 - alpha));
}
`;

function rgb(hex) {
  return [1, 3, 5].map(
    offset => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
}

// Os tokens são convertidos apenas quando tamanho/tema mudam.
export function orbUniforms(size, tokens) {
  return {
    size,
    phase: 0,
    radius: tokens.radius,
    deformation: tokens.deformation,
    wire: rgb(tokens.wire),
    highlight: rgb(tokens.highlight),
    shadow: rgb(tokens.shadow),
    glow: rgb(tokens.glow),
    frontOpacity: tokens.frontOpacity,
    backOpacity: tokens.backOpacity,
    haloOpacity: tokens.haloOpacity,
  };
}
