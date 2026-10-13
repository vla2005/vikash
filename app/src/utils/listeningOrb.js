// A topologia e os harmônicos são preparados uma vez, fora do loop da UI.
export function createOrbMesh(latitudes = 14, longitudes = 24) {
  const points = [];
  const edges = [];
  for (let latitude = 0; latitude <= latitudes; latitude++) {
    const polar = (latitude / latitudes) * Math.PI;
    const ring = Math.sin(polar);
    for (let longitude = 0; longitude < longitudes; longitude++) {
      const angle = (longitude / longitudes) * Math.PI * 2;
      const x = ring * Math.cos(angle);
      const y = Math.cos(polar);
      const z = ring * Math.sin(angle);
      points.push([
        x,
        y,
        z,
        ring * ring * Math.cos(angle * 3),
        ring * ring * Math.sin(angle * 3),
        x * y * 2,
        z * y * 2,
      ]);
      const index = latitude * longitudes + longitude;
      if (latitude > 0 && latitude < latitudes) {
        edges.push([
          index,
          latitude * longitudes + ((longitude + 1) % longitudes),
        ]);
      }
      if (latitude < latitudes) {
        edges.push([index, index + longitudes]);
      }
      if (latitude > 0 && latitude < latitudes - 1) {
        edges.push([
          index,
          (latitude + 1) * longitudes + ((longitude + 1) % longitudes),
        ]);
      }
    }
  }
  return { points, edges };
}

export function projectOrb(mesh, phase, radius, deformation) {
  'worklet';
  const cos = Math.cos(phase);
  const sin = Math.sin(phase);
  const waveA = Math.cos(phase * 2);
  const waveB = Math.sin(phase * 2);
  const waveC = Math.sin(phase * 3);
  const waveD = Math.cos(phase * 3);
  const tilt = 0.3 + Math.sin(phase) * 0.22;
  const tiltCos = Math.cos(tilt);
  const tiltSin = Math.sin(tilt);
  const breathing = 1 + Math.sin(phase * 4) * 0.035;
  const points = [];
  for (let i = 0; i < mesh.points.length; i++) {
    const p = mesh.points[i];
    const shape =
      breathing *
      (1 +
        deformation *
          (p[3] * waveA + p[4] * waveB + (p[5] * waveC + p[6] * waveD) * 0.55));
    const x = (p[0] * cos + p[2] * sin) * shape;
    const z = (p[2] * cos - p[0] * sin) * shape;
    const y = p[1] * shape * tiltCos - z * tiltSin;
    const depth = z * tiltCos + p[1] * shape * tiltSin;
    const perspective = 1 + depth * 0.13;
    points.push([
      Math.round((100 + x * radius * perspective) * 10) / 10,
      Math.round((100 + y * radius * perspective) * 10) / 10,
      depth,
    ]);
  }
  let front = '';
  let back = '';
  for (let i = 0; i < mesh.edges.length; i++) {
    const edge = mesh.edges[i];
    const a = points[edge[0]];
    const b = points[edge[1]];
    const segment = `M${a[0]},${a[1]}L${b[0]},${b[1]}`;
    if (a[2] + b[2] >= 0) {
      front += segment;
    } else {
      back += segment;
    }
  }
  return { front, back };
}
