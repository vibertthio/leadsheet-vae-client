#include <common>

uniform vec2 mousePos;
uniform vec3 circularWave[ 3 ];
uniform vec2 circularWaveRadius[ 3 ];

#define deltaTime ( 1.0 / 60.0 )
#define GRAVITY_CONSTANT ( resolution.x * deltaTime * 3.0 )

#pragma glslify: cnoise2 = require(glsl-noise/classic/2d)

void main()	{

  vec2 cellSize = 1.0 / resolution.xy;

  vec2 uv = gl_FragCoord.xy * cellSize;

  vec4 heightmapValue = texture2D( heightmap, uv );


  // Background Waves
  heightmapValue.x = pow(sin(uv.x * 200.0), 0.5) * 10.0;

  // Circular Waves
  for (int i = 0; i < 3; i += 1) {
    vec2 center = circularWave[i].xy;
    if (circularWave[i].z > 0.5) {
      float dist = length(uv - center);
      if (dist < circularWaveRadius[i].x && dist > circularWaveRadius[i].y) {
        heightmapValue.x = pow(sin(dist * 200.0), 0.5) * 10.0;
      }
    }
  }

  // Bumps of Sands
  heightmapValue.x += cnoise2(uv * 2000.0) * 1.7;

  gl_FragColor = heightmapValue;

}
